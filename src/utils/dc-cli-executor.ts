import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  async execute(): Promise<{ stdout: string; stderr: string }> {
    const fullCommand = this.buildCommandString();

    // Log command with length info for debugging (truncate long commands)
    console.log(
      `Executing: ${fullCommand.substring(0, 200)}${fullCommand.length > 200 ? '...' : ''}`
    );

    const result = await execAsync(fullCommand);

    return result;
  }

  /**
   * Get the full command string without executing (useful for testing/debugging)
   */
  getCommandString(): string {
    return this.buildCommandString();
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
