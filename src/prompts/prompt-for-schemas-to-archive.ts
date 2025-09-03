import inquirer from 'inquirer';

/**
 * Prompt user to select schemas to archive using multi-select checkboxes
 */
export async function promptForSchemasToArchive(
  schemas: Amplience.ContentTypeSchema[]
): Promise<Amplience.ContentTypeSchema[]> {
  const choices = schemas.map(schema => ({
    name: `${schema.schemaId} (Status: ${schema.status}, Version: ${schema.version})`,
    value: schema,
  }));

  // Add "Select All" option
  choices.unshift({
    name: '--- Select All ---',
    value: 'SELECT_ALL' as unknown as Amplience.ContentTypeSchema,
  });

  const { selectedSchemas } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedSchemas',
      message: 'Select schemas to archive:',
      choices,
    },
  ]);

  // Handle "Select All" option
  if (
    selectedSchemas.some((item: Amplience.ContentTypeSchema) => (item as unknown) === 'SELECT_ALL')
  ) {
    return schemas;
  }

  return selectedSchemas.filter(
    (schema: Amplience.ContentTypeSchema) => (schema as unknown) !== 'SELECT_ALL'
  );
}
