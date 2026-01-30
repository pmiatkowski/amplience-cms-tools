import inquirer from 'inquirer';

/**
 * Prompt user to create an example command set configuration file.
 * Used when COMMAND_SETS_PATH is set but the file does not exist.
 *
 * @param configPath - The expected configuration file path
 *
 * @example
 * const shouldCreate = await promptForCreateExampleFile('/custom/command-sets.json');
 * if (shouldCreate) {
 *   // Create example file
 * }
 */
export async function promptForCreateExampleFile(configPath: string): Promise<boolean> {
  const { createExample } = await inquirer.prompt<{ createExample: boolean }>([
    {
      type: 'confirm',
      name: 'createExample',
      message: `No command sets file found at "${configPath}". Create an example file?`,
      default: true,
    },
  ]);

  return createExample;
}
