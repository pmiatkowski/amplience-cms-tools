import inquirer from 'inquirer';

export async function promptForRecreationFilters(): Promise<
  Amplience.FilterCriteria & { rootHierarchyOnly: boolean }
> {
  const { schemaId, status, publishingStatus, deliveryKey, rootHierarchyOnly } =
    await inquirer.prompt([
      {
        type: 'input',
        name: 'schemaId',
        message: 'Filter by Schema ID (optional):',
        default: '',
      },
      {
        type: 'checkbox',
        name: 'status',
        message: 'Filter by Status (select multiple):',
        choices: [
          { name: 'Active', value: 'ACTIVE' },
          { name: 'Archived', value: 'ARCHIVED' },
        ],
        default: ['ACTIVE'],
      },
      {
        type: 'checkbox',
        name: 'publishingStatus',
        message: 'Filter by Publishing Status (select multiple):',
        choices: [
          { name: 'None', value: 'NONE' },
          { name: 'Early', value: 'EARLY' },
          { name: 'Latest', value: 'LATEST' },
          { name: 'Unpublished', value: 'UNPUBLISHED' },
        ],
      },
      {
        type: 'input',
        name: 'deliveryKey',
        message: 'Filter by Delivery Key pattern (optional):',
        default: '',
      },
      {
        type: 'confirm',
        name: 'rootHierarchyOnly',
        message: 'Include only root hierarchy nodes?',
        default: false,
      },
    ]);

  return {
    schemaId: schemaId || undefined,
    status: status.length > 0 ? status : undefined,
    publishingStatus: publishingStatus.length > 0 ? publishingStatus : undefined,
    deliveryKey: deliveryKey || undefined,
    rootHierarchyOnly,
  };
}
