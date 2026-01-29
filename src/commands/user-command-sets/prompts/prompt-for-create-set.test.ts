import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VALID_COMMAND_NAMES } from '~/services/command-set-config-service';

import { promptForCreateSet, validateSetName, validateCommandCount } from './prompt-for-create-set';

vi.mock('inquirer');

describe('validateSetName', () => {
  const existingNames = ['Daily Sync', 'Schema Update'];

  it('should return true for valid unique name', () => {
    const result = validateSetName('New Set', existingNames);

    expect(result).toBe(true);
  });

  it('should return error message for empty name', () => {
    const result = validateSetName('', existingNames);

    expect(result).toBe('Name is required');
  });

  it('should return error message for whitespace-only name', () => {
    const result = validateSetName('   ', existingNames);

    expect(result).toBe('Name is required');
  });

  it('should return error message for duplicate name', () => {
    const result = validateSetName('Daily Sync', existingNames);

    expect(result).toBe('A command set with this name already exists');
  });

  it('should be case-insensitive when checking duplicates', () => {
    const result = validateSetName('daily sync', existingNames);

    expect(result).toBe('A command set with this name already exists');
  });

  it('should allow name with empty existing names array', () => {
    const result = validateSetName('New Set', []);

    expect(result).toBe(true);
  });
});

describe('validateCommandCount', () => {
  it('should return true for valid positive number', () => {
    const result = validateCommandCount('5');

    expect(result).toBe(true);
  });

  it('should return true for zero', () => {
    const result = validateCommandCount('0');

    expect(result).toBe(true);
  });

  it('should return error message for non-numeric input', () => {
    const result = validateCommandCount('abc');

    expect(result).toBe('Please enter a valid number');
  });

  it('should return error message for negative number', () => {
    const result = validateCommandCount('-1');

    expect(result).toBe('Please enter a non-negative number');
  });

  it('should return error message for decimal number', () => {
    const result = validateCommandCount('2.5');

    expect(result).toBe('Please enter a whole number');
  });

  it('should return error message for empty input', () => {
    const result = validateCommandCount('');

    expect(result).toBe('Please enter a valid number');
  });
});

describe('promptForCreateSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for name, description, and number of commands', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'New Set', description: 'My new set' })
      .mockResolvedValueOnce({ commandCount: 2 })
      .mockResolvedValueOnce({ command_0: 'sync-hierarchy', description_0: 'Sync hierarchies' })
      .mockResolvedValueOnce({ command_1: 'copy-content-types', description_1: '' });

    const result = await promptForCreateSet([]);

    expect(inquirer.prompt).toHaveBeenCalledTimes(4);
    expect(result.name).toBe('New Set');
    expect(result.description).toBe('My new set');
    expect(result.commands).toHaveLength(2);
    expect(result.commands[0].command).toBe('sync-hierarchy');
    expect(result.commands[0].description).toBe('Sync hierarchies');
    expect(result.commands[1].command).toBe('copy-content-types');
  });

  it('should provide valid command names as choices', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'Test Set', description: '' })
      .mockResolvedValueOnce({ commandCount: 1 })
      .mockResolvedValueOnce({ command_0: 'sync-hierarchy', description_0: '' });

    await promptForCreateSet([]);

    // Check that the third prompt (command selection) was called with list type
    const commandPromptCall = vi.mocked(inquirer.prompt).mock.calls[2][0];
    expect(Array.isArray(commandPromptCall)).toBe(true);

    const commandQuestion = (commandPromptCall as unknown as Array<{ type: string; choices?: string[] }>).find(
      q => q.type === 'list'
    );
    expect(commandQuestion).toBeDefined();
    expect(commandQuestion?.choices).toEqual(expect.arrayContaining([...VALID_COMMAND_NAMES]));
  });

  it('should allow zero commands', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'Empty Set', description: 'No commands yet' })
      .mockResolvedValueOnce({ commandCount: 0 });

    const result = await promptForCreateSet([]);

    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(result.commands).toHaveLength(0);
  });

  it('should trim name and description', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: '  Trimmed Set  ', description: '  Description  ' })
      .mockResolvedValueOnce({ commandCount: 0 });

    const result = await promptForCreateSet([]);

    expect(result.name).toBe('Trimmed Set');
    expect(result.description).toBe('Description');
  });

  it('should pass existing names to validation', async () => {
    const existingNames = ['Existing Set'];
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'New Set', description: '' })
      .mockResolvedValueOnce({ commandCount: 0 });

    await promptForCreateSet(existingNames);

    const firstPromptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const nameQuestion = (firstPromptCall as unknown as Array<{ name: string; validate?: (input: string) => boolean | string }>).find(
      q => q.name === 'name'
    );

    expect(nameQuestion?.validate).toBeDefined();
  });

  it('should omit description field if empty', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'No Description', description: '' })
      .mockResolvedValueOnce({ commandCount: 0 });

    const result = await promptForCreateSet([]);

    expect(result.description).toBeUndefined();
  });

  it('should omit command description if empty', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ name: 'Test', description: '' })
      .mockResolvedValueOnce({ commandCount: 1 })
      .mockResolvedValueOnce({ command_0: 'sync-hierarchy', description_0: '' });

    const result = await promptForCreateSet([]);

    expect(result.commands[0].description).toBeUndefined();
  });
});
