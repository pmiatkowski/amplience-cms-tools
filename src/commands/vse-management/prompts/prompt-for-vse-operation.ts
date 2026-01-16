import inquirer from 'inquirer';

export async function promptForVseOperation(): Promise<VseOperationChoice> {
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'Select a VSE operation:',
      choices: [
        {
          name: 'Bulk Update Visualizations (update visualization config for multiple content types)',
          value: 'bulk-update-visualizations',
        },
      ],
    },
  ]);

  return operation;
}

type VseOperationChoice = 'bulk-update-visualizations';
