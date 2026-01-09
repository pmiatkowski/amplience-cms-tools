import inquirer from 'inquirer';

/**
 * Confirm whether the user wants to proceed with filtering after previewing extensions.
 */
export async function promptForPreviewConfirmation(
  keptCount: number,
  removedCount: number
): Promise<boolean> {
  const summaryLine = `Proceed with filtering ${keptCount} matching extension${keptCount === 1 ? '' : 's'} and removing ${removedCount} other${removedCount === 1 ? '' : 's'}?`;

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: summaryLine,
      default: keptCount === 0 ? false : true,
    },
  ]);

  return confirm;
}
