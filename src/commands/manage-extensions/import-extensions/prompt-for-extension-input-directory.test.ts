import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_EXTENSION_INPUT_DIRECTORY,
  promptForExtensionInputDirectory,
} from './prompt-for-extension-input-directory';

vi.mock('inquirer');

describe('promptForExtensionInputDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt for source directory with default value', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: './extensions' });

    await promptForExtensionInputDirectory();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
        name: 'sourceDir',
        message: expect.stringContaining('import'),
        default: DEFAULT_EXTENSION_INPUT_DIRECTORY,
      }),
    ]);
  });

  it('should return user-provided directory', async () => {
    const customPath = './custom/path/extensions';
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: customPath });

    const result = await promptForExtensionInputDirectory();

    expect(result).toBe(customPath);
  });

  it('should use custom default path when provided', async () => {
    const customDefault = './my-extensions';
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: customDefault });

    await promptForExtensionInputDirectory(customDefault);

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        default: customDefault,
      }),
    ]);
  });

  it('should validate that input is not empty', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: './extensions' });

    await promptForExtensionInputDirectory();

    // Verify validation is configured (implementation detail test)
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        validate: expect.any(Function),
      }),
    ]);
  });

  it('should normalize whitespace in returned path', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: '  ./extensions  ' });

    const result = await promptForExtensionInputDirectory();

    expect(result).toBe('./extensions');
  });

  it('should return default path when input is empty after trim', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ sourceDir: '   ' });

    const result = await promptForExtensionInputDirectory();

    expect(result).toBe(DEFAULT_EXTENSION_INPUT_DIRECTORY);
  });
});
