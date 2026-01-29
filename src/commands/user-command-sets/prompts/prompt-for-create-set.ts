import inquirer from 'inquirer';

import { VALID_COMMAND_NAMES } from '~/services/command-set-config-service';

/**
 * Prompt user to create a new command set.
 * Gathers name, description, and commands interactively.
 *
 * @param existingNames - Array of existing command set names to prevent duplicates
 *
 * @example
 * const newSet = await promptForCreateSet(['Existing Set']);
 * // Returns: { name: 'New Set', description: 'My set', commands: [...] }
 */
export async function promptForCreateSet(existingNames: string[]): Promise<Amplience.CommandSet> {
  // Prompt for name and description
  const { name, description } = await inquirer.prompt<{
    name: string;
    description: string;
  }>([
    {
      type: 'input',
      name: 'name',
      message: 'Command set name:',
      validate: (input: string): boolean | string => validateSetName(input, existingNames),
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):',
    },
  ]);

  // Prompt for number of commands
  const { commandCount } = await inquirer.prompt<{ commandCount: number }>([
    {
      type: 'input',
      name: 'commandCount',
      message: 'How many commands to add?',
      default: '0',
      validate: validateCommandCount,
      filter: (input: string): number => parseInt(input, 10),
    },
  ]);

  // Collect commands
  const commands: Amplience.CommandSetEntry[] = [];

  for (let i = 0; i < commandCount; i++) {
    const answers = await inquirer.prompt<{
      [key: string]: string;
    }>([
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

  // Build the result
  const result: Amplience.CommandSet = {
    name: name.trim(),
    commands,
  };

  const trimmedDescription = description.trim();
  if (trimmedDescription) {
    result.description = trimmedDescription;
  }

  return result;
}

/**
 * Validate command count input.
 * Ensures the input is a non-negative whole number.
 *
 * @param input - The string input to validate
 *
 * @example
 * // Valid inputs return true
 * validateCommandCount('3');   // true
 * validateCommandCount('0');   // true
 * validateCommandCount('10');  // true
 *
 * @example
 * // Invalid inputs return error messages
 * validateCommandCount('');      // 'Please enter a valid number'
 * validateCommandCount('abc');   // 'Please enter a valid number'
 * validateCommandCount('-1');    // 'Please enter a non-negative number'
 * validateCommandCount('2.5');   // 'Please enter a whole number'
 */
export function validateCommandCount(input: string): boolean | string {
  if (input === '') {
    return 'Please enter a valid number';
  }

  const num = Number(input);

  if (isNaN(num)) {
    return 'Please enter a valid number';
  }

  if (num < 0) {
    return 'Please enter a non-negative number';
  }

  if (!Number.isInteger(num)) {
    return 'Please enter a whole number';
  }

  return true;
}

/**
 * Validate a command set name.
 * Ensures the name is not empty and doesn't conflict with existing names.
 * Name comparison is case-insensitive to prevent confusing duplicates.
 *
 * @param name - The name to validate
 * @param existingNames - Array of existing command set names to check for duplicates
 *
 * @example
 * // Valid names return true
 * validateSetName('Daily Sync', ['Weekly Sync']);  // true
 * validateSetName('New Set', []);                  // true
 *
 * @example
 * // Invalid names return error messages
 * validateSetName('', ['Any']);                    // 'Name is required'
 * validateSetName('   ', ['Any']);                 // 'Name is required' (whitespace only)
 * validateSetName('Daily', ['Daily']);             // 'A command set with this name already exists'
 * validateSetName('daily', ['Daily']);             // 'A command set with this name already exists' (case-insensitive)
 */
export function validateSetName(name: string, existingNames: string[]): boolean | string {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Name is required';
  }

  const lowerName = trimmed.toLowerCase();
  const isDuplicate = existingNames.some(existing => existing.toLowerCase() === lowerName);

  if (isDuplicate) {
    return 'A command set with this name already exists';
  }

  return true;
}
