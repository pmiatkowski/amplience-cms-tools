import inquirer from 'inquirer';

/**
 * Prompt user to confirm if they want to run in dry-run mode.
 */
export async function promptForDryRun(): Promise<boolean> {
  const { dryRun } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Run in dry-run mode (preview changes without executing)?',
      default: false,
    },
  ]);

  return dryRun;
}
