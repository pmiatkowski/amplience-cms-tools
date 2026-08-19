import inquirer from 'inquirer';

export async function promptForContentTypeRepositoryMode(): Promise<Amplience.ContentTypeRepositoryMode> {
  const { mode } = await inquirer.prompt<{ mode: Amplience.ContentTypeRepositoryMode }>({
    type: 'list',
    name: 'mode',
    message: 'How should target repository assignments be aligned?',
    choices: [
      {
        name: 'Additive - add missing assignments and preserve target-only assignments',
        value: 'additive',
      },
      {
        name: 'Exact - mirror source assignments and remove target-only assignments',
        value: 'exact',
      },
    ],
  });

  return mode;
}
