import fs from 'fs';
import path from 'path';



/**
 * Add a command set to a configuration object.
 * Returns a new config object without mutating the original.
 *
 * @param config - The current configuration object
 * @param commandSet - The command set to add
 *
 * @example
 * const newConfig = addCommandSetToConfig(config, newSet);
 * writeCommandSetConfig('./command-sets.json', newConfig);
 */
export function addCommandSetToConfig(
  config: Amplience.CommandSetConfig,
  commandSet: Amplience.CommandSet
): Amplience.CommandSetConfig {
  return {
    ...config,
    commandSets: [...config.commandSets, commandSet],
  };
}





/**
 * Check if a command set configuration file exists at the given path.
 *
 * @param filePath - Path to check
 * @returns True if the file exists
 *
 * @example
 * if (!configFileExists('./command-sets.json')) {
 *   writeCommandSetConfig('./command-sets.json', generateExampleConfig());
 * }
 */
export function configFileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}






/**
 * Generate an example command set configuration.
 * Used when creating a new configuration file for first-time users.
 *
 * @returns A valid example configuration with sample command sets
 *
 * @example
 * const example = generateExampleConfig();
 * fs.writeFileSync('command-sets.json', JSON.stringify(example, null, 2));
 */
export function generateExampleConfig(): Amplience.CommandSetConfig {
  return {
    version: '1.0',
    commandSets: [
      {
        name: 'Daily Content Sync',
        description: 'Synchronize content from production to development environment',
        commands: [
          {
            command: 'sync-hierarchy',
            description: 'Sync content hierarchy structure',
          },
          {
            command: 'copy-content-types',
            description: 'Copy any missing content types',
          },
        ],
      },
      {
        name: 'Schema Update Workflow',
        description: 'Update schemas and sync related content types',
        commands: [
          {
            command: 'copy-content-type-schemas',
            description: 'Copy updated schemas',
          },
          {
            command: 'sync-content-type-properties',
            description: 'Sync content type settings with schemas',
          },
        ],
      },
    ],
  };
}







/**
 * Get the path to the command set configuration file.
 * Uses COMMAND_SETS_PATH environment variable if set, otherwise defaults to command-sets.json
 * in the current working directory.
 *
 * @returns The resolved path to the configuration file
 *
 * @example
 * // With env var set
 * process.env.COMMAND_SETS_PATH = '/custom/path/sets.json';
 * getCommandSetConfigPath(); // '/custom/path/sets.json'
 *
 * @example
 * // Without env var
 * getCommandSetConfigPath(); // '/current/working/dir/command-sets.json'
 */
export function getCommandSetConfigPath(): string {
  const envPath = process.env.COMMAND_SETS_PATH;

  if (envPath && envPath.trim() !== '') {
    return envPath.trim();
  }

  return path.join(process.cwd(), 'command-sets.json');
}







/**
 * Initialize command set configuration, creating example file if it doesn't exist.
 * This provides a helpful starting point for users new to the feature.
 *
 * @param filePath - Path for the configuration file
 * @returns Object indicating if a new file was created and the loaded config
 *
 * @example
 * const { created, config } = initializeCommandSetConfig('./command-sets.json');
 * if (created) {
 *   console.log('Created example configuration file');
 * }
 */
export function initializeCommandSetConfig(filePath: string): {
  created: boolean;
  config: Amplience.CommandSetConfig;
} {
  if (!configFileExists(filePath)) {
    const exampleConfig = generateExampleConfig();
    writeCommandSetConfig(filePath, exampleConfig);

    return { created: true, config: exampleConfig };
  }

  const config = loadCommandSetConfig(filePath);

  return { created: false, config };
}





/**
 * Load and parse the command set configuration from a JSON file.
 * Validates both JSON syntax and configuration structure.
 * Fails fast with descriptive errors for invalid configurations.
 *
 * @param filePath - Path to the JSON configuration file
 * @returns The parsed and validated configuration object
 * @throws Error if file not found, JSON invalid, or structure invalid
 *
 * @example
 * try {
 *   const config = loadCommandSetConfig('./command-sets.json');
 *   console.log(`Loaded ${config.commandSets.length} command sets`);
 * } catch (err) {
 *   console.error('Failed to load config:', err.message);
 * }
 */
