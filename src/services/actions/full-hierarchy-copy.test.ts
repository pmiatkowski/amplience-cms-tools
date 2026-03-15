import { describe, it, expect } from 'vitest';
import {
  extractUniqueSchemaIds,
  replaceReferenceIdsInBody,
  seedIdMappingFromIndexedItems,
} from './full-hierarchy-copy';

function createDetailedItem(
  overrides: Partial<Amplience.ContentItemWithDetails> = {}
): Amplience.ContentItemWithDetails {
  return {
    id: 'item-1',
    label: 'Item 1',
    schemaId: 'https://example.com/schema/default',
    status: 'ACTIVE',
    publishingStatus: 'LATEST',
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModifiedDate: '2026-01-01T00:00:00.000Z',
    version: 1,
    deliveryId: 'delivery-1',
    validationState: 'VALID',
    contentRepositoryId: 'repo-1',
    createdBy: 'user',
    lastModifiedBy: 'user',
    body: {
      _meta: {
        schema: 'https://example.com/schema/default',
      },
    },
    ...overrides,
  } as Amplience.ContentItemWithDetails;
}

describe('extractUniqueSchemaIds', () => {
  it('falls back to body._meta.schema when schemaId is missing at runtime', () => {
    const item = createDetailedItem({
      schemaId: undefined as unknown as string,
      body: {
        _meta: {
          schema: 'https://greenfield.gn/content/schema/page-hierarchy',
        },
      },
    });

    const result = extractUniqueSchemaIds([item]);

    expect(result).toEqual(['https://greenfield.gn/content/schema/page-hierarchy']);
  });

  it('deduplicates and trims schema IDs, filtering out empty values', () => {
    const items = [
      createDetailedItem({ schemaId: ' https://example.com/schema/a ' }),
      createDetailedItem({ id: 'item-2', schemaId: 'https://example.com/schema/a' }),
      createDetailedItem({
        id: 'item-3',
        schemaId: '' as unknown as string,
        body: { _meta: { schema: '   ' } },
      }),
    ];

    const result = extractUniqueSchemaIds(items);

    expect(result).toEqual(['https://example.com/schema/a']);
  });
});

describe('replaceReferenceIdsInBody', () => {
  it('should replace content reference IDs', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      related: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'source-id-1',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-id-1', 'target-id-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const related = result.related as Record<string, unknown>;
    expect(related.id).toBe('target-id-1');
  });

  it('should replace content link deliveryIds in _meta', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      hero: {
        _meta: {
          schema: 'https://example.com/media',
          deliveryId: 'source-delivery-1',
        },
        image: {},
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-delivery-1', 'target-delivery-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const hero = result.hero as Record<string, unknown>;
    const meta = hero._meta as Record<string, unknown>;
    expect(meta.deliveryId).toBe('target-delivery-1');
  });

  it('should handle nested references in arrays', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      components: [
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-1',
          },
        },
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-2',
          },
        },
      ],
    } as unknown as Amplience.Body;

    const mapping = new Map([
      ['src-1', 'tgt-1'],
      ['src-2', 'tgt-2'],
    ]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const components = result.components as Array<Record<string, unknown>>;
    expect((components[0]._meta as Record<string, unknown>).deliveryId).toBe('tgt-1');
    expect((components[1]._meta as Record<string, unknown>).deliveryId).toBe('tgt-2');
  });

  it('should not modify IDs that are not in the mapping', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      ref: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'unknown-id',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map<string, string>();
    const result = replaceReferenceIdsInBody(body, mapping);

    const ref = result.ref as Record<string, unknown>;
    expect(ref.id).toBe('unknown-id');
  });

  it('should replace direct deliveryId fields when mapped', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      heroImage: {
        deliveryId: 'source-delivery-1',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-delivery-1', 'target-delivery-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const heroImage = result.heroImage as Record<string, unknown>;
    expect(heroImage.deliveryId).toBe('target-delivery-1');
  });
});

describe('seedIdMappingFromIndexedItems', () => {
  it('seeds mapping using delivery key when there is an exact target match', () => {
    const sourceItems = [
      {
        id: 'src-1',
        deliveryId: 'src-delivery-1',
        label: 'Page A',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page', deliveryKey: 'page-a' } },
      },
    ];

    const targetItems = [
      {
        id: 'tgt-1',
        deliveryId: 'tgt-delivery-1',
        label: 'Different Label',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page', deliveryKey: 'page-a' } },
      },
    ];

    const idMapping = new Map<string, string>();
    const seeded = seedIdMappingFromIndexedItems(sourceItems, targetItems, idMapping);

    expect(seeded).toBe(1);
    expect(idMapping.get('src-1')).toBe('tgt-1');
    expect(idMapping.get('src-delivery-1')).toBe('tgt-delivery-1');
  });

  it('falls back to unique label+schema matching when delivery key is unavailable', () => {
    const sourceItems = [
      {
        id: 'src-2',
        label: 'Homepage',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page' } },
      },
    ];

    const targetItems = [
      {
        id: 'tgt-2',
        label: 'Homepage',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page' } },
      },
    ];

    const idMapping = new Map<string, string>();
    const seeded = seedIdMappingFromIndexedItems(sourceItems, targetItems, idMapping);

    expect(seeded).toBe(1);
    expect(idMapping.get('src-2')).toBe('tgt-2');
  });

  it('does not seed mappings for ambiguous label+schema matches', () => {
    const sourceItems = [
      {
        id: 'src-3',
        label: 'Shared Label',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page' } },
      },
    ];

    const targetItems = [
      {
        id: 'tgt-3a',
        label: 'Shared Label',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page' } },
      },
      {
        id: 'tgt-3b',
        label: 'Shared Label',
        schemaId: 'https://example.com/schema/page',
        body: { _meta: { schema: 'https://example.com/schema/page' } },
      },
    ];

    const idMapping = new Map<string, string>();
    const seeded = seedIdMappingFromIndexedItems(sourceItems, targetItems, idMapping);

    expect(seeded).toBe(0);
    expect(idMapping.has('src-3')).toBe(false);
  });
});
