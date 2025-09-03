import inquirer from 'inquirer';

/**
 * Prompt user to select a folder from a repository
 * Provides navigation through folder hierarchy with options to select current folder or go deeper
 */
export async function promptForFolder(
  service: {
    getAllFolders: (
      repoId: string,
      onPageFetched: (fetched: number, total: number) => void
    ) => Promise<Amplience.Folder[]>;
    getAllSubFolders: (
      folderId: string,
      onPageFetched: (fetched: number, total: number) => void
    ) => Promise<Amplience.Folder[]>;
  },
  repositoryId: string,
  message: string = 'Select a folder:',
  allowNone: boolean = false
): Promise<Amplience.Folder | null> {
  let currentFolderId: string | null = null;
  let breadcrumb: string[] = ['Repository Root'];

  while (true) {
    try {
      // Get folders for current level with no-op callback
      const folders = currentFolderId
        ? await service.getAllSubFolders(currentFolderId, () => {})
        : await service.getAllFolders(repositoryId, () => {});

      const choices: { name: string; value: string | Amplience.Folder | null }[] = [];

      // Add option to select current folder
      if (currentFolderId || allowNone) {
        const currentName = currentFolderId
          ? `[Select "${breadcrumb[breadcrumb.length - 1]}"]`
          : '[None - use repository root]';
        choices.push({
          name: currentName,
          value: currentFolderId ? 'SELECT_CURRENT' : null,
        });
      }

      // Add navigation options
      if (currentFolderId) {
        choices.push({
          name: '[Go back]',
          value: 'GO_BACK',
        });
      }

      // Add folder options
      folders.forEach((folder: Amplience.Folder) => {
        choices.push({
          name: `📁 ${folder.name}`,
          value: folder,
        });
      });

      if (choices.length === 0) {
        console.log('No folders found in this location.');
        if (currentFolderId) {
          // Go back if no folders and we're not at root
          currentFolderId = null;
          breadcrumb = ['Repository Root'];
          continue;
        } else {
          return null;
        }
      }

      const { selectedItem } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedItem',
          message: `${message} (Current: ${breadcrumb.join(' > ')})`,
          choices,
        },
      ]);

      if (selectedItem === null) {
        return null;
      } else if (selectedItem === 'SELECT_CURRENT') {
        // Find and return the current folder object
        if (currentFolderId) {
          // We need to get the folder object for the current folder ID
          // For now, we'll create a minimal folder object
          return {
            id: currentFolderId,
            name: breadcrumb[breadcrumb.length - 1],
          } as Amplience.Folder;
        }

        return null;
      } else if (selectedItem === 'GO_BACK') {
        // Navigate back
        if (breadcrumb.length > 1) {
          breadcrumb.pop();
          // For simplicity, we'll go back to root. In a full implementation,
          // we'd need to track the folder hierarchy
          currentFolderId = null;
          breadcrumb = ['Repository Root'];
        }
      } else {
        // Navigate into folder or select it
        const folder = selectedItem as Amplience.Folder;

        // Ask if user wants to select this folder or enter it
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `What do you want to do with "${folder.name}"?`,
            choices: [
              { name: 'Select this folder', value: 'SELECT' },
              { name: 'Enter this folder', value: 'ENTER' },
              { name: 'Go back', value: 'BACK' },
            ],
          },
        ]);

        if (action === 'SELECT') {
          return folder;
        } else if (action === 'ENTER') {
          currentFolderId = folder.id;
          breadcrumb.push(folder.name);
        }
        // If BACK, continue the loop without changes
      }
    } catch (error) {
      console.error('Error fetching folders:', error);

      return null;
    }
  }
}
