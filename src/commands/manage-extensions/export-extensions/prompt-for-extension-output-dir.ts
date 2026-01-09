import inquirer from 'inquirer';

export const DEFAULT_EXTENSION_EXPORT_DIRECTORY = './exports/extensions';

/**
 * Prompt the user for an export directory, defaulting to ./exports/extensions.
 *
 * @param defaultPath - Suggested directory path shown in the prompt
 * @example
 * const directory = await promptForExtensionOutputDirectory();
 */
export async function promptForExtensionOutputDirectory(
  defaultPath: string = DEFAULT_EXTENSION_EXPORT_DIRECTORY
): Promise<string> {
  const { targetDir } = await inquirer.prompt<{ targetDir: string }>([
    {
      type: 'input',
      name: 'targetDir',
      message: 'Where should extensions be exported?',
      default: defaultPath,
      validate: (input: string) => input.trim().length > 0 || 'Please enter a directory path.',
    },
  ]);

  const normalized = targetDir.trim();

  return normalized.length > 0 ? normalized : defaultPath;
}
