import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatCommandSetMenuChoice,
  formatCommandSetMenuChoices,
  promptForCommandSet,
} from './prompt-for-command-set';

vi.mock('inquirer');

describe('formatCommandSetMenuChoice', () => {
  it('should format command set with name, description, and command count', () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Daily Sync',
      description: 'Synchronize content from prod to dev',
      commands: [
        { command: 'sync-hierarchy' },
        { command: 'copy-content-types' },
        { command: 'copy-content-type-schemas' },
      ],
    };

    const choice = formatCommandSetMenuChoice(commandSet);

    expect(choice.value).toBe('Daily Sync');
    expect(choice.name).toContain('Daily Sync');
    expect(choice.name).toContain('Synchronize content from prod to dev');
    expect(choice.name).toContain('3 commands');
  });

  it('should handle command set without description', () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Quick Sync',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const choice = formatCommandSetMenuChoice(commandSet);

    expect(choice.value).toBe('Quick Sync');
    expect(choice.name).toContain('Quick Sync');
    expect(choice.name).toContain('1 command');
  });

  it('should use singular "command" for single command', () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Single',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const choice = formatCommandSetMenuChoice(commandSet);

    expect(choice.name).toContain('1 command');
    expect(choice.name).not.toContain('1 commands');
  });

  it('should use plural "commands" for multiple commands', () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Multiple',
      commands: [{ command: 'sync-hierarchy' }, { command: 'copy-content-types' }],
    };

    const choice = formatCommandSetMenuChoice(commandSet);

    expect(choice.name).toContain('2 commands');
  });

  it('should handle empty commands array', () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Empty Set',
      description: 'No commands yet',
      commands: [],
    };

    const choice = formatCommandSetMenuChoice(commandSet);

    expect(choice.name).toContain('0 commands');
  });
});

describe('formatCommandSetMenuChoices', () => {
  it('should format array of command sets into choices', () => {
    const commandSets: Amplience.CommandSet[] = [
      {
        name: 'Daily Sync',
        description: 'Daily sync operations',
        commands: [{ command: 'sync-hierarchy' }],
      },
      {
        name: 'Schema Update',
        description: 'Update schemas',
        commands: [
          { command: 'copy-content-type-schemas' },
          { command: 'sync-content-type-properties' },
        ],
      },
    ];

    const choices = formatCommandSetMenuChoices(commandSets);

    expect(choices).toHaveLength(2);
    expect(choices[0].value).toBe('Daily Sync');
    expect(choices[1].value).toBe('Schema Update');
  });

  it('should return empty array for empty command sets', () => {
    const choices = formatCommandSetMenuChoices([]);

    expect(choices).toEqual([]);
  });

  it('should include back option when specified', () => {
    const commandSets: Amplience.CommandSet[] = [
      {
        name: 'Test Set',
        commands: [{ command: 'sync-hierarchy' }],
      },
    ];

    const choices = formatCommandSetMenuChoices(commandSets, { includeBackOption: true });

    expect(choices).toHaveLength(2);
    expect(choices[choices.length - 1].value).toBe('__back__');
    expect(choices[choices.length - 1].name).toContain('Back');
  });
});

describe('promptForCommandSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user to select a command set', async () => {
    const commandSets: Amplience.CommandSet[] = [
      {
        name: 'Daily Sync',
        description: 'Daily sync operations',
        commands: [{ command: 'sync-hierarchy' }],
      },
      {
        name: 'Schema Update',
        commands: [{ command: 'copy-content-type-schemas' }],
      },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedSet: 'Daily Sync' });

    const result = await promptForCommandSet(commandSets);

    expect(result).toBe('Daily Sync');
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as Array<{
      choices: Array<{ value: string }>;
    }>;
    expect(promptCall[0].choices).toHaveLength(2);
  });

  it('should return __back__ when user selects back option', async () => {
    const commandSets: Amplience.CommandSet[] = [
      {
        name: 'Test Set',
        commands: [{ command: 'sync-hierarchy' }],
      },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedSet: '__back__' });

    const result = await promptForCommandSet(commandSets, { includeBackOption: true });

    expect(result).toBe('__back__');
  });

  it('should display appropriate message in prompt', async () => {
    const commandSets: Amplience.CommandSet[] = [{ name: 'Test', commands: [] }];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedSet: 'Test' });

    await promptForCommandSet(commandSets);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as Array<{
      message: string;
    }>;
    expect(promptCall[0].message).toBe('Select a command set to run:');
  });
});
