import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForVseOperation } from './prompt-for-vse-operation';

vi.mock('inquirer');

describe('promptForVseOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user to select a VSE operation', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      operation: 'bulk-update-visualizations',
    });

    await promptForVseOperation();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'list',
        name: 'operation',
        message: 'Select a VSE operation:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: 'Bulk Update Visualizations (update visualization config for multiple content types)',
            value: 'bulk-update-visualizations',
          }),
        ]),
      },
    ]);
  });

  it('should return bulk-update-visualizations when selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      operation: 'bulk-update-visualizations',
    });

    const result = await promptForVseOperation();

    expect(result).toBe('bulk-update-visualizations');
  });

  it('should include correct prompt message', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      operation: 'bulk-update-visualizations',
    });

    await promptForVseOperation();

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Select a VSE operation:',
        }),
      ])
    );
  });

  it('should use list type for prompt', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      operation: 'bulk-update-visualizations',
    });

    await promptForVseOperation();

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'list',
        }),
      ])
    );
  });
});
