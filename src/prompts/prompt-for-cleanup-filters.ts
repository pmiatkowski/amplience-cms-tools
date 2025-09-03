import inquirer from 'inquirer';

/**
 * Prompt user for cleanup filter criteria
 */
export async function promptForCleanupFilters(): Promise<CleanupFilterCriteria> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'schemaId',
      message: 'Filter by schemaId (regexp, leave blank for any):',
      default: '',
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
      name: 'generalSearch',
      message: 'General search (regexp across label, deliveryKey, and ID, leave blank for any):',
      default: '',
    },
  ]);
}

type CleanupFilterCriteria = {
  schemaId?: string;
  status?: string[];
  generalSearch?: string;
};
