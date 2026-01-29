import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptForStepByStepContinue } from './prompt-for-step-by-step-continue';

describe('promptForStepByStepContinue', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn has complex types incompatible with inquirer v10's prompt signature
  let inquirerPromptSpy: any;

  beforeEach(() => {
    inquirerPromptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({ stepChoice: 'continue' } as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
  });

  it('should prompt user to continue or stop', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    const result = await promptForStepByStepContinue('cmd-1', 0, 3);

    expect(inquirerPromptSpy).toHaveBeenCalledTimes(1);
    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'stepChoice',
      }),
    ]);
    expect(result).toBe('continue');
  });

  it('should return "continue" when user selects continue', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    const result = await promptForStepByStepContinue('cmd-1', 0, 3);

    expect(result).toBe('continue');
  });

  it('should return "stop" when user selects stop', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'stop' });

    const result = await promptForStepByStepContinue('cmd-1', 0, 3);

    expect(result).toBe('stop');
  });

  it('should show completed command name in message', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    await promptForStepByStepContinue('sync-hierarchy', 1, 5);

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        message: expect.stringContaining('sync-hierarchy'),
      }),
    ]);
  });

  it('should show progress (current/total) in message', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    await promptForStepByStepContinue('cmd', 2, 5);

    const callArgs = inquirerPromptSpy.mock.calls[0][0];
    const message = callArgs[0].message;

    // Should show something like "3 of 5" (index is 0-based, so currentIndex + 1)
    expect(message).toMatch(/3.*5|3\/5/);
  });

  it('should provide choices for continue and stop', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    await promptForStepByStepContinue('cmd', 0, 3);

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'continue' }),
          expect.objectContaining({ value: 'stop' }),
        ]),
      }),
    ]);
  });

  it('should have descriptive labels for each choice', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ stepChoice: 'continue' });

    await promptForStepByStepContinue('cmd', 0, 3);

    const callArgs = inquirerPromptSpy.mock.calls[0][0];
    const choices = callArgs[0].choices;

    // Verify choices have descriptive names
    expect(choices.length).toBe(2);
    choices.forEach((choice: { name: string; value: string }) => {
      expect(choice.name).toBeTruthy();
      expect(choice.name).not.toBe(choice.value);
    });
  });

  it('should handle multiple consecutive calls correctly', async () => {
    inquirerPromptSpy
      .mockResolvedValueOnce({ stepChoice: 'continue' })
      .mockResolvedValueOnce({ stepChoice: 'continue' })
      .mockResolvedValueOnce({ stepChoice: 'stop' });

    const result1 = await promptForStepByStepContinue('cmd-1', 0, 3);
    const result2 = await promptForStepByStepContinue('cmd-2', 1, 3);
    const result3 = await promptForStepByStepContinue('cmd-3', 2, 3);

    expect(result1).toBe('continue');
    expect(result2).toBe('continue');
    expect(result3).toBe('stop');
    expect(inquirerPromptSpy).toHaveBeenCalledTimes(3);
  });
});
