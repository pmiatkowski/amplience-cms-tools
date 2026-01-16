import inquirer from 'inquirer';
import { getDefaultSchemaIdPattern } from '~/utils/env-validator';

export async function promptForRegexPattern(): Promise<string> {
  const defaultPattern = getDefaultSchemaIdPattern() || '';

  const { pattern } = await inquirer.prompt([
    {
      type: 'input',
      name: 'pattern',
      message: 'Enter regex pattern to filter content types:',
      default: defaultPattern,
    },
  ]);

  return pattern;
}
