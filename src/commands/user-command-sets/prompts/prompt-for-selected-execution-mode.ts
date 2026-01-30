import inquirer from 'inquirer';

/**
 * Prompt user to select execution mode for the selected commands.
 * Allows choosing between running selected commands automatically or step-by-step.
 *
 * @example
 * const mode = await promptForSelectedExecutionMode();
 * if (mode === 'run-all') {
 *   // Execute selected commands sequentially
 * } else {
 *   // Pause after each command for confirmation
 * }
 */
export async function promptForSelectedExecutionMode(): Promise<Amplience.ExecutionMode> {
  const { executionMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'executionMode',
      message: 'How would you like to execute the selected commands?',
      choices: [
        {
          name: 'Run selected commands sequentially (automatic)',
          value: 'run-all',
        },
        {
          name: 'Step-by-step selected (pause after each command for confirmation)',
          value: 'step-by-step',
        },
      ],
    },
  ]);

  return executionMode;
}
