import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as envValidator from '~/utils/env-validator';
import { promptForVisualizationConfigFile } from './prompt-for-visualization-config-file';

vi.mock('inquirer');
vi.mock('~/utils/env-validator');

describe('promptForVisualizationConfigFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user for file path with default from environment', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(
      './config/visualizations.json'
    );
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './config/visualizations.json',
    });

    await promptForVisualizationConfigFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter path to visualization config JSON file:',
        default: './config/visualizations.json',
      },
    ]);
  });

  it('should return the entered file path', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './my-custom-visualizations.json',
    });

    const result = await promptForVisualizationConfigFile();

    expect(result).toBe('./my-custom-visualizations.json');
  });

  it('should use empty string default when environment variable is not set', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: '',
    });

    await promptForVisualizationConfigFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        default: '',
      }),
    ]);
  });

  it('should use input type for prompt', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: 'test.json',
    });

    await promptForVisualizationConfigFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
      }),
    ]);
  });

  it('should include correct prompt message', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(undefined);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: 'test.json',
    });

    await promptForVisualizationConfigFile();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Enter path to visualization config JSON file:',
      }),
    ]);
  });

  it('should call getDefaultVisualizationConfigFilePath to retrieve default value', async () => {
    vi.mocked(envValidator.getDefaultVisualizationConfigFilePath).mockReturnValue(
      './default-visualizations.json'
    );
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      filePath: './default-visualizations.json',
    });

    await promptForVisualizationConfigFile();

    expect(envValidator.getDefaultVisualizationConfigFilePath).toHaveBeenCalledOnce();
  });
});
