import inquirer from 'inquirer';
import { getDefaultContentTypesListFilePath } from '~/utils/env-validator';

export async function promptForContentTypesFile(): Promise<string> {
  const defaultFilePath = getDefaultContentTypesListFilePath() || '';

  const { filePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter path to content types list JSON file:',
      default: defaultFilePath,
    },
  ]);

  return filePath;
}
