/**
 * Tests for Content Reference Discovery Service
 */
import { describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import {
  isContentReference,
  scanBodyForReferences,
  scanContentItem,
  batchFetchItems,
  discoverAllReferences,
  getMissingReferenceIds,
} from './content-reference-discovery';
import type { ReferenceScanResult } from './types';

// Helper function to create a mock content item
function createMockContentItem(
  id: string,
  body: Record<string, unknown> = {}
): Amplience.ContentItemWithDetails {
  return {
    id,
    label: `Item ${id}`,
    schemaId: 'https://schema.example.com/test',
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2024-01-01T00:00:00Z',
    lastModifiedDate: '2024-01-01T00:00:00Z',
    version: 1,
    deliveryId: `delivery-${id}`,
    validationState: 'VALID',
    contentRepositoryId: 'repo-123',
    createdBy: 'user',
    lastModifiedBy: 'user',
    body,
  };
}

describe('isContentReference', () => {
  it('should return true for valid content-reference objects', () => {
    const ref = {
      id: 'uuid-123',
      contentType: 'https://schema.example.com/test',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };
    expect(isContentReference(ref)).toBe(true);
  });

  it('should return true for valid content-link objects', () => {
    const ref = {
      id: 'uuid-456',
      contentType: 'https://schema.example.com/test',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link',
      },
    };
    expect(isContentReference(ref)).toBe(true);
  });

  it('should return false for inline content without id', () => {
    const inline = {
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
      someField: 'value',
    };
    expect(isContentReference(inline)).toBe(false);
  });

  it('should return false for inline content with id but no contentType', () => {
    const inline = {
      id: 'uuid-789',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };
    expect(isContentReference(inline)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isContentReference(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isContentReference(undefined)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isContentReference('string')).toBe(false);
    expect(isContentReference(123)).toBe(false);
    expect(isContentReference(true)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isContentReference({})).toBe(false);
  });

  it('should return false for object with wrong schema type', () => {
    const obj = {
      id: 'uuid-123',
      contentType: 'https://schema.example.com/test',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/other-type',
      },
    };
    expect(isContentReference(obj)).toBe(false);
  });

  it('should match schema variations using includes', () => {
    // Test that schema matching uses includes() to handle variations
    const ref1 = {
      id: 'uuid-123',
      contentType: 'https://schema.example.com/test',
      _meta: {
        schema: 'https://some-other-prefix/content-reference/something',
      },
    };
    expect(isContentReference(ref1)).toBe(true);

    const ref2 = {
      id: 'uuid-456',
      contentType: 'https://schema.example.com/test',
      _meta: {
        schema: 'prefix-content-link-suffix',
      },
    };
    expect(isContentReference(ref2)).toBe(true);
  });
});

