import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VALID_COMMAND_NAMES } from '~/services/command-set-config-service';

import {
  promptForEditSet,
  promptForEditAction,
  promptForEditName,
  promptForEditDescription,
  promptForAddCommands,
  promptForRemoveCommands,
} from './prompt-for-edit-set';

vi.mock('inquirer');

describe('promptForEditAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return selected edit action', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ action: 'edit-name' });

    const result = await promptForEditAction();

    expect(result).toBe('edit-name');
  });

  it('should provide all available edit actions', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ action: 'edit-description' });

    await promptForEditAction();

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const actionQuestion = (promptCall as unknown as Array<{ choices?: Array<{ value: string }> }>).find(
      q => q.choices
    );

    const values = actionQuestion?.choices?.map(c => c.value);
    expect(values).toContain('edit-name');
    expect(values).toContain('edit-description');
    expect(values).toContain('add-commands');
    expect(values).toContain('remove-commands');
    expect(values).toContain('done');
  });
});

describe('promptForEditName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for new name with current name as default', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ name: 'Updated Name' });

    const result = await promptForEditName('Original Name', ['Other Set']);

    expect(result).toBe('Updated Name');

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const nameQuestion = (promptCall as unknown as Array<{ default?: string }>)[0];
    expect(nameQuestion.default).toBe('Original Name');
  });

  it('should allow keeping the same name', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ name: 'Same Name' });

    const result = await promptForEditName('Same Name', ['Other Set', 'Same Name']);

    expect(result).toBe('Same Name');
  });
});

describe('promptForEditDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for new description with current description as default', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ description: 'New description' });

    const result = await promptForEditDescription('Old description');

    expect(result).toBe('New description');

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const descQuestion = (promptCall as unknown as Array<{ default?: string }>)[0];
    expect(descQuestion.default).toBe('Old description');
  });

  it('should return undefined for empty description', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ description: '' });

    const result = await promptForEditDescription('Old description');

    expect(result).toBeUndefined();
  });

  it('should handle undefined current description', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ description: 'New description' });

    const result = await promptForEditDescription(undefined);

    expect(result).toBe('New description');
  });
});

describe('promptForAddCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return new commands to add', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ commandCount: 2 })
      .mockResolvedValueOnce({ command_0: 'sync-hierarchy', description_0: 'Sync' })
      .mockResolvedValueOnce({ command_1: 'copy-content-types', description_1: '' });

    const result = await promptForAddCommands();

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('sync-hierarchy');
    expect(result[0].description).toBe('Sync');
    expect(result[1].command).toBe('copy-content-types');
    expect(result[1].description).toBeUndefined();
  });

  it('should return empty array for zero commands', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ commandCount: 0 });

    const result = await promptForAddCommands();

    expect(result).toHaveLength(0);
  });

  it('should provide valid command names as choices', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ commandCount: 1 })
      .mockResolvedValueOnce({ command_0: 'sync-hierarchy', description_0: '' });

    await promptForAddCommands();

    const commandPromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0];
    const commandQuestion = (commandPromptCall as unknown as Array<{ choices?: string[] }>).find(
      q => q.choices
    );

    expect(commandQuestion?.choices).toEqual(expect.arrayContaining([...VALID_COMMAND_NAMES]));
  });
});

describe('promptForRemoveCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return indices of commands to remove', async () => {
    const currentCommands: Amplience.CommandSetEntry[] = [
      { command: 'sync-hierarchy', description: 'Sync' },
      { command: 'copy-content-types' },
      { command: 'cleanup-folder', description: 'Clean up' },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ indices: [0, 2] });

    const result = await promptForRemoveCommands(currentCommands);

    expect(result).toEqual([0, 2]);
  });

  it('should format command choices with description', async () => {
    const currentCommands: Amplience.CommandSetEntry[] = [
      { command: 'sync-hierarchy', description: 'Sync hierarchies' },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ indices: [] });

    await promptForRemoveCommands(currentCommands);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const checkboxQuestion = (promptCall as unknown as Array<{ choices?: Array<{ name: string }> }>)[0];

    expect(checkboxQuestion.choices?.[0].name).toContain('sync-hierarchy');
    expect(checkboxQuestion.choices?.[0].name).toContain('Sync hierarchies');
  });

  it('should return empty array when nothing selected', async () => {
    const currentCommands: Amplience.CommandSetEntry[] = [
      { command: 'sync-hierarchy' },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ indices: [] });

    const result = await promptForRemoveCommands(currentCommands);

    expect(result).toEqual([]);
  });
});

describe('promptForEditSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply name edit when edit-name action selected', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Original',
      description: 'Desc',
      commands: [{ command: 'sync-hierarchy' }],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'edit-name' })
      .mockResolvedValueOnce({ name: 'Updated' })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.name).toBe('Updated');
    expect(result.description).toBe('Desc');
    expect(result.commands).toHaveLength(1);
  });

  it('should apply description edit when edit-description action selected', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Test',
      description: 'Old',
      commands: [],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'edit-description' })
      .mockResolvedValueOnce({ description: 'New' })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.description).toBe('New');
  });

  it('should add commands when add-commands action selected', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Test',
      commands: [{ command: 'sync-hierarchy' }],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'add-commands' })
      .mockResolvedValueOnce({ commandCount: 1 })
      .mockResolvedValueOnce({ command_0: 'copy-content-types', description_0: '' })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.commands).toHaveLength(2);
    expect(result.commands[1].command).toBe('copy-content-types');
  });

  it('should remove commands when remove-commands action selected', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Test',
      commands: [
        { command: 'sync-hierarchy' },
        { command: 'copy-content-types' },
        { command: 'cleanup-folder' },
      ],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'remove-commands' })
      .mockResolvedValueOnce({ indices: [1] })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].command).toBe('sync-hierarchy');
    expect(result.commands[1].command).toBe('cleanup-folder');
  });

  it('should allow multiple edits before done', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Original',
      description: 'Old',
      commands: [],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'edit-name' })
      .mockResolvedValueOnce({ name: 'Updated' })
      .mockResolvedValueOnce({ action: 'edit-description' })
      .mockResolvedValueOnce({ description: 'New' })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.name).toBe('Updated');
    expect(result.description).toBe('New');
  });

  it('should remove description when cleared', async () => {
    const commandSet: Amplience.CommandSet = {
      name: 'Test',
      description: 'Old description',
      commands: [],
    };

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ action: 'edit-description' })
      .mockResolvedValueOnce({ description: '' })
      .mockResolvedValueOnce({ action: 'done' });

    const result = await promptForEditSet(commandSet, []);

    expect(result.description).toBeUndefined();
  });
});
