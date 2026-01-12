import inquirer from 'inquirer';

import type { ExtensionWithPath } from '~/services/actions/import-extensions/filter-extensions';

/**
 * Prompt the user to confirm whether to proceed with importing extensions
 *
 * Displays after the preview table to get user confirmation before
 * executing the actual import operation. Defaults to false for safety.
 *
 * @param extensions - List of extensions that will be imported
 * @example
 * const extensions = [{ extension: { id: 'test' }, filePath: '/path/to/test.json' }];
 * const confirmed = await promptForImportConfirmation(extensions);
 * if (confirmed) {
 *   console.log('User confirmed, proceeding with import');
 * }
 */
export async function promptForImportConfirmation(
  extensions: ExtensionWithPath[]
): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Do you want to proceed with importing ${extensions.length} extension(s)?`,
      default: false,
    },
  ]);

  return confirmed;
}
