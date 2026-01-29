import inquirer from 'inquirer';

/**
 * Choice option for the command set selection prompt.
 */
type CommandSetMenuChoice = {
  name: string;
  value: string;
};

/**
 * Options for formatting command set menu choices.
 */
type FormatCommandSetMenuOptions = {
  /** Include a "Back to main menu" option at the end */
  includeBackOption?: boolean;
};

/**
 * Format a single command set into a menu choice with name, description, and command count.
 * Displays in format: "Name - Description (X commands)"
 *
 * @param commandSet - The command set to format
 *
 * @example
 * const choice = formatCommandSetMenuChoice({
 *   name: 'Daily Sync',
 *   description: 'Sync prod to dev',
 *   commands: [{ command: 'sync-hierarchy' }, { command: 'copy-content-types' }]
 * });
 * // { name: 'Daily Sync - Sync prod to dev (2 commands)', value: 'Daily Sync' }
 */
export function formatCommandSetMenuChoice(
  commandSet: Amplience.CommandSet
): CommandSetMenuChoice {
  const commandCount = commandSet.commands.length;
  const commandText = commandCount === 1 ? 'command' : 'commands';

  let displayName = commandSet.name;

  if (commandSet.description) {
    displayName += ` - ${commandSet.description}`;
  }

  displayName += ` (${commandCount} ${commandText})`;

  return {
    name: displayName,
    value: commandSet.name,
  };
}

/**
 * Format an array of command sets into menu choices.
 * Optionally includes a "Back to main menu" option.
 *
 * @param commandSets - Array of command sets to format
 * @param options - Formatting options
 *
 * @example
 * const choices = formatCommandSetMenuChoices(commandSets, { includeBackOption: true });
 * // Returns array of choices with optional back option at the end
 */
export function formatCommandSetMenuChoices(
  commandSets: Amplience.CommandSet[],
  options: FormatCommandSetMenuOptions = {}
): CommandSetMenuChoice[] {
  const choices = commandSets.map(formatCommandSetMenuChoice);

  if (options.includeBackOption) {
    choices.push({
      name: '← Back to main menu',
      value: '__back__',
    });
  }

  return choices;
}

/**
 * Prompt user to select a command set from the available sets.
 * Returns the name of the selected command set, or '__back__' if back option selected.
 *
 * @param commandSets - Array of available command sets
 * @param options - Prompt options
 *
 * @example
 * const selectedName = await promptForCommandSet(commandSets);
 * if (selectedName === '__back__') {
 *   // Return to main menu
 * } else {
 *   const selected = commandSets.find(s => s.name === selectedName);
 *   // Execute selected command set
 * }
 */
export async function promptForCommandSet(
  commandSets: Amplience.CommandSet[],
  options: FormatCommandSetMenuOptions = {}
): Promise<string> {
  const choices = formatCommandSetMenuChoices(commandSets, options);

  const { selectedSet } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedSet',
      message: 'Select a command set to run:',
      choices,
    },
  ]);

  return selectedSet;
}
