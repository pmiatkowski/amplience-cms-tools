import inquirer from 'inquirer';

/**
 * Prompt user for a regex to filter schema IDs.
 */
export async function promptForSchemaIdFilter({
  defaultValue,
}: {
  defaultValue?: string;
} = {}): Promise<string> {
  const { schemaIdFilter } = await inquirer.prompt([
    {
      type: 'input',
      name: 'schemaIdFilter',
      message: 'Filter by schema ID (leave blank for any):',
      default: defaultValue ?? '',
      validate: (value: string): boolean | string => {
        if (value.trim() === '') {
          return true;
        }

        try {
          new RegExp(value);

          return true;
        } catch {
          return 'Invalid regex pattern';
        }
      },
    },
  ]);

  return schemaIdFilter;
}
