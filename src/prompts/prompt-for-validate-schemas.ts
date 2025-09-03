import inquirer from 'inquirer';

/**
 * Prompt user to confirm if schemas should be validated before creation.
 */
export async function promptForValidateSchemas(): Promise<boolean> {
  const { validateSchemas } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'validateSchemas',
      message: 'Validate schemas before creation?',
      default: false,
    },
  ]);

  return validateSchemas;
}
