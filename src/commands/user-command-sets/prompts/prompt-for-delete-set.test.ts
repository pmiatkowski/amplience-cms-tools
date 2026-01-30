import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { promptForDeleteSet, promptForDeleteConfirmation } from './prompt-for-delete-set';

vi.mock('inquirer');

describe('promptForDeleteSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return selected command set name', async () => {
    const commandSets: Amplience.CommandSet[] = [
      { name: 'Daily Sync', commands: [] },
      { name: 'Schema Update', commands: [] },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ setName: 'Daily Sync' });

    const result = await promptForDeleteSet(commandSets);

    expect(result).toBe('Daily Sync');
  });

  it('should format choices with name and command count', async () => {
    const commandSets: Amplience.CommandSet[] = [
      { name: 'Daily Sync', description: 'Sync ops', commands: [{ command: 'sync-hierarchy' }] },
      { name: 'Empty Set', commands: [] },
    ];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ setName: 'Daily Sync' });

    await promptForDeleteSet(commandSets);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (
      promptCall as unknown as Array<{ choices?: Array<{ name: string; value: string }> }>
    )[0];

    expect(question.choices?.find(c => c.value === 'Daily Sync')?.name).toContain('Daily Sync');
    expect(question.choices?.find(c => c.value === 'Daily Sync')?.name).toContain('1 command');
    expect(question.choices?.find(c => c.value === 'Empty Set')?.name).toContain('0 commands');
  });

  it('should include back option', async () => {
    const commandSets: Amplience.CommandSet[] = [{ name: 'Test', commands: [] }];

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ setName: '__back__' });

    const result = await promptForDeleteSet(commandSets);

    expect(result).toBe('__back__');

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ choices?: Array<{ value: string }> }>)[0];
    const hasBackOption = question.choices?.some(c => c.value === '__back__');

    expect(hasBackOption).toBe(true);
  });
});

describe('promptForDeleteConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when user confirms deletion', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ confirm: true });

    const result = await promptForDeleteConfirmation('Daily Sync');

    expect(result).toBe(true);
  });

  it('should return false when user cancels deletion', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ confirm: false });

    const result = await promptForDeleteConfirmation('Daily Sync');

    expect(result).toBe(false);
  });

  it('should include set name in confirmation message', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ confirm: false });

    await promptForDeleteConfirmation('My Custom Set');

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ message?: string }>)[0];

    expect(question.message).toContain('My Custom Set');
  });

  it('should default to false', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ confirm: false });

    await promptForDeleteConfirmation('Test');

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ default?: boolean }>)[0];

    expect(question.default).toBe(false);
  });
});
