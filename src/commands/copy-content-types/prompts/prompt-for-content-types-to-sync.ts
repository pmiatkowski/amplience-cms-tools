import inquirer from 'inquirer';

/**
 * Prompts the user to select content types to sync with a multi-select list and "Select All" option
 * @param contentTypes Array of available content types to choose from
 * @returns Promise resolving to array of selected content types
 */
export async function promptForContentTypesToSync(
  contentTypes: Amplience.ContentType[]
): Promise<Amplience.ContentType[]> {
  if (contentTypes.length === 0) {
    console.log('No content types available for sync.');

    return [];
  }

  // Create choices with a "Select All" option at the top
  const choices = [
    {
      name: '✓ Select All',
      value: 'SELECT_ALL',
    },
    new inquirer.Separator(),
    ...contentTypes.map(ct => ({
      name: `${ct.settings?.label || ct.contentTypeUri} (${ct.contentTypeUri})`,
      value: ct.id,
    })),
  ];

  const { selectedIds } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedIds',
    message: 'Select content types to sync:',
    choices,
  });

  // Handle case where no content types are selected
  if (selectedIds.length === 0) {
    console.log('No content types selected. Operation cancelled.');

    return [];
  }

  // Handle "Select All" option
  if (selectedIds.includes('SELECT_ALL')) {
    return contentTypes;
  }

  // Filter and return selected content types
  return contentTypes.filter(ct => selectedIds.includes(ct.id));
}
