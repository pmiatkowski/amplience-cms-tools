import inquirer from 'inquirer';

/**
 * Default source directory for importing extensions.
 * Can be overridden by AMP_DEFAULT_EXTENSION_DIR environment variable.
 */
export const DEFAULT_EXTENSION_INPUT_DIRECTORY =
  process.env.AMP_DEFAULT_EXTENSION_DIR || './exports/extensions';

/**
 * Prompt the user for a source directory containing extension files to import.
 *
 * Defaults to AMP_DEFAULT_EXTENSION_DIR environment variable if set, otherwise './extensions'.
 *
 * @param defaultPath - Suggested directory path shown in the prompt
 * @example
 * const directory = await promptForExtensionInputDirectory();
 */
export async function promptForExtensionInputDirectory(
  defaultPath: string = DEFAULT_EXTENSION_INPUT_DIRECTORY
): Promise<string> {
  const { sourceDir } = await inquirer.prompt<{ sourceDir: string }>([
    {
      type: 'input',
      name: 'sourceDir',
      message: 'Which directory contains the extensions to import?',
      default: defaultPath,
      validate: (input: string): string | boolean =>
        input.trim().length > 0 || 'Please enter a directory path.',
    },
  ]);

  const normalized = sourceDir.trim();

  return normalized.length > 0 ? normalized : defaultPath;
}
