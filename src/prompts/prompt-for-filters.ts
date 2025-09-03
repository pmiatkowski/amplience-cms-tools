import inquirer from 'inquirer';

/**
 * Prompt user for filter criteria
 */
export async function promptForFilters(): Promise<FilterCriteria> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'schemaId',
      message: 'Filter by schemaId (leave blank for any):',
      default: process.env['AMP_DEFAULT_SCHEMA_ID'] || '',
    },
    {
      type: 'checkbox',
      name: 'status',
      message: 'Select statuses to include:',
      default: ['ACTIVE'],
      choices: [
        { name: 'ACTIVE', value: 'ACTIVE' },
        { name: 'INACTIVE', value: 'INACTIVE' },
        { name: 'ARCHIVED', value: 'ARCHIVED' },
      ],
    },
    {
      type: 'checkbox',
      name: 'publishingStatus',
      message: 'Select publishing statuses:',
      default: ['LATEST'],
      choices: [
        { name: 'LATEST', value: 'LATEST' },
        { name: 'EARLY', value: 'EARLY' },
        { name: 'UNPUBLISHED', value: 'UNPUBLISHED' },
        { name: 'NONE', value: 'NONE' },
      ],
    },
    {
      type: 'input',
      name: 'deliveryKey',
      message: 'Filter by deliveryKey (regex, leave blank for any):',
      default: '^en-GB',
    },
    {
      type: 'list',
      name: 'localePlacement',
      message: 'Delivery key locale placement:',
      default: 'prefix',
      choices: [
        { name: 'prefix', value: 'prefix' },
        { name: 'suffix', value: 'suffix' },
      ],
    },
  ]);
}

type FilterCriteria = {
  schemaId?: string;
  status?: string[];
  publishingStatus?: Amplience.PublishingStatus[];
  deliveryKey?: string;
  localePlacement?: 'prefix' | 'suffix';
};
