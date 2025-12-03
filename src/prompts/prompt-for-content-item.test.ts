import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptForContentItem } from './prompt-for-content-item';

vi.mock('inquirer');

describe('promptForContentItem', () => {
  let mockService: {
    getContentItemsBy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockService = {
      getContentItemsBy: vi.fn(),
    };
  });

  describe('filter prompting', () => {
    it('should prompt for schema ID, label, and delivery key filters', async () => {
      const mockContentItem = createMockContentItem();

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            name: 'schemaId',
            message: 'Filter by schema ID (leave blank for any):',
          }),
          expect.objectContaining({
            type: 'input',
            name: 'label',
            message: 'Filter by label (partial match, leave blank for any):',
          }),
          expect.objectContaining({
            type: 'input',
            name: 'deliveryKey',
            message: 'Filter by delivery key (partial match, leave blank for any):',
          }),
        ])
      );
    });

    it('should use default delivery key when provided in defaults parameter', async () => {
      const mockContentItem = createMockContentItem();
      const defaultDeliveryKey = 'default-key';

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: defaultDeliveryKey,
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id', {
        deliveryKey: defaultDeliveryKey,
      });

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'deliveryKey',
            default: defaultDeliveryKey,
          }),
        ])
      );
    });

    it('should use empty string default when no defaults provided', async () => {
      const mockContentItem = createMockContentItem();

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'deliveryKey',
            default: '',
          }),
        ])
      );
    });

    it('should use empty string default when defaults object is provided without deliveryKey', async () => {
      const mockContentItem = createMockContentItem();

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id', {});

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'deliveryKey',
            default: '',
          }),
        ])
      );
    });
  });

  describe('content item retrieval', () => {
    it('should call getContentItemsBy with filter parameters', async () => {
      const mockContentItem = createMockContentItem();
      const filters = {
        schemaId: 'test-schema',
        label: 'test-label',
        deliveryKey: 'test-key',
      };

      vi.mocked(inquirer.prompt).mockResolvedValueOnce(filters);

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(mockService.getContentItemsBy).toHaveBeenCalledWith(
        'test-repo-id',
        filters.schemaId,
        filters.label,
        filters.deliveryKey
      );
    });

    it('should convert empty string filters to undefined', async () => {
      const mockContentItem = createMockContentItem();

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [mockContentItem],
        filteredItems: [mockContentItem],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(mockService.getContentItemsBy).toHaveBeenCalledWith(
        'test-repo-id',
        undefined,
        undefined,
        undefined
      );
    });

    it('should return null when no items found', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [],
        filteredItems: [],
      });

      const result = await promptForContentItem(mockService, 'test-repo-id');

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('No content items found matching the criteria.');
    });

    it('should return null when too many items found (over 100)', async () => {
      const manyItems = Array.from({ length: 101 }, (_, i) =>
        createMockContentItem({ id: `item-${i}` })
      );

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: manyItems,
        filteredItems: manyItems,
      });

      const result = await promptForContentItem(mockService, 'test-repo-id');

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        'Found 101 items. Please refine your search criteria.'
      );
    });
  });

  describe('item selection', () => {
    it('should prompt user to select from filtered items', async () => {
      const item1 = createMockContentItem({
        id: 'item-1',
        label: 'Item 1',
        body: {
          _meta: {
            deliveryKey: 'key-1',
            schema: 'schema-1',
          },
        },
      });

      const item2 = createMockContentItem({
        id: 'item-2',
        label: 'Item 2',
        body: {
          _meta: {
            deliveryKey: 'key-2',
            schema: 'schema-2',
          },
        },
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [item1, item2],
        filteredItems: [item1, item2],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: item1,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        2,
        expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            name: 'selectedItem',
            message: 'Select a content item:',
            choices: expect.arrayContaining([
              expect.objectContaining({
                name: 'Item 1 (key-1) - schema-1',
                value: item1,
              }),
              expect.objectContaining({
                name: 'Item 2 (key-2) - schema-2',
                value: item2,
              }),
            ]),
          }),
        ])
      );
    });

    it('should handle items without delivery key or schema', async () => {
      const itemWithoutMeta = createMockContentItem({
        id: 'item-1',
        label: 'Item Without Meta',
        body: {},
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems: [itemWithoutMeta],
        filteredItems: [itemWithoutMeta],
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: itemWithoutMeta,
      });

      await promptForContentItem(mockService, 'test-repo-id');

      expect(inquirer.prompt).toHaveBeenNthCalledWith(
        2,
        expect.arrayContaining([
          expect.objectContaining({
            choices: expect.arrayContaining([
              expect.objectContaining({
                name: 'Item Without Meta (no-key) - no-schema',
                value: itemWithoutMeta,
              }),
            ]),
          }),
        ])
      );
    });

    it('should return selected item with all items and filtered items', async () => {
      const mockContentItem = createMockContentItem();
      const allItems = [mockContentItem, createMockContentItem({ id: 'item-2' })];
      const filteredItems = [mockContentItem];

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockResolvedValue({
        allItems,
        filteredItems,
      });

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        selectedItem: mockContentItem,
      });

      const result = await promptForContentItem(mockService, 'test-repo-id');

      expect(result).toEqual({
        selectedItem: mockContentItem,
        allItems,
        filteredItems,
      });
    });
  });

  describe('error handling', () => {
    it('should return null and log error when getContentItemsBy fails', async () => {
      const error = new Error('API Error');

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        schemaId: '',
        label: '',
        deliveryKey: '',
      });

      mockService.getContentItemsBy.mockRejectedValue(error);

      const result = await promptForContentItem(mockService, 'test-repo-id');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error searching for content items:', error);
    });
  });
});

function createMockContentItem(overrides?: Partial<Amplience.ContentItem>): Amplience.ContentItem {
  return {
    id: 'test-item-id',
    label: 'Test Item',
    schemaId: 'test-schema',
    version: 1,
    body: {
      _meta: {
        name: 'test-item',
        schema: 'test-schema',
        deliveryKey: 'test-key',
      },
    },
    ...overrides,
  } as Amplience.ContentItem;
}
