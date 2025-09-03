import inquirer from 'inquirer';

/**
 * Prompts the user to select target repositories for a specific content type
 * @param contentType The content type being mapped
 * @param repositories Array of available target repositories
 * @returns Promise resolving to array of selected repositories
 */
export async function promptForRepositoryMapping(
  contentType: Amplience.ContentType,
  repositories: Amplience.ContentRepository[]
): Promise<Amplience.ContentRepository[]> {
  if (repositories.length === 0) {
    console.log('No repositories available for mapping.');

    return [];
  }

  const choices = repositories.map(repo => ({
    name: `${repo.label} (${repo.name})`,
    value: repo.id,
  }));

  const { selectedRepoIds } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedRepoIds',
    message: `Select target repositories for content type "${contentType.settings?.label || contentType.contentTypeUri}":`,
    choices,
  });

  // Handle case where no repositories are selected
  if (selectedRepoIds.length === 0) {
    console.log(
      `No repositories selected for content type "${contentType.settings?.label || contentType.contentTypeUri}".`
    );

    return [];
  }

  // Filter and return selected repositories
  return repositories.filter(repo => selectedRepoIds.includes(repo.id));
}
