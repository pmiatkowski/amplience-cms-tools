import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promptForDryRun } from './prompt-for-dry-run';

describe('promptForDryRun', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.spyOn has complex types incompatible with inquirer v10's prompt signature
  let inquirerPromptSpy: any;

  beforeEach(() => {
    inquirerPromptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({ dryRun: false } as never);
  });

  afterEach(() => {
    inquirerPromptSpy.mockRestore();
  });

  it('should prompt user for dry-run mode selection', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    const result = await promptForDryRun();

    expect(inquirerPromptSpy).toHaveBeenCalledTimes(1);
    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
        name: 'dryRun',
        message: 'Run in dry-run mode (preview changes without executing)?',
        default: false,
      }),
    ]);
    expect(result).toBe(false);
  });

  it('should return true when user selects dry-run mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: true });

    const result = await promptForDryRun();

    expect(result).toBe(true);
  });

  it('should return false when user does not select dry-run mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    const result = await promptForDryRun();

    expect(result).toBe(false);
  });

  it('should use default value of false for dry-run prompt', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    await promptForDryRun();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        default: false,
      }),
    ]);
  });

  it('should handle multiple consecutive calls correctly', async () => {
    inquirerPromptSpy
      .mockResolvedValueOnce({ dryRun: true })
      .mockResolvedValueOnce({ dryRun: false })
      .mockResolvedValueOnce({ dryRun: true });

    const result1 = await promptForDryRun();
    const result2 = await promptForDryRun();
    const result3 = await promptForDryRun();

    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(result3).toBe(true);
    expect(inquirerPromptSpy).toHaveBeenCalledTimes(3);
  });

  it('should return a boolean value', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: true });

    const result = await promptForDryRun();

    expect(typeof result).toBe('boolean');
  });

  it('should use confirm type for inquirer prompt', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    await promptForDryRun();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
      }),
    ]);
  });

  it('should use "dryRun" as the answer name', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    await promptForDryRun();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'dryRun',
      }),
    ]);
  });

  it('should have clear message explaining dry-run mode', async () => {
    inquirerPromptSpy.mockResolvedValueOnce({ dryRun: false });

    await promptForDryRun();

    expect(inquirerPromptSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Run in dry-run mode (preview changes without executing)?',
      }),
    ]);
  });
});
