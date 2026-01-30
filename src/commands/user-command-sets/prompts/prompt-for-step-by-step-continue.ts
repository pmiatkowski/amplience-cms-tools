import inquirer from 'inquirer';

/**
 * Prompt user to continue or stop during step-by-step execution.
 * Called after each command completes (except the last) to give user control.
 *
 * @param commandName - Name of the command that just completed
 * @param currentIndex - Zero-based index of the completed command
 * @param totalCommands - Total number of commands in the set
 *
 * @example
 * // After command 2 of 5 completes
 * const choice = await promptForStepByStepContinue('sync-hierarchy', 1, 5);
 * if (choice === 'stop') {
 *   // User wants to halt execution
 * }
 */
export async function promptForStepByStepContinue(
  commandName: string,
  currentIndex: number,
  totalCommands: number
): Promise<Amplience.StepByStepChoice> {
  const completedCount = currentIndex + 1;

  const { stepChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'stepChoice',
      message: `Completed "${commandName}" (${completedCount} of ${totalCommands}). Continue?`,
      choices: [
        {
          name: 'Continue - Proceed to the next command',
          value: 'continue',
        },
        {
          name: 'Stop - Stop execution here',
          value: 'stop',
        },
      ],
    },
  ]);

  return stepChoice;
}
