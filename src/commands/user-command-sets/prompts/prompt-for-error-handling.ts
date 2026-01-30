import inquirer from 'inquirer';

/**
 * Prompt user for error handling choice when a command fails during execution.
 * Provides options to continue with next command, stop execution, or retry the failed command.
 *
 * The three options address different user needs:
 * - Continue: Skip this failure and proceed (useful for non-critical commands)
 * - Stop: Halt execution to investigate (prevents cascading failures)
 * - Retry: Attempt the command again (useful for transient errors like network issues)
 *
 * @param commandName - Name of the command that failed
 * @param errorMessage - Error message from the failed command
 *
 * @example
 * const choice = await promptForErrorHandling('sync-hierarchy', 'Connection timeout');
 * if (choice === 'retry') {
 *   // Re-execute the command
 * } else if (choice === 'continue') {
 *   // Skip to next command
 * } else {
 *   // Stop execution
 * }
 */
export async function promptForErrorHandling(
  commandName: string,
  errorMessage: string
): Promise<Amplience.ErrorHandlingChoice> {
  const { errorChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'errorChoice',
      message: `Command "${commandName}" failed: ${errorMessage}\n  How would you like to proceed?`,
      choices: [
        {
          name: 'Continue - Skip this command and proceed to the next one',
          value: 'continue',
        },
        {
          name: 'Stop - Stop execution immediately',
          value: 'stop',
        },
        {
          name: 'Retry - Attempt to run this command again',
          value: 'retry',
        },
      ],
    },
  ]);

  return errorChoice;
}