describe('scanBodyForReferences', () => {
  it('should find single reference at root level', () => {
    const body = {
      _meta: { name: 'test' },
      ref: {
        id: 'ref-1',
        contentType: 'https://schema.example.com/linked',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
      },
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-1');
    expect(refs[0].contentType).toBe('https://schema.example.com/linked');
    expect(refs[0].path).toBe('body.ref');
    expect(refs[0].isArrayElement).toBe(false);
  });

  it('should find references in nested objects', () => {
    const body = {
      component: {
        image: {
          id: 'ref-2',
          contentType: 'https://schema.example.com/image',
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
        },
      },
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-2');
    expect(refs[0].contentType).toBe('https://schema.example.com/image');
    expect(refs[0].path).toBe('body.component.image');
  });

  it('should find references in arrays', () => {
    const body = {
      items: [
        {
          id: 'ref-1',
          contentType: 'https://schema.example.com/item',
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
        },
        {
          id: 'ref-2',
          contentType: 'https://schema.example.com/item',
          _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
        },
      ],
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(2);
    expect(refs[0].sourceId).toBe('ref-1');
    expect(refs[0].contentType).toBe('https://schema.example.com/item');
    expect(refs[0].isArrayElement).toBe(true);
    expect(refs[0].path).toBe('body.items[0]');
    expect(refs[1].sourceId).toBe('ref-2');
    expect(refs[1].isArrayElement).toBe(true);
    expect(refs[1].path).toBe('body.items[1]');
  });

  it('should track correct JSON paths', () => {
    const body = {
      level1: {
        level2: {
          level3: {
            deepRef: {
              id: 'ref-deep',
              contentType: 'https://schema.example.com/deep',
              _meta: {
                schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
              },
            },
          },
        },
      },
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-deep');
    expect(refs[0].path).toBe('body.level1.level2.level3.deepRef');
  });

  it('should handle empty body', () => {
    const body = {};
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(0);
  });

  it('should skip inline content', () => {
    const body = {
      inline: {
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
        someData: 'value',
      },
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(0);
  });

  it('should handle mixed inline and reference arrays', () => {
    const body = {
      items: [
        {
          // Inline content - has _meta.schema but no id
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
          title: 'Inline Item',
        },
        {
          // Reference - has id and contentType
          id: 'ref-1',
          contentType: 'https://schema.example.com/ref',
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
        },
        {
          // Another inline content - no id or contentType
          _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
          description: 'Another inline',
        },
      ],
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-1');
  });

  it('should handle null values gracefully', () => {
    const body = {
      nullField: null,
      undefinedField: undefined,
      validRef: {
        id: 'ref-1',
        contentType: 'https://schema.example.com/test',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-1');
  });

  it('should handle empty arrays', () => {
    const body = {
      emptyArray: [],
      refArray: [
        {
          id: 'ref-1',
          contentType: 'https://schema.example.com/test',
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
        },
      ],
    };
    const refs = scanBodyForReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ref-1');
  });

  it('should not modify original body object', () => {
    const body = {
      ref: {
        id: 'ref-1',
        contentType: 'https://schema.example.com/test',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    };
    const originalBody = JSON.parse(JSON.stringify(body));
    scanBodyForReferences(body);
    expect(body).toEqual(originalBody);
  });
});

describe('scanContentItem', () => {
  it('should return scan result with deduplicated IDs', () => {
    const item = createMockContentItem('item-1', {
      ref1: {
        id: 'ref-1',
        contentType: 'https://schema.example.com/ref1',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
      ref2: {
        id: 'ref-2',
        contentType: 'https://schema.example.com/ref2',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
      },
    });
    const result = scanContentItem(item);
    expect(result.sourceItemId).toBe('item-1');
    expect(result.references).toHaveLength(2);
    expect(result.referencedItemIds).toEqual(['ref-1', 'ref-2']);
  });

  it('should handle item with no references', () => {
    const item = createMockContentItem('item-1', {
      _meta: { name: 'test' },
      title: 'No references here',
    });
    const result = scanContentItem(item);
    expect(result.sourceItemId).toBe('item-1');
    expect(result.references).toHaveLength(0);
    expect(result.referencedItemIds).toHaveLength(0);
  });

  it('should handle item with multiple references to same item', () => {
    const item = createMockContentItem('item-1', {
      primary: {
        id: 'shared-ref',
        contentType: 'https://schema.example.com/ref',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
      secondary: {
        id: 'shared-ref',
        contentType: 'https://schema.example.com/ref',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    const result = scanContentItem(item);
    expect(result.referencedItemIds).toHaveLength(1);
    expect(result.referencedItemIds[0]).toBe('shared-ref');
    expect(result.references).toHaveLength(2);
  });
});

describe('batchFetchItems', () => {
  it('should fetch multiple items in parallel', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    const item1 = createMockContentItem('item-1', { title: 'Item 1' });
    const item2 = createMockContentItem('item-2', { title: 'Item 2' });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }
      if (id === 'item-2') {
        return item2;
      }

      return null;
    });
    const result = await batchFetchItems(mockService, ['item-1', 'item-2']);
    expect(result.size).toBe(2);
    expect(result.get('item-1')).toEqual(item1);
    expect(result.get('item-2')).toEqual(item2);
  });

  it('should return empty map for empty input', async () => {
    const mockService = {} as unknown as AmplienceService;
    const result = await batchFetchItems(mockService, []);
    expect(result.size).toBe(0);
  });

  it('should handle partial failures gracefully', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    const item1 = createMockContentItem('item-1', { title: 'Item 1' });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }

      return null;
    });
    const result = await batchFetchItems(mockService, ['item-1', 'item-missing']);
    expect(result.size).toBe(1);
    expect(result.get('item-1')).toEqual(item1);
    expect(result.has('item-missing')).toBe(false);
  });

  it('should respect batch size parameter', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    const items = Array.from({ length: 25 }, (_, i) =>
      createMockContentItem(`item-${i}`, { title: `Item ${i}` })
    );
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      const item = items.find(item => item.id === id);
      if (item) {
        return item;
      }

      return null;
    });
    const ids = items.map(item => item.id);
    const result = await batchFetchItems(mockService, ids, 5);
    expect(result.size).toBe(25);
    expect(mockService.getContentItemWithDetails).toHaveBeenCalledTimes(25);
  });
});

describe('discoverAllReferences', () => {
  it('should recursively discover nested references', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    // item1 -> references item2
    const item1 = createMockContentItem('item-1', {
      nested: {
        id: 'item-2',
        contentType: 'https://schema.example.com/ref2',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    // item2 -> references item3
    const item2 = createMockContentItem('item-2', {
      nested: {
        id: 'item-3',
        contentType: 'https://schema.example.com/ref3',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    // item3 has no references
    const item3 = createMockContentItem('item-3', { title: 'Leaf item' });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }
      if (id === 'item-2') {
        return item2;
      }
      if (id === 'item-3') {
        return item3;
      }

      return null;
    });
    const result = await discoverAllReferences(mockService, ['item-1'], {
      sourceRepositoryId: 'repo-123',
    });
    expect(result.size).toBe(3);
    expect(result.has('item-1')).toBe(true);
    expect(result.has('item-2')).toBe(true);
    expect(result.has('item-3')).toBe(true);
  });

  it('should handle circular references without infinite loop', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    // item1 -> references item2
    const item1 = createMockContentItem('item-1', {
      ref: {
        id: 'item-2',
        contentType: 'https://schema.example.com/ref2',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    // item2 -> references item1 (circular)
    const item2 = createMockContentItem('item-2', {
      ref: {
        id: 'item-1',
        contentType: 'https://schema.example.com/ref1',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }
      if (id === 'item-2') {
        return item2;
      }

      return null;
    });
    const result = await discoverAllReferences(mockService, ['item-1'], {
      sourceRepositoryId: 'repo-123',
    });
    // Should have discovered both items without infinite loop
    expect(result.size).toBe(2);
    expect(result.has('item-1')).toBe(true);
    expect(result.has('item-2')).toBe(true);
  });

  it('should handle self-referencing item', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    // item1 -> references itself
    const item1 = createMockContentItem('item-1', {
      selfRef: {
        id: 'item-1',
        contentType: 'https://schema.example.com/ref1',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }

      return null;
    });
    const result = await discoverAllReferences(mockService, ['item-1'], {
      sourceRepositoryId: 'repo-123',
    });
    // Should have discovered the item only once
    expect(result.size).toBe(1);
    expect(result.has('item-1')).toBe(true);
    // Verify getContentItemWithDetails was called only once
    expect(mockService.getContentItemWithDetails).toHaveBeenCalledTimes(1);
  });

  it('should mark external references', async () => {
    const mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
    // item1 references item-external which is outside the repository
    const item1 = createMockContentItem('item-1', {
      ref: {
        id: 'item-external',
        contentType: 'https://schema.example.com/external',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      },
    });
    vi.mocked(mockService.getContentItemWithDetails).mockImplementation(async (id: string) => {
      if (id === 'item-1') {
        return item1;
      }

      // External item fetch fails (simulating item not in source repository)
      return null;
    });
    const result = await discoverAllReferences(mockService, ['item-1'], {
      sourceRepositoryId: 'repo-123',
    });
    // Should have discovered item1
    expect(result.size).toBe(1);
    expect(result.has('item-1')).toBe(true);
    // Such external reference should be in the scan result's referenced IDs
    const item1Result = result.get('item-1');
    expect(item1Result?.referencedItemIds).toContain('item-external');
  });
});

describe('getMissingReferenceIds', () => {
  it('should return IDs not in discovered or repository set', () => {
    const discovered = new Map<string, ReferenceScanResult>();
    discovered.set('item-1', {
      sourceItemId: 'item-1',
      references: [],
      referencedItemIds: ['item-2', 'item-3'],
    });
    const repositoryIds = new Set(['item-1']);
    const missing = getMissingReferenceIds(discovered, repositoryIds);
    expect(missing).toEqual(new Set(['item-2', 'item-3']));
  });

  it('should return empty set when all IDs are present', () => {
    const discovered = new Map<string, ReferenceScanResult>();
    discovered.set('item-1', {
      sourceItemId: 'item-1',
      references: [],
      referencedItemIds: ['item-2'],
    });
    discovered.set('item-2', {
      sourceItemId: 'item-2',
      references: [],
      referencedItemIds: [],
    });
    const repositoryIds = new Set(['item-1', 'item-2']);
    const missing = getMissingReferenceIds(discovered, repositoryIds);
    expect(missing.size).toBe(0);
  });

  it('should deduplicate missing IDs', () => {
    const discovered = new Map<string, ReferenceScanResult>();
    discovered.set('item-1', {
      sourceItemId: 'item-1',
      references: [],
      referencedItemIds: ['missing-1', 'missing-2'],
    });
    discovered.set('item-2', {
      sourceItemId: 'item-2',
      references: [],
      referencedItemIds: ['missing-1', 'missing-3'],
    });
    const repositoryIds = new Set(['item-1', 'item-2']);
    const missing = getMissingReferenceIds(discovered, repositoryIds);
    expect(missing).toEqual(new Set(['missing-1', 'missing-2', 'missing-3']));
  });
});
