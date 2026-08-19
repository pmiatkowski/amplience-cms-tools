import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SUPPORTED_DC_CLI_VERSION = '0.31.0';

type DcCliExecute = (command: string) => Promise<{ stdout: string; stderr: string }>;

const executeCommand = execAsync as DcCliExecute;

/**
 * Check if dc-cli is available in the system
 */
export const checkDcCliAvailability = async (): Promise<boolean> => {
  try {
    const dcCliPath = getDcCliPath();
    await execAsync(`"${dcCliPath}" --version`);

    return true;
  } catch {
    return false;
  }
};

/**
 * Factory function to create a DcCliCommandBuilder
 */
export const createDcCliCommand = (): DcCliCommandBuilder => {
  return new DcCliCommandBuilder();
};

/**
 * Builder pattern for constructing and executing dc-cli commands
 * Handles both PAT token and OAuth authentication automatically
 */
export class DcCliCommandBuilder {
  private command: string = '';
  private args: string[] = [];
  private hub: Amplience.HubConfig | null = null;

  constructor(private readonly commandExecutor: DcCliExecute = executeCommand) {}

  /**
   * Set the hub configuration for authentication
   */
  withHub(hub: Amplience.HubConfig): this {
    this.hub = hub;

    return this;
  }

  /**
   * Add the dc-cli command (e.g., 'content-type-schema export')
   */
  withCommand(command: string): this {
    this.command = command;

    return this;
  }

  /**
   * Add arguments to the command
   */
  withArgs(...args: string[]): this {
    this.args.push(...args);

    return this;
  }

  /**
   * Add a single argument
   */
  withArg(arg: string): this {
    this.args.push(arg);

    return this;
  }

  /**
   * Build the full command string with authentication
   */
  private buildCommandString(): string {
    if (!this.hub) {
      throw new Error('Hub configuration is required. Call withHub() first.');
    }

    const dcCliPath = getDcCliPath();
    let authArgs: string[];

    // Check if this is a PAT config or OAuth config
    const patConfig = this.hub as Amplience.HubPATConfig;
    if (patConfig.patToken) {
      authArgs = [`--patToken "${patConfig.patToken}"`];
    } else {
      const oauthConfig = this.hub as Amplience.HubOAuthConfig;
      authArgs = [
        `--clientId "${oauthConfig.clientId}"`,
        `--clientSecret "${oauthConfig.clientSecret}"`,
      ];
    }

    const allArgs = [...this.args, ...authArgs, `--hubId "${this.hub.hubId}"`];

    return `"${dcCliPath}" ${this.command} ${allArgs.join(' ')}`;
  }

  /**
   * Execute the built command
   */
  async execute(
    options: { logCommand?: boolean } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const fullCommand = this.buildCommandString();
    if (options.logCommand !== false) {
      const sanitizedCommand = this.getSanitizedCommandString();

      // Log command with length info for debugging (truncate long commands)
      console.log(
        `Executing: ${sanitizedCommand.substring(0, 200)}${sanitizedCommand.length > 200 ? '...' : ''}`
      );
    }

    const result = await this.commandExecutor(fullCommand);

    return result;
  }

  /**
   * Get the full command string without executing (useful for testing/debugging)
   */
  getCommandString(): string {
    return this.buildCommandString();
  }

  /**
   * Get a credential-safe command string for diagnostics.
   */
  getSanitizedCommandString(): string {
    return this.buildCommandString().replace(
      /--(patToken|clientId|clientSecret)\s+"[^"]*"/g,
      '--$1 "***"'
    );
  }
}

/**
 * Get the path to the local dc-cli binary
 */
export const getDcCliPath = (): string => {
  // Use local node_modules/.bin/dc-cli
  const binPath = path.join(process.cwd(), 'node_modules', '.bin', 'dc-cli');

  // On Windows, check for .cmd extension
  if (process.platform === 'win32') {
    return binPath + '.cmd';
  }

  return binPath;
};

/**
 * Validate the exact dc-cli command surfaces used by Sync Content Types.
 */
export const validateContentTypeSyncCapabilities = async (
  execute: DcCliExecute = executeCommand
): Promise<void> => {
  await validateDcCliVersion(execute);

  const checks = [
    {
      name: 'content-type export',
      command: 'content-type export --help',
      required: ['<dir>', '--force', '--archived'],
    },
    {
      name: 'content-type import',
      command: 'content-type import --help',
      required: ['<dir>', '--skipAssign'],
    },
    {
      name: 'content-type sync',
      command: 'content-type sync --help',
      required: ['[id]', '--json'],
    },
  ];

  for (const check of checks) {
    let stdout: string;
    try {
      ({ stdout } = await execute(`"${getDcCliPath()}" ${check.command}`));
    } catch {
      throw new Error(`Could not inspect dc-cli ${check.name}.`);
    }

    for (const capability of check.required) {
      if (!stdout.includes(capability)) {
        throw new Error(`dc-cli ${check.name} is missing required capability: ${capability}`);
      }
    }
  }
};

/**
 * Validate that the local dc-cli binary matches the audited version.
 */
export const validateDcCliVersion = async (
  execute: DcCliExecute = executeCommand
): Promise<string> => {
  let stdout: string;

  try {
    ({ stdout } = await execute(`"${getDcCliPath()}" --version`));
  } catch {
    throw new Error('Could not execute the local dc-cli binary.');
  }

  const installedVersion = stdout.match(/\b\d+\.\d+\.\d+\b/)?.[0];
  if (!installedVersion) {
    throw new Error('Could not determine the installed dc-cli version.');
  }

  if (installedVersion !== SUPPORTED_DC_CLI_VERSION) {
    throw new Error(
      `Unsupported dc-cli version ${installedVersion}. Expected ${SUPPORTED_DC_CLI_VERSION}.`
    );
  }

  return installedVersion;
};
