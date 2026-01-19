import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as envValidator from '~/utils/env-validator';
import { promptForContentTypesFile } from './prompt-for-content-types-file';

vi.mock('inquirer');
vi.mock('~/utils/env-validator');

describe('promptForContentTypesFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user for file path with default from environment', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue(
      './config/content-types.json'
    );
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './config/content-types.json',
    });

    await promptForContentTypesFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter path to content types list JSON file:',
        default: './config/content-types.json',
      },
    ]);
  });

  it('should return the entered file path', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './my-custom-file.json',
    });

    const result = await promptForContentTypesFile();

    expect(result).toBe('./my-custom-file.json');
  });

  it('should use empty string default when environment variable is not set', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: '',
    });

    await promptForContentTypesFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        default: '',
      }),
    ]);
  });

  it('should use input type for prompt', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: 'test.json',
    });

    await promptForContentTypesFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
      }),
    ]);
  });

  it('should include correct prompt message', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: 'test.json',
    });

    await promptForContentTypesFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Enter path to content types list JSON file:',
      }),
    ]);
  });

  it('should call getDefaultContentTypesListFilePath to retrieve default value', async () => {
    vi.mocked(envValidator.getDefaultContentTypesListFilePath).mockReturnValue('./default.json');
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './default.json',
    });

    await promptForContentTypesFile();

    expect(envValidator.getDefaultContentTypesListFilePath).toHaveBeenCalledOnce();
  });
});
