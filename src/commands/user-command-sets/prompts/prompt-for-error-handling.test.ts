import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptForErrorHandling } from './prompt-for-error-handling';

describe('promptForErrorHandling', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn has complex types incompatible with inquirer v10's prompt signature
  let inquirerPromptSpy: any;

  beforeEach(() => {
    inquirerPromptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({ errorChoice: 'continue' } as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
  });

  it('should prompt user for error handling choice', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    const result = await promptForErrorHandling('sync-hierarchy', 'Connection failed');

    expect(inquirerPromptSpy).toHaveBeenCalledTimes(1);
    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'errorChoice',
      }),
    ]);
    expect(result).toBe('continue');
  });

  it('should return "continue" when user selects continue', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    const result = await promptForErrorHandling('sync-hierarchy', 'Error');

    expect(result).toBe('continue');
  });

  it('should return "stop" when user selects stop', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'stop' });

    const result = await promptForErrorHandling('sync-hierarchy', 'Error');

    expect(result).toBe('stop');
  });

  it('should return "retry" when user selects retry', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'retry' });

    const result = await promptForErrorHandling('sync-hierarchy', 'Error');

    expect(result).toBe('retry');
  });

  it('should provide choices for all error handling options', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    await promptForErrorHandling('cmd', 'error');

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'continue' }),
          expect.objectContaining({ value: 'stop' }),
          expect.objectContaining({ value: 'retry' }),
        ]),
      }),
    ]);
  });

  it('should include command name in the message', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    await promptForErrorHandling('sync-hierarchy', 'Connection failed');

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        message: expect.stringContaining('sync-hierarchy'),
      }),
    ]);
  });

  it('should include error message in the prompt message', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    await promptForErrorHandling('sync-hierarchy', 'Connection failed');

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        message: expect.stringContaining('Connection failed'),
      }),
    ]);
  });

  it('should have descriptive labels for each choice', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ errorChoice: 'continue' });

    await promptForErrorHandling('cmd', 'error');

    const callArgs = inquirerPromptSpy.mock.calls[0][0];
    const choices = callArgs[0].choices;

    // Verify choices have descriptive names
    expect(choices.length).toBe(3);
    choices.forEach((choice: { name: string; value: string }) => {
      expect(choice.name).toBeTruthy();
      expect(choice.name).not.toBe(choice.value);
    });
  });

  it('should handle multiple consecutive calls correctly', async () => {
    inquirerPromptSpy
      .mockResolvedValueOnce({ errorChoice: 'continue' })
      .mockResolvedValueOnce({ errorChoice: 'retry' })
      .mockResolvedValueOnce({ errorChoice: 'stop' });

    const result1 = await promptForErrorHandling('cmd1', 'error1');
    const result2 = await promptForErrorHandling('cmd2', 'error2');
    const result3 = await promptForErrorHandling('cmd3', 'error3');

    expect(result1).toBe('continue');
    expect(result2).toBe('retry');
    expect(result3).toBe('stop');
    expect(inquirerPromptSpy).toHaveBeenCalledTimes(3);
  });
});
