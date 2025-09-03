import inquirer from 'inquirer';

/**
 * Prompt user for new locale prefix
 */
export async function promptForLocale(): Promise<string> {
  const { locale } = await inquirer.prompt([
    {
      type: 'input',
      name: 'locale',
      message: 'Enter new locale prefix:',
      default: 'en-gb',
      validate: (input: string): true | string => input.trim() !== '' || 'Locale cannot be empty',
    },
  ]);

  return locale;
}
