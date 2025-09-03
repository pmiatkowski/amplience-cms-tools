import inquirer from 'inquirer';

export type OutputFormat = 'tree' | 'raw' | 'table' | 'all';

export async function promptForOutputFormat(): Promise<OutputFormat> {
  const { outputFormat } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputFormat',
      message: 'How would you like to view the results?',
      choices: [
        { name: 'Tree visualization (console)', value: 'tree' },
        { name: 'Raw JSON output', value: 'raw' },
        { name: 'Table format', value: 'table' },
        { name: 'All formats', value: 'all' },
      ],
    },
  ]);

  return outputFormat;
}