export function loadCommandSetConfig(filePath: string): Amplience.CommandSetConfig {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Command set configuration file not found: ${filePath}`);
  }

  // Read file content
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('Invalid JSON in command set configuration file');
  }

  // Validate structure
  const validation = validateCommandSetConfig(parsed);
  if (!validation.isValid) {
    throw new Error(`Invalid command set configuration: ${validation.errors.join('; ')}`);
  }

  return parsed as Amplience.CommandSetConfig;
}






/**
 * Remove a command set from a configuration object by name.
 * Returns a new config object without mutating the original.
 *
 * @param config - The current configuration object
 * @param setName - The name of the command set to remove
 *
 * @example
 * const newConfig = removeCommandSetFromConfig(config, 'Old Set');
 * writeCommandSetConfig('./command-sets.json', newConfig);
 */
export function removeCommandSetFromConfig(
  config: Amplience.CommandSetConfig,
  setName: string
): Amplience.CommandSetConfig {
  return {
    ...config,
    commandSets: config.commandSets.filter(s => s.name !== setName),
  };
}









/**
 * Update a command set in a configuration object by name.
 * Returns a new config object without mutating the original.
 * If the set is not found, returns the original config unchanged.
 *
 * @param config - The current configuration object
 * @param originalName - The original name of the command set to update
 * @param updatedSet - The updated command set data
 *
 * @example
 * const newConfig = updateCommandSetInConfig(config, 'Old Name', updatedSet);
 * writeCommandSetConfig('./command-sets.json', newConfig);
 */
export function updateCommandSetInConfig(
  config: Amplience.CommandSetConfig,
  originalName: string,
  updatedSet: Amplience.CommandSet
): Amplience.CommandSetConfig {
  return {
    ...config,
    commandSets: config.commandSets.map(s =>
      s.name === originalName ? updatedSet : s
    ),
  };
}









/**
 * List of valid CLI command names that can be referenced in command sets.
 * This registry is used for validating command references in configurations.
 */
export const VALID_COMMAND_NAMES = [
  'manage-extensions',
  'vse-management',
  'sync-hierarchy',
  'bulk-sync-hierarchies',
  'copy-content-type-schemas',
  'sync-content-type-properties',
  'copy-content-types',
  'copy-folder-with-content',
  'recreate-content-items',
  'recreate-folder-structure',
  'cleanup-folder',
  'clean-repo',
  'archive-content-type-schemas',
  'list-folder-tree',
  'update-locale',
] as const;






/**
 * Validate that all command references in the config match known command names.
 * This ensures users don't configure commands that don't exist.
 *
 * @param config - The validated configuration object
 * @param validCommands - Array of valid command names from the CLI
 * @returns Validation result with any invalid command names
 *
 * @example
 * const knownCommands = ['sync-hierarchy', 'copy-content-types'];
 * const result = validateCommandReferences(config, knownCommands);
 * if (!result.isValid) {
 *   console.error('Unknown commands:', result.invalidCommands);
 * }
 */
export function validateCommandReferences(
  config: Amplience.CommandSetConfig,
  validCommands: string[]
): Amplience.CommandReferenceValidationResult {
  const invalidCommands: string[] = [];
  const validCommandSet = new Set(validCommands);

  for (const set of config.commandSets) {
    for (const cmd of set.commands) {
      if (!validCommandSet.has(cmd.command)) {
        if (!invalidCommands.includes(cmd.command)) {
          invalidCommands.push(cmd.command);
        }
      }
    }
  }

  return {
    isValid: invalidCommands.length === 0,
    invalidCommands,
  };
}



/**
 * Validate the structure of a command set configuration object.
 * Checks for required fields, correct types, and proper nesting.
 *
 * @param config - The configuration object to validate
 * @returns Validation result with isValid flag and any error messages
 *
 * @example
 * const result = validateCommandSetConfig(config);
 * if (!result.isValid) {
 *   console.error('Config errors:', result.errors.join(', '));
 * }
 */
export function validateCommandSetConfig(
  config: unknown
): Amplience.CommandSetValidationResult {
  const errors: string[] = [];

  // Type guard for basic object check
  if (typeof config !== 'object' || config === null) {
    return {
      isValid: false,
      errors: ['Configuration must be an object'],
    };
  }

  const configObj = config as Record<string, unknown>;

  // Check version field
  if (!('version' in configObj) || typeof configObj.version !== 'string') {
    errors.push('Missing required field: version');
  }

  // Check commandSets field exists
  if (!('commandSets' in configObj)) {
    errors.push('Missing required field: commandSets');

    return { isValid: false, errors };
  }

  // Check commandSets is an array
  if (!Array.isArray(configObj.commandSets)) {
    errors.push('commandSets must be an array');

    return { isValid: false, errors };
  }

  // Validate each command set
  const commandSets = configObj.commandSets as unknown[];
  commandSets.forEach((set, setIndex) => {
    if (typeof set !== 'object' || set === null) {
      errors.push(`Command set at index ${setIndex}: must be an object`);

      return;
    }

    const setObj = set as Record<string, unknown>;

    // Check name
    if (!setObj.name || typeof setObj.name !== 'string' || setObj.name.trim() === '') {
      errors.push(`Command set at index ${setIndex}: name is required`);
    }

    const setName = (setObj.name as string) || `index ${setIndex}`;

    // Check commands array
    if (!('commands' in setObj)) {
      errors.push(`Command set "${setName}": commands must be an array`);

      return;
    }

    if (!Array.isArray(setObj.commands)) {
      errors.push(`Command set "${setName}": commands must be an array`);

      return;
    }

    // Validate each command entry
    const commands = setObj.commands as unknown[];
    commands.forEach((cmd, cmdIndex) => {
      if (typeof cmd !== 'object' || cmd === null) {
        errors.push(`Command set "${setName}", command at index ${cmdIndex}: must be an object`);

        return;
      }

      const cmdObj = cmd as Record<string, unknown>;

      if (!cmdObj.command || typeof cmdObj.command !== 'string' || cmdObj.command.trim() === '') {
        errors.push(`Command set "${setName}", command at index ${cmdIndex}: command name is required`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}


export type ValidCommandName = (typeof VALID_COMMAND_NAMES)[number];

/**
 * Write command set configuration to a JSON file.
 * Creates the file if it doesn't exist, or overwrites if it does.
 *
 * @param filePath - Path where the configuration file should be written
 * @param config - The configuration object to write
 *
 * @example
 * const config = generateExampleConfig();
 * writeCommandSetConfig('./command-sets.json', config);
 */
export function writeCommandSetConfig(
  filePath: string,
  config: Amplience.CommandSetConfig
): void {
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}
