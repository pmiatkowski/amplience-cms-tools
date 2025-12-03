import inquirer from 'inquirer';

export type ContentTypeStatusFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL';

/**
 * Prompt user to select content type status filter
 */
export async function promptForContentTypeStatus(): Promise<ContentTypeStatusFilter> {
  const { status } = await inquirer.prompt([
    {
      type: 'list',
      name: 'status',
      message: 'Which content types do you want to synchronize?',
      choices: [
        { name: 'Active only', value: 'ACTIVE' },
        { name: 'Archived only', value: 'ARCHIVED' },
        { name: 'All (Active and Archived)', value: 'ALL' },
      ],
      default: 'ACTIVE',
    },
  ]);

  return status;
}
