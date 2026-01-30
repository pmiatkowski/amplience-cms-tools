import inquirer from 'inquirer';

import { VALID_COMMAND_NAMES } from '~/services/command-set-config-service';

import { validateCommandCount, validateSetName } from './prompt-for-create-set';

/**
 * Prompt user to add new commands to a command set.
 * Returns an array of new command entries to add.
 *
 * @example
 * const newCommands = await promptForAddCommands();
 * commandSet.commands.push(...newCommands);
 */
export async function promptForAddCommands(): Promise<Amplience.CommandSetEntry[]> {
  const { commandCount } = await inquirer.prompt<{ commandCount: number }>([
    {
      type: 'input',
      name: 'commandCount',
      message: 'How many commands to add?',
      default: '1',
      validate: validateCommandCount,
      filter: (input: string): number => parseInt(input, 10),
    },
  ]);

  const commands: Amplience.CommandSetEntry[] = [];

  for (let i = 0; i < commandCount; i++) {
    const answers = await inquirer.prompt<{ [key: string]: string }>([
      {
        type: 'list',
        name: `command_${i}`,
        message: `Command ${i + 1}:`,
        choices: [...VALID_COMMAND_NAMES],
      },
      {
        type: 'input',
        name: `description_${i}`,
        message: `Description for command ${i + 1} (optional):`,
      },
    ]);

    const commandEntry: Amplience.CommandSetEntry = {
      command: answers[`command_${i}`],
    };

    const cmdDescription = answers[`description_${i}`]?.trim();
    if (cmdDescription) {
      commandEntry.description = cmdDescription;
    }

    commands.push(commandEntry);
  }

  return commands;
}

/**
 * Prompt user to select which edit action to perform.
 *
 * @example
 * const action = await promptForEditAction();
 * if (action === 'edit-name') {
 *   // Handle name edit
 * }
 */
export async function promptForEditAction(): Promise<Amplience.EditAction> {
  const { action } = await inquirer.prompt<{ action: Amplience.EditAction }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to edit?',
      choices: [
        { name: 'Edit name', value: 'edit-name' },
        { name: 'Edit description', value: 'edit-description' },
        { name: 'Add commands', value: 'add-commands' },
        { name: 'Remove commands', value: 'remove-commands' },
        { name: 'Done editing', value: 'done' },
      ],
    },
  ]);

  return action;
}

/**
 * Prompt user to edit the description of a command set.
 *
 * @param currentDescription - The current description value (may be undefined)
 *
 * @example
 * const newDescription = await promptForEditDescription('Old description');
 */
export async function promptForEditDescription(
  currentDescription: string | undefined
): Promise<string | undefined> {
  const { description } = await inquirer.prompt<{ description: string }>([
    {
      type: 'input',
      name: 'description',
      message: 'New description (leave empty to remove):',
      default: currentDescription || '',
    },
  ]);

  const trimmed = description.trim();

  return trimmed || undefined;
}

/**
 * Prompt user to edit the name of a command set.
 *
 * @param currentName - The current name value
 * @param existingNames - Array of existing command set names (for validation)
 *
 * @example
 * const newName = await promptForEditName('Old Name', ['Other Set']);
 */
export async function promptForEditName(
  currentName: string,
  existingNames: string[]
): Promise<string> {
  // Filter out current name from existing names for validation
  // This allows keeping the same name
  const otherNames = existingNames.filter(n => n.toLowerCase() !== currentName.toLowerCase());

  const { name } = await inquirer.prompt<{ name: string }>([
    {
      type: 'input',
      name: 'name',
      message: 'New name:',
      default: currentName,
      validate: (input: string): boolean | string => validateSetName(input, otherNames),
    },
  ]);

  return name.trim();
}

/**
 * Prompt user to edit a command set interactively.
 * Allows editing name, description, and commands until user selects 'done'.
 *
 * @param commandSet - The command set to edit
 * @param existingNames - Array of other command set names (for name validation)
 *
 * @example
 * const updatedSet = await promptForEditSet(commandSet, otherSetNames);
 */
export async function promptForEditSet(
  commandSet: Amplience.CommandSet,
  existingNames: string[]
): Promise<Amplience.CommandSet> {
  // Create a mutable copy
  const result: Amplience.CommandSet = {
    name: commandSet.name,
    commands: [...commandSet.commands],
  };

  if (commandSet.description) {
    result.description = commandSet.description;
  }

  let editing = true;

  while (editing) {
    const action = await promptForEditAction();

    switch (action) {
      case 'edit-name': {
        result.name = await promptForEditName(result.name, existingNames);
        break;
      }
      case 'edit-description': {
        const newDescription = await promptForEditDescription(result.description);
        if (newDescription) {
          result.description = newDescription;
        } else {
          delete result.description;
        }
        break;
      }
      case 'add-commands': {
        const newCommands = await promptForAddCommands();
        result.commands.push(...newCommands);
        break;
      }
      case 'remove-commands': {
        if (result.commands.length === 0) {
          console.log('No commands to remove.');
        } else {
          const indicesToRemove = await promptForRemoveCommands(result.commands);
          result.commands = result.commands.filter((_, index) => !indicesToRemove.includes(index));
        }
        break;
      }
      case 'done':
        editing = false;
        break;
    }
  }

  return result;
}

/**
 * Prompt user to select commands to remove from a command set.
 *
 * @param currentCommands - The current commands in the set
 *
 * @example
 * const indicesToRemove = await promptForRemoveCommands(commandSet.commands);
 * const newCommands = commandSet.commands.filter((_, i) => !indicesToRemove.includes(i));
 */
export async function promptForRemoveCommands(
  currentCommands: Amplience.CommandSetEntry[]
): Promise<number[]> {
  const choices = currentCommands.map((cmd, index) => {
    let name = cmd.command;
    if (cmd.description) {
      name += ` - ${cmd.description}`;
    }

    return { name, value: index };
  });

  const { indices } = await inquirer.prompt<{ indices: number[] }>([
    {
      type: 'checkbox',
      name: 'indices',
      message: 'Select commands to remove:',
      choices,
    },
  ]);

  return indices;
}
