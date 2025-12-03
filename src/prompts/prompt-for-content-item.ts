import inquirer from 'inquirer';

/**
 * Result of content item selection containing both the selected item and all fetched items
 */
export type ContentItemSelectionResult = {
  selectedItem: Amplience.ContentItem;
  allItems: Amplience.ContentItem[]; // All items from repository (unfiltered)
  filteredItems: Amplience.ContentItem[]; // Items after applying search filters
};

/**
 * Prompt user to find and select a specific content item
 * Returns both the selected item and all fetched items to enable data reuse
 */
export async function promptForContentItem(
  service: {
    getContentItemsBy: (
      repoId: string,
      schemaId?: string,
      label?: string,
      deliveryKey?: string
    ) => Promise<{ allItems: Amplience.ContentItem[]; filteredItems: Amplience.ContentItem[] }>;
  },
  repositoryId: string,
  defaults?: { deliveryKey?: string }
): Promise<ContentItemSelectionResult | null> {
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
      default: defaults?.deliveryKey || '',
    },
  ]);

  try {
    console.log('Searching for content items...');
    const result = await service.getContentItemsBy(
      repositoryId,
      schemaId || undefined,
      label || undefined,
      deliveryKey || undefined
    );

    if (result.filteredItems.length === 0) {
      console.log('No content items found matching the criteria.');

      return null;
    }

    if (result.filteredItems.length > 100) {
      console.log(
        `Found ${result.filteredItems.length} items. Please refine your search criteria.`
      );

      return null;
    }

    const choices = result.filteredItems.map(item => ({
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

    return { selectedItem, allItems: result.allItems, filteredItems: result.filteredItems };
  } catch (error) {
    console.error('Error searching for content items:', error);

    return null;
  }
}
