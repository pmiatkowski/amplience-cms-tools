import inquirer from 'inquirer';

function validateExactName(value: string, expected: string, subject: string): true | string {
  return value === expected || `${subject} name does not match "${expected}".`;
}

export async function promptForProtectedEnvironment(
  hub: Amplience.HubConfig,
  repository?: Amplience.ContentRepository
): Promise<void> {
  if (!hub.protected) {
    return;
  }

  const questions = [
    {
      type: 'input' as const,
      name: 'hubName',
      message: `Hub "${hub.name}" is protected. Type the hub name to continue:`,
      validate: (value: string): true | string => validateExactName(value, hub.name, 'Hub'),
    },
  ];

  if (repository) {
    questions.push({
      type: 'input' as const,
      name: 'repositoryName',
      message: `Type repository name "${repository.name}" to continue:`,
      validate: (value: string): true | string =>
        validateExactName(value, repository.name, 'Repository'),
    });
  }

  await inquirer.prompt(questions);
}
