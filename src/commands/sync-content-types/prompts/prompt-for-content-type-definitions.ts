import inquirer from 'inquirer';

export async function promptForContentTypeDefinitions(
  definitions: Amplience.ContentTypeExportDefinition[]
): Promise<Amplience.ContentTypeExportDefinition[]> {
  if (definitions.length === 0) {
    return [];
  }

  const selectAll = 'SELECT_ALL';
  const { selectedUris } = await inquirer.prompt<{ selectedUris: string[] }>({
    type: 'checkbox',
    name: 'selectedUris',
    message: 'Select content types to synchronize:',
    choices: [
      { name: 'Select All', value: selectAll },
      new inquirer.Separator(),
      ...definitions.map(definition => ({
        name: `${definition.settings?.label || definition.contentTypeUri} (${definition.contentTypeUri})`,
        value: definition.contentTypeUri,
      })),
    ],
  });

  if (selectedUris.includes(selectAll)) {
    return definitions;
  }

  const selected = new Set(selectedUris);

  return definitions.filter(definition => selected.has(definition.contentTypeUri));
}
