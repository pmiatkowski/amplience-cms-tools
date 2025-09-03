import inquirer from 'inquirer';

/**
 * Prompt user to find and select a specific content item
 */
export async function promptForContentItem(
  service: {
    getContentItemsBy: (
      repoId: string,
      schemaId?: string,
      label?: string,
      deliveryKey?: string
    ) => Promise<Amplience.ContentItem[]>;
  },
  repositoryId: string
): Promise<Amplience.ContentItem | null> {
  const { schemaId, label, deliveryKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'schemaId',
      message: 'Filter by schema ID (leave blank for any):',
    },
    {
      type: 'input',
      name: 'label',
      message: 'Filter by label (partial match, leave blank for any):',
    },
    {
      type: 'input',
      name: 'deliveryKey',
      message: 'Filter by delivery key (partial match, leave blank for any):',
    },
  ]);

  try {
    console.log('Searching for content items...');
    const items = await service.getContentItemsBy(
      repositoryId,
      schemaId || undefined,
      label || undefined,
      deliveryKey || undefined
    );

    if (items.length === 0) {
      console.log('No content items found matching the criteria.');

      return null;
    }

    if (items.length > 100) {
      console.log(`Found ${items.length} items. Please refine your search criteria.`);

      return null;
    }

    const choices = items.map(item => ({
      name: `${item.label} (${item.body._meta?.deliveryKey || 'no-key'}) - ${item.body._meta?.schema || 'no-schema'}`,
      value: item,
    }));

    const { selectedItem } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedItem',
        message: 'Select a content item:',
        choices,
      },
    ]);

    return selectedItem;
  } catch (error) {
    console.error('Error searching for content items:', error);

    return null;
  }
}
