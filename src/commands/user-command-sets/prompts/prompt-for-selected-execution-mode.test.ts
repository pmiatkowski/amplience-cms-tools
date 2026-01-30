import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptForSelectedExecutionMode } from './prompt-for-selected-execution-mode';

describe('promptForSelectedExecutionMode', () => {
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

  it('should prompt user for selected execution mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    const result = await promptForSelectedExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledTimes(1);
    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'executionMode',
        message: expect.stringContaining('selected'),
      }),
    ]);
    expect(result).toBe('run-all');
  });

  it('should return "run-all" when user selects run selected mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    const result = await promptForSelectedExecutionMode();

    expect(result).toBe('run-all');
  });

  it('should return "step-by-step" when user selects step-by-step selected mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'step-by-step' });

    const result = await promptForSelectedExecutionMode();

    expect(result).toBe('step-by-step');
  });

  it('should provide choices for selected execution modes', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ executionMode: 'run-all' });

    await promptForSelectedExecutionMode();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'run-all' }),
          expect.objectContaining({ value: 'step-by-step' }),
        ]),
      }),
    ]);
  });
});
