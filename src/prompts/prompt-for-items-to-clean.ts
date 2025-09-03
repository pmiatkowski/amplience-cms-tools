import inquirer from 'inquirer';

/**
 * Prompt user to select items for cleanup using multi-select checkboxes
 */
export async function promptForItemsToClean(items: Amplience.ContentItem[]): Promise<string[]> {
  const choices = items.map(item => ({
    name: `${item.label}, ${item.body._meta?.deliveryKey || 'no-key'}, ${item.status}, ${item.publishingStatus}, ${item.body._meta?.schema || 'no-schema'}`,
    value: item.id,
  }));

  // Add "Select All" option
  choices.unshift({
    name: '--- Select All ---',
    value: 'SELECT_ALL',
  });

  const { selectedItems } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedItems',
      message: 'Select items to clean up:',
      choices,
    },
  ]);

  // Handle "Select All" option
  if (selectedItems.includes('SELECT_ALL')) {
    return items.map(item => item.id);
  }

  return selectedItems.filter((id: string) => id !== 'SELECT_ALL');
}
