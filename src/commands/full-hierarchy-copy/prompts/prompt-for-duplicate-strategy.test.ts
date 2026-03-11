import { select } from '@inquirer/prompts';
import { describe, it, expect, vi } from 'vitest';

import { promptForDuplicateStrategy } from './prompt-for-duplicate-strategy';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('promptForDuplicateStrategy', () => {
  it('should return selected strategy', async () => {
    vi.mocked(select).mockResolvedValue('update');

    const result = await promptForDuplicateStrategy();
    expect(result).toBe('update');
  });

  it('should present three strategy options', async () => {
    vi.mocked(select).mockResolvedValue('skip');

    await promptForDuplicateStrategy();

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'skip' }),
          expect.objectContaining({ value: 'update' }),
          expect.objectContaining({ value: 'rename' }),
        ]),
      })
    );
  });
});
