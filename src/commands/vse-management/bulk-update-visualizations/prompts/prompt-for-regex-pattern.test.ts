import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as envValidator from '~/utils/env-validator';
import { promptForRegexPattern } from './prompt-for-regex-pattern';

vi.mock('inquirer');
vi.mock('~/utils/env-validator');

describe('promptForRegexPattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user for regex pattern with default from environment', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue('https://schema\\.example\\.com/.*');
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: 'https://schema\\.example\\.com/.*',
    });

    await promptForRegexPattern();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'input',
        name: 'pattern',
        message: 'Enter regex pattern to filter content types:',
        default: 'https://schema\\.example\\.com/.*',
      },
    ]);
  });

  it('should return the entered pattern', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: 'my-custom-pattern',
    });

    const result = await promptForRegexPattern();

    expect(result).toBe('my-custom-pattern');
  });

  it('should use empty string default when environment variable is not set', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: '',
    });

    await promptForRegexPattern();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        default: '',
      }),
    ]);
  });

  it('should use input type for prompt', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: 'test',
    });

    await promptForRegexPattern();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
      }),
    ]);
  });

  it('should include correct prompt message', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: 'test',
    });

    await promptForRegexPattern();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Enter regex pattern to filter content types:',
      }),
    ]);
  });

  it('should call getDefaultSchemaIdPattern to retrieve default value', async () => {
    vi.mocked(envValidator.getDefaultSchemaIdPattern).mockReturnValue('default-pattern');
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      pattern: 'default-pattern',
    });

    await promptForRegexPattern();

    expect(envValidator.getDefaultSchemaIdPattern).toHaveBeenCalledOnce();
  });
});
