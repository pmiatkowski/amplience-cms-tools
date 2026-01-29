import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptForExecutionMode } from './prompt-for-execution-mode';

describe('promptForExecutionMode', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn has complex types incompatible with inquirer v10's prompt signature
  let inquirerPromptSpy: any;

  beforeEach(() => {
    inquirerPromptSpy = vi
      .spyOn(inquirer, 'prompt')
      .mockResolvedValue({ executionMode: 'run-all' } as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
  });

  it('should prompt user for execution mode selection', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    const result = await promptForExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledTimes(1);
    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'executionMode',
        message: expect.stringContaining('execute'),
      }),
    ]);
    expect(result).toBe('run-all');
  });

  it('should return "run-all" when user selects run all mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    const result = await promptForExecutionMode();

    expect(result).toBe('run-all');
  });

  it('should return "step-by-step" when user selects step-by-step mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'step-by-step' });

    const result = await promptForExecutionMode();

    expect(result).toBe('step-by-step');
  });

  it('should provide choices for both execution modes', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    await promptForExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'run-all' }),
          expect.objectContaining({ value: 'step-by-step' }),
        ]),
      }),
    ]);
  });

  it('should use list type for inquirer prompt', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    await promptForExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
      }),
    ]);
  });

  it('should use "executionMode" as the answer name', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'step-by-step' });

    await promptForExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'executionMode',
      }),
    ]);
  });

  it('should have descriptive labels for each choice', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    await promptForExecutionMode();

    const callArgs = inquirerPromptSpy.mock.calls[0][0];
    const choices = callArgs[0].choices;

    // Verify choices have descriptive names
    expect(choices[0].name).toBeTruthy();
    expect(choices[1].name).toBeTruthy();
    expect(choices[0].name).not.toBe(choices[0].value);
    expect(choices[1].name).not.toBe(choices[1].value);
  });

  it('should handle multiple consecutive calls correctly', async () => {
    inquirerPromptSpy
      .mockResolvedValueOnce({ executionMode: 'run-all' })
      .mockResolvedValueOnce({ executionMode: 'step-by-step' })
      .mockResolvedValueOnce({ executionMode: 'run-all' });

    const result1 = await promptForExecutionMode();
    const result2 = await promptForExecutionMode();
    const result3 = await promptForExecutionMode();

    expect(result1).toBe('run-all');
    expect(result2).toBe('step-by-step');
    expect(result3).toBe('run-all');
    expect(inquirerPromptSpy).toHaveBeenCalledTimes(3);
  });
});
