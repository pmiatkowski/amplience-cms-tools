import inquirer from 'inquirer';

/**
 * Prompt user to select specific commands from a command set.
 * Uses a multi-select checkbox prompt to choose one or more commands.
 *
 * @param commands - Array of command entries in the selected set
 *
 * @example
 * const selected = await promptForCommandSelection(commandSet.commands);
 * // selected contains only the chosen commands
 */
export async function promptForCommandSelection(
  commands: Amplience.CommandSetEntry[]
): Promise<Amplience.CommandSetEntry[]> {
  const choices = commands.map((entry, index) => {
    const label = entry.description
      ? `${entry.command} - ${entry.description}`
      : entry.command;

    return {
      name: label,
      value: index,
    };
  });

  const { selectedCommands } = await (
    inquirer.prompt as unknown as (questions: unknown) => Promise<{ selectedCommands: number[] }>
  )([
    {
      type: 'checkbox',
      name: 'selectedCommands',
      message: 'Select command(s) to run:',
      choices,
      validate: (input: number[]): true | string =>
        input.length > 0 ? true : 'Select at least one command',
    },
  ]);

  const selectedIndices = (selectedCommands as number[]).slice().sort((a, b) => a - b);

  return selectedIndices.map(index => commands[index]);
}
