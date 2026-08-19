import inquirer from 'inquirer';

export async function promptForContentTypeRepositories(
  definition: Amplience.ContentTypeExportDefinition,
  repositories: Amplience.ContentRepository[]
): Promise<Amplience.ContentRepository[]> {
  const { selectedIds } = await inquirer.prompt<{ selectedIds: string[] }>({
    type: 'checkbox',
    name: 'selectedIds',
    message: `Select target repositories for "${definition.settings?.label || definition.contentTypeUri}":`,
    choices: repositories.map(repository => ({
      name: `${repository.label} (${repository.name})`,
      value: repository.id,
    })),
  });
  const selected = new Set(selectedIds);

  return repositories.filter(repository => selected.has(repository.id));
}
