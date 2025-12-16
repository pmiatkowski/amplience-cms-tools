import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { promptForMultipleHierarchies } from './prompt-for-multiple-hierarchies';

vi.mock('inquirer');

describe('promptForMultipleHierarchies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockContentItem = (
    deliveryKey: string,
    schemaId: string,
    label: string
  ): Amplience.ContentItem =>
    ({
      id: `item-${deliveryKey}`,
      label,
      body: {
        _meta: {
          deliveryKey,
          schema: schemaId,
        },
      },
    }) as Amplience.ContentItem;

  describe('Select All functionality', () => {
    it('should display "Select All" option at the top', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('nav-footer', 'https://schema.com/navigation', 'Footer Links'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['SELECT_ALL'],
      });

      await promptForMultipleHierarchies(items);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedIds',
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: '✓ Select All',
              value: 'SELECT_ALL',
            }),
          ]),
        }),
      ]);
    });

    it('should return all items when "Select All" is chosen', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('nav-footer', 'https://schema.com/navigation', 'Footer Links'),
        createMockContentItem('cat-products', 'https://schema.com/category', 'Product Categories'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['SELECT_ALL'],
      });

      const result = await promptForMultipleHierarchies(items);

      expect(result).toEqual(items);
      expect(result).toHaveLength(3);
    });
  });

  describe('Individual selection', () => {
    it('should return only selected items when specific items are chosen', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('nav-footer', 'https://schema.com/navigation', 'Footer Links'),
        createMockContentItem('cat-products', 'https://schema.com/category', 'Product Categories'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main', 'item-cat-products'],
      });

      const result = await promptForMultipleHierarchies(items);

      expect(result).toHaveLength(2);
      expect(result[0].body._meta?.deliveryKey).toBe('nav-main');
      expect(result[1].body._meta?.deliveryKey).toBe('cat-products');
    });

    it('should filter out unselected items correctly', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('nav-footer', 'https://schema.com/navigation', 'Footer Links'),
        createMockContentItem('cat-products', 'https://schema.com/category', 'Product Categories'),
        createMockContentItem('blog-main', 'https://schema.com/hierarchy', 'Blog Structure'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-footer'],
      });

      const result = await promptForMultipleHierarchies(items);

      expect(result).toHaveLength(1);
      expect(result[0].body._meta?.deliveryKey).toBe('nav-footer');
    });
  });

  describe('Validation', () => {
    it('should validate at least one item is selected', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main'],
      });

      await promptForMultipleHierarchies(items);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: expect.any(Function),
        }),
      ]);

      // Test the validation function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      const validateFn = promptCall[0].validate;

      expect(validateFn([])).toBe('You must select at least one hierarchy.');
      expect(validateFn(['item-1'])).toBe(true);
    });
  });

  describe('Choice formatting', () => {
    it('should format choices with delivery key and schema ID', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('cat-products', 'https://schema.com/category', 'Product Categories'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main'],
      });

      await promptForMultipleHierarchies(items);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Main Navigation (nav-main) - https://schema.com/navigation',
              value: 'item-nav-main',
            }),
            expect.objectContaining({
              name: 'Product Categories (cat-products) - https://schema.com/category',
              value: 'item-cat-products',
            }),
          ]),
        }),
      ]);
    });

    it('should handle items without delivery keys', async () => {
      const itemWithoutKey = {
        id: 'item-1',
        label: 'Test Item',
        body: {
          _meta: {
            schema: 'https://schema.com/test',
          },
        },
      } as Amplience.ContentItem;

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-1'],
      });

      await promptForMultipleHierarchies([itemWithoutKey]);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Item (no-key) - https://schema.com/test',
              value: 'item-1',
            }),
          ]),
        }),
      ]);
    });

    it('should handle items without schema IDs', async () => {
      const itemWithoutSchema = {
        id: 'item-1',
        label: 'Test Item',
        body: {
          _meta: {
            deliveryKey: 'test-key',
          },
        },
      } as Amplience.ContentItem;

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-1'],
      });

      await promptForMultipleHierarchies([itemWithoutSchema]);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Item (test-key) - no-schema',
              value: 'item-1',
            }),
          ]),
        }),
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty list gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: [],
      });

      const result = await promptForMultipleHierarchies([]);

      expect(result).toEqual([]);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Select hierarchies to synchronize (0 found):',
        }),
      ]);
    });

    it('should handle single item list', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main'],
      });

      const result = await promptForMultipleHierarchies(items);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items[0]);
    });

    it('should include separator after Select All option', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main'],
      });

      await promptForMultipleHierarchies(items);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any;
      const choices = promptCall[0].choices;

      // Check that second item is a separator
      expect(choices[1]).toBeInstanceOf(inquirer.Separator);
    });
  });

  describe('Message formatting', () => {
    it('should display correct count in message', async () => {
      const items = [
        createMockContentItem('nav-main', 'https://schema.com/navigation', 'Main Navigation'),
        createMockContentItem('nav-footer', 'https://schema.com/navigation', 'Footer Links'),
        createMockContentItem('cat-products', 'https://schema.com/category', 'Product Categories'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['item-nav-main'],
      });

      await promptForMultipleHierarchies(items);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Select hierarchies to synchronize (3 found):',
        }),
      ]);
    });
  });
});
