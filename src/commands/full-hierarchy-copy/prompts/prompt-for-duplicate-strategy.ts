import { select } from '@inquirer/prompts';
import type { DuplicateStrategy } from '~/services/actions/duplicate-handler';

/**
 * Prompts the user to select how duplicate content items should be handled
 * when they already exist in the target repository.
 */
export async function promptForDuplicateStrategy(): Promise<DuplicateStrategy> {
  const strategy = await select<DuplicateStrategy>({
    message: 'How should duplicate items be handled?',
    choices: [
      {
        name: 'Skip existing — do not modify, use existing target item for linking',
        value: 'skip',
      },
      {
        name: 'Update existing — overwrite target item body with source item body',
        value: 'update',
      },
      {
        name: 'Rename duplicates — create new item with numeric suffix (e.g., "My Item (1)")',
        value: 'rename',
      },
    ],
    default: 'skip',
  });

  return strategy;
}
