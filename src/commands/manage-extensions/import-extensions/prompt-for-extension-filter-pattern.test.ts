import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_EXTENSION_FILTER_PATTERN,
  promptForExtensionFilterPattern,
} from './prompt-for-extension-filter-pattern';

vi.mock('inquirer');

describe('promptForExtensionFilterPattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for filter pattern with default value', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: '.*' });

    await promptForExtensionFilterPattern();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
        name: 'pattern',
        message: expect.stringContaining('filter'),
        default: DEFAULT_EXTENSION_FILTER_PATTERN,
      }),
    ]);
  });

  it('should return user-provided pattern', async () => {
    const customPattern = 'my-extension-.*';
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: customPattern });

    const result = await promptForExtensionFilterPattern();

    expect(result).toBe(customPattern);
  });

  it('should use custom default pattern when provided', async () => {
    const customDefault = 'test-.*';
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: customDefault });

    await promptForExtensionFilterPattern(customDefault);

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        default: customDefault,
      }),
    ]);
  });

  it('should validate that input is not empty', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: '.*' });

    await promptForExtensionFilterPattern();

    // Verify validation is configured
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        validate: expect.any(Function),
      }),
    ]);
  });

  it('should normalize whitespace in returned pattern', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: '  my-extension-.*  ' });

    const result = await promptForExtensionFilterPattern();

    expect(result).toBe('my-extension-.*');
  });

  it('should return default pattern when input is empty after trim', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: '   ' });

    const result = await promptForExtensionFilterPattern();

    expect(result).toBe(DEFAULT_EXTENSION_FILTER_PATTERN);
  });

  it('should allow empty string to match all extensions', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ pattern: '' });

    const result = await promptForExtensionFilterPattern();

    // Empty pattern should default to matching all
    expect(result).toBe(DEFAULT_EXTENSION_FILTER_PATTERN);
  });
});
