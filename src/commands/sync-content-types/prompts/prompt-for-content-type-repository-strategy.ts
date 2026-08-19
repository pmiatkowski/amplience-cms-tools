import inquirer from 'inquirer';

export async function promptForContentTypeRepositoryStrategy(): Promise<'automatic' | 'manual'> {
  const { strategy } = await inquirer.prompt<{ strategy: 'automatic' | 'manual' }>({
    type: 'list',
    name: 'strategy',
    message: 'How should source repositories map to the target hub?',
    choices: [
      { name: 'Automatic - match exact repository names', value: 'automatic' },
      { name: 'Manual - select target repositories for each content type', value: 'manual' },
    ],
  });

  return strategy;
}
