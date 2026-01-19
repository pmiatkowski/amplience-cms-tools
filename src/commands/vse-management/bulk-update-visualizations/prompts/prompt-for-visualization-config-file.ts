import inquirer from 'inquirer';
import { getDefaultVisualizationConfigFilePath } from '~/utils/env-validator';

export async function promptForVisualizationConfigFile(): Promise<string> {
  const defaultFilePath = getDefaultVisualizationConfigFilePath() || '';

  const { filePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Enter path to visualization config JSON file:',
      default: defaultFilePath,
    },
  ]);

  return filePath;
}
