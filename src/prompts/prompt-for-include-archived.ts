import inquirer from 'inquirer';

/**
 * Prompt user to confirm if archived schemas should be included.
 */
export async function promptForIncludeArchived(): Promise<boolean> {
  const { includeArchived } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeArchived',
      message: 'Include archived schemas?',
      default: false,
    },
  ]);

  return includeArchived;
}
