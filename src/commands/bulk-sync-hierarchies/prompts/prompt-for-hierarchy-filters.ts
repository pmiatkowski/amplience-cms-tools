import inquirer from 'inquirer';

/**
 * Filter criteria for hierarchies
 */
export type HierarchyFilterCriteria = {
  schemaId?: string;
  label?: string;
  deliveryKey?: string;
};

/**
 * Prompt user for hierarchy filter criteria only (no item selection)
 * This is used for bulk operations where multiple items will be selected later
 */
export async function promptForHierarchyFilters(): Promise<HierarchyFilterCriteria> {
  const { schemaId, label, deliveryKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'schemaId',
      message: 'Filter by schema ID (leave blank for any):',
      default: '',
    },
    {
      type: 'input',
      name: 'label',
      message: 'Filter by label (partial match, leave blank for any):',
      default: '',
    },
    {
      type: 'input',
      name: 'deliveryKey',
      message: 'Filter by delivery key (partial match, leave blank for any):',
      default: '',
    },
  ]);

  return {
    schemaId: schemaId || undefined,
    label: label || undefined,
    deliveryKey: deliveryKey || undefined,
  };
}
