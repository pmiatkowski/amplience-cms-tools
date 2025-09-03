import inquirer from 'inquirer';

/**
 * Prompt user to confirm operation
 */
export async function promptForConfirmation(
  message?: string,
  defaultValue = false
): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message || 'Do you want to proceed with the update?',
      default: defaultValue,
    },
  ]);

  return confirmed;
}
