/**
 * User Command Sets Action Module
 *
 * Core execution engine for running user-defined command sets.
 * Handles parameter detection, validation, execution, and result aggregation.
 */

/**
 * Aggregate multiple command execution results into a summary.
 * Calculates totals, success/failure counts, and combined duration.
 *
 * @param results - Array of individual command execution results
 *
 * @example
 * const summary = aggregateResults(results);
 * console.log(`${summary.succeeded}/${summary.total} commands succeeded`);
 * console.log(`Total time: ${summary.totalDurationMs}ms`);
 */
export function aggregateResults(
  results: Amplience.CommandExecutionResult[]
): Amplience.ExecutionSummary {
  const failedCommands = results
    .filter(r => !r.success)
    .map(r => r.command);

  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  return {
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: failedCommands.length,
    totalDurationMs,
    results,
    failedCommands,
  };
}


/**
 * Detect whether a command entry should run in interactive or pre-configured mode.
 * Interactive mode prompts user for parameters; pre-configured uses provided values.
 *
 * @param entry - The command set entry to analyze
 *
 * @example
 * const entry = { command: 'sync-hierarchy', parameters: { hub: 'prod' } };
 * detectParameterMode(entry); // 'pre-configured'
 *
 * @example
 * const entry = { command: 'list-folder-tree' };
 * detectParameterMode(entry); // 'interactive'
 */
export function detectParameterMode(
  entry: Amplience.CommandSetEntry
): Amplience.ParameterMode {
  // No parameters object or undefined = interactive
  if (!entry.parameters) {
    return 'interactive';
  }

  // Empty parameters object = interactive
  if (Object.keys(entry.parameters).length === 0) {
    return 'interactive';
  }

  // Has at least one parameter = pre-configured
  return 'pre-configured';
}


/**
 * Execute a single command with the provided executor function.
 * Captures timing information and handles errors gracefully.
 *
 * @param entry - The command set entry to execute
 * @param executor - Function that performs the actual command execution
 *
 * @example
 * const result = await executeCommand(
 *   { command: 'sync-hierarchy', parameters: { hub: 'prod' } },
 *   async (cmd, params) => runActualCommand(cmd, params)
 * );
 */
export async function executeCommand(
  entry: Amplience.CommandSetEntry,
  executor: Amplience.CommandExecutor
): Promise<Amplience.CommandExecutionResult> {
  const startTime = Date.now();

  try {
    await executor(entry.command, entry.parameters);

    return {
      command: entry.command,
      success: true,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      command: entry.command,
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}


/**
 * Handle execution of an empty command set.
 * Returns a result indicating no commands were executed.
 *
 * @param commandSet - The empty command set
 *
 * @example
 * if (commandSet.commands.length === 0) {
 *   const result = executeEmptyCommandSet(commandSet);
 *   console.log(result.message);
 * }
 */
export function executeEmptyCommandSet(
  commandSet: Amplience.CommandSet
): Amplience.EmptyCommandSetResult {
  return {
    total: 0,
    succeeded: 0,
    failed: 0,
    message: `No commands to execute in command set "${commandSet.name}".`,
  };
}



/**
 * Execute all commands in a command set sequentially ("run all" mode).
 * Continues executing commands even if some fail, collecting all results.
 *
 * @param commandSet - The command set to execute
 * @param executor - Function that performs the actual command execution
 *
 * @example
 * const summary = await executeRunAll(commandSet, async (cmd, params) => {
 *   return runActualCommand(cmd, params);
 * });
 * console.log(`${summary.succeeded}/${summary.total} commands succeeded`);
 */
export async function executeRunAll(
  commandSet: Amplience.CommandSet,
  executor: Amplience.CommandExecutor
): Promise<Amplience.ExecutionSummary> {
  // Handle empty command set
  if (commandSet.commands.length === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      totalDurationMs: 0,
      results: [],
      failedCommands: [],
    };
  }

  const results: Amplience.CommandExecutionResult[] = [];

  // Execute commands sequentially
  for (const entry of commandSet.commands) {
    const result = await executeCommand(entry, executor);
    results.push(result);
  }

  return aggregateResults(results);
}




/**
 * Execute commands in step-by-step mode with pause/continue prompts.
 * After each command, prompts the user to continue or stop.
 *
 * @param commandSet - The command set to execute
 * @param executor - Function that performs the actual command execution
 * @param promptForContinue - Function that prompts user to continue or stop
 *
 * @example
 * const summary = await executeStepByStep(
 *   commandSet,
 *   async (cmd, params) => runActualCommand(cmd, params),
 *   async (cmdName, index, total) => promptUser('Continue?')
 * );
 */
export async function executeStepByStep(
  commandSet: Amplience.CommandSet,
  executor: Amplience.CommandExecutor,
  promptForContinue: (
    commandName: string,
    currentIndex: number,
    totalCommands: number
  ) => Promise<Amplience.StepByStepChoice>
): Promise<Amplience.ExecutionSummary> {
  // Handle empty command set
  if (commandSet.commands.length === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      totalDurationMs: 0,
      results: [],
      failedCommands: [],
    };
  }

  const results: Amplience.CommandExecutionResult[] = [];
  const totalCommands = commandSet.commands.length;

  for (let i = 0; i < commandSet.commands.length; i++) {
    const entry = commandSet.commands[i];
    const result = await executeCommand(entry, executor);
    results.push(result);

    // After executing a command (except the last one), prompt user to continue
    // User explicitly chose step-by-step mode to have control over execution flow
    if (i < commandSet.commands.length - 1) {
      const choice = await promptForContinue(entry.command, i, totalCommands);

      if (choice === 'stop') {
        break;
      }
    }
  }

  return aggregateResults(results);
}




