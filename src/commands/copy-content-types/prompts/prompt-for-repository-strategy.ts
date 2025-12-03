import inquirer from 'inquirer';

/**
 * Prompts the user to select repository mapping strategy
 * @returns Promise resolving to either 'automatic' or 'manual'
 */
export async function promptForRepositoryStrategy(): Promise<'automatic' | 'manual'> {
  const { strategy } = await inquirer.prompt({
    type: 'list',
    name: 'strategy',
    message: 'How would you like to map content types to repositories?',
    choices: [
      {
        name: 'Automatic - Match repositories by name',
        value: 'automatic',
      },
      {
        name: 'Manual - Select repositories for each content type',
        value: 'manual',
      },
    ],
  });

  return strategy;
}
