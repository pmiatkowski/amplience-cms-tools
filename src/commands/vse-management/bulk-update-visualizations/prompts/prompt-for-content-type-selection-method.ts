import inquirer from 'inquirer';

export type ContentTypeSelectionMethod = 'api' | 'file';

export async function promptForContentTypeSelectionMethod(): Promise<ContentTypeSelectionMethod> {
  const { method } = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'How would you like to select content types?',
      choices: [
        {
          name: 'API - Filter content types using regex pattern',
          value: 'api',
        },
        {
          name: 'File - Load content types from JSON file',
          value: 'file',
        },
      ],
    },
  ]);

  return method;
}
