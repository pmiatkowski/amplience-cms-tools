import inquirer from 'inquirer';

export async function promptForStartFrom(): Promise<'root' | 'parent'> {
  const { startFrom } = await inquirer.prompt([
    {
      type: 'list',
      name: 'startFrom',
      message: 'Where would you like to start listing folders from?',
      choices: [
        { name: 'Repository root (all folders)', value: 'root' },
        { name: 'Specific parent folder', value: 'parent' },
      ],
    },
  ]);

  return startFrom;
}
