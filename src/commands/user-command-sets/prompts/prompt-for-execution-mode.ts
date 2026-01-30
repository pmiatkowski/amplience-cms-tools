import inquirer from 'inquirer';

/**
 * Prompt user to select the execution mode for running a command set.
 * Allows choosing between running all commands automatically or stepping through them.
 *
 * @example
 * const mode = await promptForExecutionMode();
 * if (mode === 'run-all') {
 *   // Execute all commands sequentially
 * } else {
 *   // Pause after each command for confirmation
 * }
 */
export async function promptForExecutionMode(): Promise<Amplience.ExecutionMode> {
  const { executionMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'executionMode',
      message: 'How would you like to execute the commands?',
      choices: [
        {
          name: 'Run all commands sequentially (automatic)',
          value: 'run-all',
        },
        {
          name: 'Step-by-step (pause after each command for confirmation)',
          value: 'step-by-step',
        },
        {
          name: 'Pick commands to run (select specific commands)',
          value: 'pick-commands',
        },
      ],
    },
  ]);

  return executionMode;
}
