import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptForCommandSelection } from './prompt-for-command-selection';

vi.mock('inquirer');

describe('promptForCommandSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user with checkbox selection of commands', async () => {
    const commands: Amplience.CommandSetEntry[] = [
      {
        command: 'sync-hierarchy',
        description: 'Sync content hierarchy structure',
      },
      {
        command: 'copy-content-types',
      },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedCommands: [0] });

    await promptForCommandSelection(commands);

    expect(inquirer.prompt).toHaveBeenCalledTimes(1);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as Array<{
      type: string;
      name: string;
      message: string;
      choices: Array<{ name: string; value: number }>;
      validate?: (input: number[]) => boolean | string;
    }>;

    expect(promptCall[0].type).toBe('checkbox');
    expect(promptCall[0].name).toBe('selectedCommands');
    expect(promptCall[0].message).toContain('Select');
    expect(promptCall[0].choices[0]).toEqual({
      name: 'sync-hierarchy - Sync content hierarchy structure',
      value: 0,
    });
    expect(promptCall[0].choices[1]).toEqual({
      name: 'copy-content-types',
      value: 1,
    });
  });

  it('should return selected commands in original order', async () => {
    const commands: Amplience.CommandSetEntry[] = [
      { command: 'sync-hierarchy' },
      { command: 'copy-content-types' },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedCommands: [1, 0] });

    const result = await promptForCommandSelection(commands);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('sync-hierarchy');
    expect(result[1].command).toBe('copy-content-types');
  });

  it('should require at least one command to be selected', async () => {
    const commands: Amplience.CommandSetEntry[] = [{ command: 'sync-hierarchy' }];

    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedCommands: [0] });

    await promptForCommandSelection(commands);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as Array<{
      validate?: (input: number[]) => boolean | string;
    }>;

    expect(promptCall[0].validate?.([])).toBe('Select at least one command');
    expect(promptCall[0].validate?.([0])).toBe(true);
  });
});