/**
 * Execute all commands with error recovery support (Continue/Stop/Retry).
 * When a command fails, prompts user for how to handle the error.
 *
 * @param commandSet - The command set to execute
 * @param executor - Function that performs the actual command execution
 * @param promptForError - Function that prompts user for error handling choice
 *
 * @example
 * const summary = await executeWithErrorRecovery(
 *   commandSet,
 *   async (cmd, params) => runActualCommand(cmd, params),
 *   async (cmdName, error) => promptUser('Command failed. Continue/Stop/Retry?')
 * );
 */
export async function executeWithErrorRecovery(
  commandSet: Amplience.CommandSet,
  executor: Amplience.CommandExecutor,
  promptForError: (
    commandName: string,
    errorMessage: string
  ) => Promise<Amplience.ErrorHandlingChoice>
): Promise<Amplience.ExecutionSummary> {
  // Handle empty command set
  if (commandSet.commands.length === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      totalDurationMs: 0,
      results: [],
      failedCommands: [],
    };
  }

  const results: Amplience.CommandExecutionResult[] = [];
  let i = 0;

  while (i < commandSet.commands.length) {
    const entry = commandSet.commands[i];
    const result = await executeCommand(entry, executor);

    if (result.success) {
      results.push(result);
      i++;
    } else {
      // Command failed - prompt user for error handling choice
      const choice = await promptForError(entry.command, result.error || 'Unknown error');

      if (choice === 'continue') {
        // Skip this command and move to next
        results.push(result);
        i++;
      } else if (choice === 'stop') {
        // Stop execution - include the failed result
        results.push(result);
        break;
      } else if (choice === 'retry') {
        // Retry the same command (don't increment i, don't push result)
        // Loop will execute the same command again
        continue;
      }
    }
  }

  return aggregateResults(results);
}



/**
 * Validate command parameters for pre-configured execution.
 * Checks that provided parameters don't have null or empty string values.
 *
 * @param entry - The command set entry to validate
 *
 * @example
 * const entry = { command: 'sync-hierarchy', parameters: { hub: '' } };
 * const result = validateCommandParameters(entry);
 * // result.isValid === false, result.invalidParams === ['hub']
 */
export function validateCommandParameters(
  entry: Amplience.CommandSetEntry
): Amplience.ParameterValidationResult {
  const missingParams: string[] = [];
  const invalidParams: string[] = [];

  // Interactive mode doesn't need parameter validation - user provides them
  if (!entry.parameters || Object.keys(entry.parameters).length === 0) {
    return {
      isValid: true,
      missingParams,
      invalidParams,
    };
  }

  // Validate each provided parameter
  for (const [key, value] of Object.entries(entry.parameters)) {
    // null values are invalid
    if (value === null) {
      invalidParams.push(key);
      continue;
    }

    // Empty strings are invalid
    if (typeof value === 'string' && value.trim() === '') {
      invalidParams.push(key);
      continue;
    }

    // Boolean false is a valid value (don't mark as invalid)
    // Numbers including 0 are valid values
  }

  return {
    isValid: invalidParams.length === 0 && missingParams.length === 0,
    missingParams,
    invalidParams,
  };
}


