import inquirer from 'inquirer';

export async function promptForExtensionOperation(): Promise<ExtensionOperationChoice> {
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'Select an extension operation:',
      choices: [
        {
          name: 'Export Extensions (export extensions from hub with optional filtering)',
          value: 'export',
        },
        {
          name: 'Import Extensions (coming soon)',
          value: 'import',
          disabled: true,
        },
        {
          name: 'Delete Extensions (coming soon)',
          value: 'delete',
          disabled: true,
        },
      ],
    },
  ]);

  return operation;
}

type ExtensionOperationChoice = 'export' | 'import' | 'delete';
