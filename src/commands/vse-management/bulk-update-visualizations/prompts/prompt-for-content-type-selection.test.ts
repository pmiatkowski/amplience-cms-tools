import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForContentTypeSelection } from './prompt-for-content-type-selection';

vi.mock('inquirer');

describe('promptForContentTypeSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockContentType = (
    id: string,
    contentTypeUri: string,
    label?: string
  ): Amplience.ContentType => ({
    id,
    hubContentTypeId: `hub-${id}`,
    contentTypeUri,
    status: 'ACTIVE' as Amplience.ContentTypeStatus,
    ...(label ? { settings: { label } } : {}),
  });

  describe('Select All functionality', () => {
    it('should display "Select All" option at the top', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/blog.json', 'Blog Post'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['SELECT_ALL'],
      });

      await promptForContentTypeSelection(contentTypes);

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

    it('should return all content types when "Select All" is chosen', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/blog.json', 'Blog Post'),
        createMockContentType('3', 'https://schema.example.com/product.json', 'Product'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['SELECT_ALL'],
      });

      const result = await promptForContentTypeSelection(contentTypes);

      expect(result).toEqual(contentTypes);
      expect(result).toHaveLength(3);
    });
  });

  describe('Individual selection', () => {
    it('should return only selected content types when specific types are chosen', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/blog.json', 'Blog Post'),
        createMockContentType('3', 'https://schema.example.com/product.json', 'Product'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1', '3'],
      });

      const result = await promptForContentTypeSelection(contentTypes);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should filter out unselected content types correctly', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/blog.json', 'Blog Post'),
        createMockContentType('3', 'https://schema.example.com/product.json', 'Product'),
        createMockContentType('4', 'https://schema.example.com/banner.json', 'Banner'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['2'],
      });

      const result = await promptForContentTypeSelection(contentTypes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('Validation', () => {
    it('should validate at least one content type is selected', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection(contentTypes);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: expect.any(Function),
        }),
      ]);

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as ReadonlyArray<{
        type: string;
        name: string;
        choices: unknown;
        validate?: (answer: unknown) => boolean | string;
      }>;
      const validateFn = promptCall[0].validate;

      expect(validateFn?.([])).toBe('You must select at least one content type.');
      expect(validateFn?.(['1'])).toBe(true);
    });
  });

  describe('Choice formatting', () => {
    it('should format choices with label and contentTypeUri in format: [label] (contentTypeUri)', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/product.json', 'Product'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection(contentTypes);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Article (https://schema.example.com/article.json)',
              value: '1',
            }),
            expect.objectContaining({
              name: 'Product (https://schema.example.com/product.json)',
              value: '2',
            }),
          ]),
        }),
      ]);
    });

    it('should use contentTypeUri as label when settings.label is not available', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json'), // No label
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection(contentTypes);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'https://schema.example.com/article.json (https://schema.example.com/article.json)',
              value: '1',
            }),
          ]),
        }),
      ]);
    });

    it('should handle content types with empty label', async () => {
      const contentType = createMockContentType('1', 'https://schema.example.com/article.json', '');

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection([contentType]);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'https://schema.example.com/article.json (https://schema.example.com/article.json)',
              value: '1',
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

      const result = await promptForContentTypeSelection([]);

      expect(result).toEqual([]);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Select content types to update (0 found):',
        }),
      ]);
    });

    it('should handle single content type list', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      const result = await promptForContentTypeSelection(contentTypes);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(contentTypes[0]);
    });

    it('should include separator after Select All option', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection(contentTypes);

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as ReadonlyArray<{
        type: string;
        name: string;
        choices: unknown;
        validate?: (answer: unknown) => boolean | string;
      }>;
      const choices = promptCall[0].choices as unknown[];

      // Check that second item is a separator
      expect(choices[1]).toBeInstanceOf(inquirer.Separator);
    });
  });

  describe('Message formatting', () => {
    it('should display correct count in message', async () => {
      const contentTypes = [
        createMockContentType('1', 'https://schema.example.com/article.json', 'Article'),
        createMockContentType('2', 'https://schema.example.com/blog.json', 'Blog Post'),
        createMockContentType('3', 'https://schema.example.com/product.json', 'Product'),
      ];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedIds: ['1'],
      });

      await promptForContentTypeSelection(contentTypes);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Select content types to update (3 found):',
        }),
      ]);
    });
  });
});
