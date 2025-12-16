import inquirer from 'inquirer';

/**
 * Prompt user to select multiple hierarchies from a filtered list
 * @param filteredItems Array of content items to choose from
 * @returns Promise resolving to array of selected content items
 */
export async function promptForMultipleHierarchies(
  filteredItems: Amplience.ContentItem[]
): Promise<Amplience.ContentItem[]> {
  const choices = [
    {
      name: '✓ Select All',
      value: 'SELECT_ALL',
    },
    new inquirer.Separator(),
    ...filteredItems.map(item => ({
      name: `${item.label} (${item.body._meta?.deliveryKey || 'no-key'}) - ${item.body._meta?.schema || 'no-schema'}`,
      value: item.id,
    })),
  ];

  const { selectedIds } = await inquirer.prompt<{ selectedIds: string[] }>([
    {
      type: 'checkbox' as const,
      name: 'selectedIds',
      message: `Select hierarchies to synchronize (${filteredItems.length} found):`,
      choices,
      validate: (input: unknown): boolean | string => {
        if (Array.isArray(input) && input.length === 0) {
          return 'You must select at least one hierarchy.';
        }

        return true;
      },
    },
  ]);

  // Handle "Select All"
  if (selectedIds.includes('SELECT_ALL')) {
    return filteredItems;
  }

  return filteredItems.filter(item => selectedIds.includes(item.id));
}
