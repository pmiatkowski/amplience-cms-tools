import inquirer from 'inquirer';

/**
 * Prompt user to select a repository from a list
 */
export async function promptForRepository(
  repos: Amplience.ContentRepository[]
): Promise<Amplience.ContentRepository> {
  const { selectedRepo } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRepo',
      message: 'Select a repository:',
      choices: repos.map(r => ({ name: r.label, value: r })),
    },
  ]);

  return selectedRepo;
}
