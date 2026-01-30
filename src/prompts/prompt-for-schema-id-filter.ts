import inquirer from 'inquirer';

/**
 * Prompt user for a regex to filter schema IDs.
 */
export async function promptForSchemaIdFilter({
  defaultValue,
}: {
  defaultValue?: string;
} = {}): Promise<string> {
  const resolvedDefaultValue = defaultValue ?? process.env.AMP_DEFAULT_SCHEMA_ID ?? '';
  const { schemaIdFilter } = await inquirer.prompt([
    {
      type: 'input',
      name: 'schemaIdFilter',
      message: 'Filter by schema ID (leave blank for any):',
      default: resolvedDefaultValue,
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
