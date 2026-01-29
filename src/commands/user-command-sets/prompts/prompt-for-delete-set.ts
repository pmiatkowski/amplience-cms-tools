import inquirer from 'inquirer';

/**
 * Prompt user to confirm deletion of a command set.
 * Default is false to prevent accidental deletions.
 *
 * @param setName - The name of the set being deleted
 *
 * @example
 * const confirmed = await promptForDeleteConfirmation('Daily Sync');
 * if (confirmed) {
 *   // Proceed with deletion
 * }
 */
export async function promptForDeleteConfirmation(setName: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete "${setName}"?`,
      default: false,
    },
  ]);

  return confirm;
}

/**
 * Prompt user to select a command set to delete.
 * Returns the name of the selected set, or '__back__' if back option selected.
 *
 * @param commandSets - Array of available command sets
 *
 * @example
 * const setName = await promptForDeleteSet(commandSets);
 * if (setName !== '__back__') {
 *   const confirmed = await promptForDeleteConfirmation(setName);
 *   if (confirmed) {
 *     // Delete the set
 *   }
 * }
 */
export async function promptForDeleteSet(
  commandSets: Amplience.CommandSet[]
): Promise<string> {
  const choices = commandSets.map(set => {
    const commandCount = set.commands.length;
    const commandText = commandCount === 1 ? 'command' : 'commands';
    let name = `${set.name} (${commandCount} ${commandText})`;

    if (set.description) {
      name = `${set.name} - ${set.description} (${commandCount} ${commandText})`;
    }

    return { name, value: set.name };
  });

  choices.push({ name: '← Cancel', value: '__back__' });

  const { setName } = await inquirer.prompt<{ setName: string }>([
    {
      type: 'list',
      name: 'setName',
      message: 'Select command set to delete:',
      choices,
    },
  ]);

  return setName;
}
