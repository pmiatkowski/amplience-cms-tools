import inquirer from 'inquirer';

/**
 * Prompt user for a regex to filter schema IDs.
 */
export async function promptForSchemaIdFilter(): Promise<string> {
  const { schemaIdFilter } = await inquirer.prompt([
    {
      type: 'input',
      name: 'schemaIdFilter',
      message: 'Enter a regex pattern to filter schemas by ID (leave blank for all schemas):',
      default: '',
    },
  ]);

  return schemaIdFilter;
}
