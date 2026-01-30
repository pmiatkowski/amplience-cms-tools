import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptForCreateExampleFile } from './prompt-for-create-example-file';

vi.mock('inquirer');

describe('promptForCreateExampleFile', () => {
  const configPath = '/custom/path/command-sets.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when user confirms', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ createExample: true });

    const result = await promptForCreateExampleFile(configPath);

    expect(result).toBe(true);
  });

  it('should return false when user declines', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ createExample: false });

    const result = await promptForCreateExampleFile(configPath);

    expect(result).toBe(false);
  });

  it('should include the config path in the prompt message', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ createExample: false });

    await promptForCreateExampleFile(configPath);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ message?: string }>)[0];

    expect(question.message).toContain(configPath);
  });

  it('should default to true', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ createExample: false });

    await promptForCreateExampleFile(configPath);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ default?: boolean }>)[0];

    expect(question.default).toBe(true);
  });

  it('should use confirm type and createExample name', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ createExample: true });

    await promptForCreateExampleFile(configPath);

    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0];
    const question = (promptCall as unknown as Array<{ type?: string; name?: string }>)[0];

    expect(question.type).toBe('confirm');
    expect(question.name).toBe('createExample');
  });
});
