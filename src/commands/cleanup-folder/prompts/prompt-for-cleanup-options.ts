import inquirer from 'inquirer';
import { CleanupFolderOptions } from '~/services/actions/cleanup-folder';

export async function promptForCleanupOptions(): Promise<CleanupFolderOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'deletedFolderName',
      message: 'Name for the deleted items folder:',
      default: '__deleted',
      validate: (input: string): true | string =>
        input.trim() !== '' || 'Folder name cannot be empty',
    },
    {
      type: 'confirm',
      name: 'clearDeliveryKey',
      message: 'Clear delivery keys before archiving?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'unpublishIfNeeded',
      message: 'Unpublish published items before archiving?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'unarchiveIfNeeded',
      message: 'Temporarily unarchive already archived items for processing?',
      default: true,
    },
  ]);

  return answers;
}
