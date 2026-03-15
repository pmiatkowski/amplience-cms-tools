import { describe, expect, it } from 'vitest';
import { applyFilters } from './utils';

function createItem(overrides: Partial<Amplience.ContentItem> = {}): Amplience.ContentItem {
  return {
    id: 'item-1',
    label: 'Item 1',
    schemaId: 'https://example.com/schema/default',
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModifiedDate: '2026-01-01T00:00:00.000Z',
    version: 1,
    deliveryId: 'delivery-1',
    validationState: 'VALID',
    body: {
      _meta: {
        deliveryKey: 'en-gb',
      },
    },
    ...overrides,
  } as Amplience.ContentItem;
}

describe('applyFilters', () => {
  it('does not throw when runtime item is missing schemaId and uses _meta.schema fallback', () => {
    const runtimeItem = createItem({
      schemaId: undefined as unknown as string,
      body: {
        _meta: {
          schema: 'https://greenfield.gn/content/schema/page-hierarchy',
          deliveryKey: 'en-gb',
        },
      },
    });

    const result = applyFilters([runtimeItem], {
      schemaId: 'https://greenfield.gn/content/schema/page-hierarchy',
      status: ['ACTIVE' as Amplience.ContentStatus],
      rootHierarchyOnly: false,
    });

    expect(result).toHaveLength(1);
  });

  it('treats deliveryKey filter as a regex pattern', () => {
    const matching = createItem({
      body: { _meta: { deliveryKey: 'en-gb' } },
    });
    const nonMatching = createItem({
      id: 'item-2',
      body: { _meta: { deliveryKey: 'en-gb-home' } },
    });

    const result = applyFilters([matching, nonMatching], {
      deliveryKey: '^en-gb$',
      rootHierarchyOnly: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-1');
  });

  it('returns empty result for invalid deliveryKey regex', () => {
    const item = createItem();

    const result = applyFilters([item], {
      deliveryKey: '[invalid',
      rootHierarchyOnly: false,
    });

    expect(result).toEqual([]);
  });
});
