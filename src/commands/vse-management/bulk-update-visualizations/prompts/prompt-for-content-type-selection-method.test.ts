import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForContentTypeSelectionMethod } from './prompt-for-content-type-selection-method';

vi.mock('inquirer');

describe('promptForContentTypeSelectionMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prompt user to select content type selection method', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'api',
    });

    await promptForContentTypeSelectionMethod();

    expect(inquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to select content types?',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: 'API - Filter content types using regex pattern',
            value: 'api',
          }),
          expect.objectContaining({
            name: 'File - Load content types from JSON file',
            value: 'file',
          }),
        ]),
      },
    ]);
  });

  it('should return "api" when API method is selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'api',
    });

    const result = await promptForContentTypeSelectionMethod();

    expect(result).toBe('api');
  });

  it('should return "file" when File method is selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'file',
    });

    const result = await promptForContentTypeSelectionMethod();

    expect(result).toBe('file');
  });

  it('should include correct prompt message', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'api',
    });

    await promptForContentTypeSelectionMethod();

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'How would you like to select content types?',
        }),
      ])
    );
  });

  it('should use list type for prompt', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'api',
    });

    await promptForContentTypeSelectionMethod();

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'list',
        }),
      ])
    );
  });

  it('should have exactly two choices', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      method: 'api',
    });

    await promptForContentTypeSelectionMethod();

    const callArgs = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as ReadonlyArray<{
      type: string;
      name: string;
      choices: unknown[];
    }>;
    expect(callArgs[0].choices).toHaveLength(2);
  });
});
