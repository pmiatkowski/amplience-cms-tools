/**
 * Tests for Content Reference Mapping Service
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  createReferenceRegistry,
  registerItem,
  recordMapping,
  getTargetId,
  isRegistered,
  getItemsReferencing,
  matchSourceToTarget,
  matchAllSourcesToTargets,
  buildReverseReferences,
  getTopologicalOrder,
  detectCircularGroups,
  markExternalReference,
  markUnresolved,
  getRegistryStats,
} from './content-reference-mapping';
import type { DetectedReference, ReferenceRegistry } from './types';

// Helper function to create a mock content item with details
function createMockContentItem(
  id: string,
  label: string,
  schema: string,
  options: {
    deliveryKey?: string;
    references?: DetectedReference[];
  } = {}
): Amplience.ContentItemWithDetails {
  return {
    id,
    label,
    schemaId: schema,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2024-01-01T00:00:00Z',
    lastModifiedDate: '2024-01-01T00:00:00Z',
    version: 1,
    deliveryId: `delivery-${id}`,
    validationState: 'VALID',
    contentRepositoryId: 'repo-1',
    createdBy: 'user-1',
    lastModifiedBy: 'user-1',
    body: {
      _meta: {
        name: label,
        schema,
        deliveryKey: options.deliveryKey || null,
      },
    },
  } as Amplience.ContentItemWithDetails;
}

// Helper function to create a mock content item (basic)
function createMockTargetItem(
  id: string,
  label: string,
  schema: string,
  deliveryKey?: string
): Amplience.ContentItem {
  return {
    id,
    label,
    schemaId: schema,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2024-01-01T00:00:00Z',
    lastModifiedDate: '2024-01-01T00:00:00Z',
    version: 1,
    deliveryId: `delivery-${id}`,
    validationState: 'VALID',
    body: {
      _meta: {
        name: label,
        schema,
        deliveryKey: deliveryKey || null,
      },
    },
  } as Amplience.ContentItem;
}

// Helper function to create a detected reference
function createMockReference(
  sourceId: string,
  contentType: string,
  path: string
): DetectedReference {
  return {
    sourceId,
    contentType,
    path,
    isArrayElement: path.includes('['),
    referenceSchemaType: 'content-reference',
  };
}

describe('createReferenceRegistry', () => {
  it('should create empty registry', () => {
    const registry = createReferenceRegistry();

    expect(registry.entries.size).toBe(0);
    expect(registry.sourceToTargetIdMap.size).toBe(0);
    expect(registry.unresolvedIds.size).toBe(0);
    expect(registry.externalReferenceIds.size).toBe(0);
  });
});

describe('registerItem', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should add item with references', () => {
    const item = createMockContentItem('item-1', 'Test Item', 'https://schema.test.com/test');
    const references: DetectedReference[] = [
      createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link'),
    ];

    registerItem(registry, item, references);

    expect(registry.entries.size).toBe(1);
    expect(isRegistered(registry, 'item-1')).toBe(true);

    const entry = registry.entries.get('item-1');
    expect(entry).toBeDefined();
    expect(entry?.sourceItem).toBe(item);
    expect(entry?.references).toEqual(references);
    expect(entry?.referencesTo).toEqual(['ref-1']);
    expect(entry?.referencedBy).toEqual([]);
    expect(entry?.processed).toBe(false);
  });

  it('should update existing entry', () => {
    const item = createMockContentItem('item-1', 'Test Item', 'https://schema.test.com/test');
    const references1: DetectedReference[] = [
      createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link1'),
    ];
    const references2: DetectedReference[] = [
      createMockReference('ref-2', 'https://schema.test.com/ref', 'body.link2'),
    ];

    registerItem(registry, item, references1);
    registerItem(registry, item, references2);

    expect(registry.entries.size).toBe(1);

    const entry = registry.entries.get('item-1');
    expect(entry?.references).toEqual(references2);
    expect(entry?.referencesTo).toEqual(['ref-2']);
  });

  it('should deduplicate reference IDs', () => {
    const item = createMockContentItem('item-1', 'Test Item', 'https://schema.test.com/test');
    const references: DetectedReference[] = [
      createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link1'),
      createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link2'), // Same ID
    ];

    registerItem(registry, item, references);

    const entry = registry.entries.get('item-1');
    expect(entry?.referencesTo).toEqual(['ref-1']); // Deduplicated
  });
});

describe('recordMapping', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should record source to target mapping', () => {
    recordMapping(registry, 'source-1', 'target-1');

    expect(registry.sourceToTargetIdMap.size).toBe(1);
    expect(registry.sourceToTargetIdMap.get('source-1')).toBe('target-1');
  });

  it('should update targetId in entry', () => {
    const item = createMockContentItem('source-1', 'Test', 'https://schema.test.com/test');
    registerItem(registry, item, []);

    recordMapping(registry, 'source-1', 'target-1');

    const entry = registry.entries.get('source-1');
    expect(entry?.targetId).toBe('target-1');
  });

  it('should overwrite existing mapping', () => {
    recordMapping(registry, 'source-1', 'target-1');
    recordMapping(registry, 'source-1', 'target-2');

    expect(getTargetId(registry, 'source-1')).toBe('target-2');
  });
});

describe('getTargetId', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should return target ID for mapped source', () => {
    recordMapping(registry, 'source-1', 'target-1');

    expect(getTargetId(registry, 'source-1')).toBe('target-1');
  });

  it('should return undefined for unmapped source', () => {
    expect(getTargetId(registry, 'unknown')).toBeUndefined();
  });
});

describe('isRegistered', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should return true for registered item', () => {
    const item = createMockContentItem('item-1', 'Test', 'https://schema.test.com/test');
    registerItem(registry, item, []);

    expect(isRegistered(registry, 'item-1')).toBe(true);
  });

  it('should return false for unregistered item', () => {
    expect(isRegistered(registry, 'unknown')).toBe(false);
  });
});

describe('getItemsReferencing', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should return items that reference a specific item', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    registerItem(registry, item1, [createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link')]);
    registerItem(registry, item2, [createMockReference('ref-1', 'https://schema.test.com/ref', 'body.link')]);
    registerItem(registry, item3, [createMockReference('ref-2', 'https://schema.test.com/ref', 'body.link')]);

    const referencing = getItemsReferencing(registry, 'ref-1');

    expect(referencing.length).toBe(2);
    expect(referencing.map((e) => e.sourceItem.id)).toContain('item-1');
    expect(referencing.map((e) => e.sourceItem.id)).toContain('item-2');
  });

  it('should return empty array when no items reference the item', () => {
    const item = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    registerItem(registry, item, []);

    const referencing = getItemsReferencing(registry, 'unknown');

    expect(referencing).toEqual([]);
  });
});

describe('matchSourceToTarget', () => {
  it('should match by delivery key first', () => {
    const source = createMockContentItem(
      'source-1',
      'Test Source',
      'https://schema.test.com/test',
      { deliveryKey: 'test/key' }
    );

    const targets = [
      createMockTargetItem('target-1', 'Different Label', 'https://schema.test.com/test', 'test/key'),
      createMockTargetItem('target-2', 'Test Source', 'https://schema.test.com/test', 'other/key'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('matched');
    expect(result.confidence).toBe('delivery_key');
    expect(result.targetItem?.id).toBe('target-1');
  });

  it('should fall back to schema + label when no delivery key match', () => {
    const source = createMockContentItem(
      'source-1',
      'Test Source',
      'https://schema.test.com/test',
      { deliveryKey: 'test/key' }
    );

    const targets = [
      createMockTargetItem('target-1', 'Different Label', 'https://schema.test.com/test', 'other/key'),
      createMockTargetItem('target-2', 'Test Source', 'https://schema.test.com/test', 'another/key'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('matched');
    expect(result.confidence).toBe('schema_label');
    expect(result.targetItem?.id).toBe('target-2');
  });

  it('should return no_match when no match found', () => {
    const source = createMockContentItem(
      'source-1',
      'Test Source',
      'https://schema.test.com/test',
      { deliveryKey: 'test/key' }
    );

    const targets = [
      createMockTargetItem('target-1', 'Different Label', 'https://schema.test.com/other', 'other/key'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('no_match');
    expect(result.confidence).toBe('none');
    expect(result.targetItem).toBeUndefined();
  });

  it('should return multiple_matches with alternatives', () => {
    const source = createMockContentItem(
      'source-1',
      'Test Source',
      'https://schema.test.com/test'
    );

    const targets = [
      createMockTargetItem('target-1', 'Test Source', 'https://schema.test.com/test'),
      createMockTargetItem('target-2', 'Test Source', 'https://schema.test.com/test'),
      createMockTargetItem('target-3', 'Test Source', 'https://schema.test.com/test'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('multiple_matches');
    expect(result.confidence).toBe('schema_label');
    expect(result.targetItem?.id).toBe('target-1');
    expect(result.alternatives?.length).toBe(2);
    expect(result.alternatives?.map((t) => t.id)).toContain('target-2');
    expect(result.alternatives?.map((t) => t.id)).toContain('target-3');
  });

  it('should match case-insensitive labels', () => {
    const source = createMockContentItem(
      'source-1',
      'TEST SOURCE',
      'https://schema.test.com/test'
    );

    const targets = [
      createMockTargetItem('target-1', 'test source', 'https://schema.test.com/test'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('matched');
    expect(result.confidence).toBe('schema_label');
  });

  it('should match when source has no delivery key', () => {
    const source = createMockContentItem(
      'source-1',
      'Test Source',
      'https://schema.test.com/test'
      // No delivery key
    );

    const targets = [
      createMockTargetItem('target-1', 'Test Source', 'https://schema.test.com/test'),
    ];

    const result = matchSourceToTarget(source, targets);

    expect(result.status).toBe('matched');
    expect(result.confidence).toBe('schema_label');
  });
});

describe('matchAllSourcesToTargets', () => {
  it('should match multiple source items to target items', () => {
    const sources = [
      createMockContentItem('source-1', 'Item A', 'https://schema.test.com/test', { deliveryKey: 'key/a' }),
      createMockContentItem('source-2', 'Item B', 'https://schema.test.com/test', { deliveryKey: 'key/b' }),
    ];

    const targets = [
      createMockTargetItem('target-1', 'Item A', 'https://schema.test.com/test', 'key/a'),
      createMockTargetItem('target-2', 'Item B', 'https://schema.test.com/test', 'key/b'),
    ];

    const results = matchAllSourcesToTargets(sources, targets);

    expect(results.size).toBe(2);
    expect(results.get('source-1')?.status).toBe('matched');
    expect(results.get('source-1')?.confidence).toBe('delivery_key');
    expect(results.get('source-2')?.status).toBe('matched');
    expect(results.get('source-2')?.confidence).toBe('delivery_key');
  });
});

describe('buildReverseReferences', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should build referencedBy for all entries', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    // item1 references item2
    registerItem(registry, item1, [createMockReference('item-2', 'https://schema.test.com/test', 'body.link')]);
    // item2 references item3
    registerItem(registry, item2, [createMockReference('item-3', 'https://schema.test.com/test', 'body.link')]);
    // item3 has no references
    registerItem(registry, item3, []);

    buildReverseReferences(registry);

    expect(registry.entries.get('item-1')?.referencedBy).toEqual([]);
    expect(registry.entries.get('item-2')?.referencedBy).toEqual(['item-1']);
    expect(registry.entries.get('item-3')?.referencedBy).toEqual(['item-2']);
  });

  it('should handle items with no references', () => {
    const item = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    registerItem(registry, item, []);

    buildReverseReferences(registry);

    expect(registry.entries.get('item-1')?.referencedBy).toEqual([]);
  });

  it('should handle multiple items referencing same item', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    // Both item1 and item2 reference item3
    registerItem(registry, item1, [createMockReference('item-3', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item2, [createMockReference('item-3', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item3, []);

    buildReverseReferences(registry);

    const referencedBy = registry.entries.get('item-3')?.referencedBy;
    expect(referencedBy?.length).toBe(2);
    expect(referencedBy).toContain('item-1');
    expect(referencedBy).toContain('item-2');
  });

  it('should ignore references to items not in registry', () => {
    const item = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    // References item not in registry
    registerItem(registry, item, [createMockReference('external-item', 'https://schema.test.com/test', 'body.link')]);

    buildReverseReferences(registry);

    // Should not throw and should not add external-item to registry
    expect(registry.entries.size).toBe(1);
    expect(registry.entries.has('external-item')).toBe(false);
  });
});

describe('getTopologicalOrder', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should return items with no dependencies first', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');

    // item1 references item2
    registerItem(registry, item1, [createMockReference('item-2', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item2, []);

    const order = getTopologicalOrder(registry);

    // item2 (dependency) should come before item1 (dependent)
    expect(order.indexOf('item-2')).toBeLessThan(order.indexOf('item-1'));
  });

  it('should handle linear dependency chain', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    // item1 -> item2 -> item3
    registerItem(registry, item1, [createMockReference('item-2', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item2, [createMockReference('item-3', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item3, []);

    const order = getTopologicalOrder(registry);

    // item3 -> item2 -> item1
    expect(order.indexOf('item-3')).toBeLessThan(order.indexOf('item-2'));
    expect(order.indexOf('item-2')).toBeLessThan(order.indexOf('item-1'));
  });

  it('should handle diamond dependencies', () => {
    // Diamond: item4 -> item2 -> item1
    //                  item3 -> item1
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');
    const item4 = createMockContentItem('item-4', 'Item 4', 'https://schema.test.com/test');

    registerItem(registry, item1, []);
    registerItem(registry, item2, [createMockReference('item-1', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item3, [createMockReference('item-1', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item4, [
      createMockReference('item-2', 'https://schema.test.com/test', 'body.link'),
      createMockReference('item-3', 'https://schema.test.com/test', 'body.link'),
    ]);

    const order = getTopologicalOrder(registry);

    // item1 should be first (no dependencies)
    // item4 should be last (depends on item2 and item3)
    expect(order.indexOf('item-1')).toBeLessThan(order.indexOf('item-2'));
    expect(order.indexOf('item-1')).toBeLessThan(order.indexOf('item-3'));
    expect(order.indexOf('item-2')).toBeLessThan(order.indexOf('item-4'));
    expect(order.indexOf('item-3')).toBeLessThan(order.indexOf('item-4'));
  });

  it('should handle items with no references at all', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');

    registerItem(registry, item1, []);
    registerItem(registry, item2, []);

    const order = getTopologicalOrder(registry);

    expect(order.length).toBe(2);
    expect(order).toContain('item-1');
    expect(order).toContain('item-2');
  });
});

describe('detectCircularGroups', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should detect simple circular reference A -> B -> A', () => {
    const itemA = createMockContentItem('item-a', 'Item A', 'https://schema.test.com/test');
    const itemB = createMockContentItem('item-b', 'Item B', 'https://schema.test.com/test');

    // A -> B, B -> A
    registerItem(registry, itemA, [createMockReference('item-b', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemB, [createMockReference('item-a', 'https://schema.test.com/test', 'body.link')]);

    const groups = detectCircularGroups(registry);

    expect(groups.length).toBe(1);
    expect(groups[0]).toContain('item-a');
    expect(groups[0]).toContain('item-b');
  });

  it('should detect self-reference A -> A', () => {
    const itemA = createMockContentItem('item-a', 'Item A', 'https://schema.test.com/test');

    // A -> A
    registerItem(registry, itemA, [createMockReference('item-a', 'https://schema.test.com/test', 'body.link')]);

    const groups = detectCircularGroups(registry);

    expect(groups.length).toBe(1);
    expect(groups[0]).toContain('item-a');
  });

  it('should detect complex circular group', () => {
    // A -> B -> C -> A
    const itemA = createMockContentItem('item-a', 'Item A', 'https://schema.test.com/test');
    const itemB = createMockContentItem('item-b', 'Item B', 'https://schema.test.com/test');
    const itemC = createMockContentItem('item-c', 'Item C', 'https://schema.test.com/test');

    registerItem(registry, itemA, [createMockReference('item-b', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemB, [createMockReference('item-c', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemC, [createMockReference('item-a', 'https://schema.test.com/test', 'body.link')]);

    const groups = detectCircularGroups(registry);

    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(3);
    expect(groups[0]).toContain('item-a');
    expect(groups[0]).toContain('item-b');
    expect(groups[0]).toContain('item-c');
  });

  it('should return empty array for acyclic graph', () => {
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    // Linear chain: item1 -> item2 -> item3
    registerItem(registry, item1, [createMockReference('item-2', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item2, [createMockReference('item-3', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, item3, []);

    const groups = detectCircularGroups(registry);

    expect(groups.length).toBe(0);
  });

  it('should handle multiple separate circular groups', () => {
    // Group 1: A -> B -> A
    // Group 2: C -> D -> C
    const itemA = createMockContentItem('item-a', 'Item A', 'https://schema.test.com/test');
    const itemB = createMockContentItem('item-b', 'Item B', 'https://schema.test.com/test');
    const itemC = createMockContentItem('item-c', 'Item C', 'https://schema.test.com/test');
    const itemD = createMockContentItem('item-d', 'Item D', 'https://schema.test.com/test');

    registerItem(registry, itemA, [createMockReference('item-b', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemB, [createMockReference('item-a', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemC, [createMockReference('item-d', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemD, [createMockReference('item-c', 'https://schema.test.com/test', 'body.link')]);

    const groups = detectCircularGroups(registry);

    expect(groups.length).toBe(2);
  });
});

describe('markExternalReference', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should mark item as external', () => {
    markExternalReference(registry, 'external-1');

    expect(registry.externalReferenceIds.has('external-1')).toBe(true);
  });

  it('should allow multiple items to be marked as external', () => {
    markExternalReference(registry, 'external-1');
    markExternalReference(registry, 'external-2');

    expect(registry.externalReferenceIds.size).toBe(2);
  });
});

describe('markUnresolved', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should mark item as unresolved', () => {
    markUnresolved(registry, 'unresolved-1');

    expect(registry.unresolvedIds.has('unresolved-1')).toBe(true);
  });

  it('should allow multiple items to be marked as unresolved', () => {
    markUnresolved(registry, 'unresolved-1');
    markUnresolved(registry, 'unresolved-2');

    expect(registry.unresolvedIds.size).toBe(2);
  });
});

describe('getRegistryStats', () => {
  let registry: ReferenceRegistry;

  beforeEach(() => {
    registry = createReferenceRegistry();
  });

  it('should return accurate statistics', () => {
    // Add 3 items
    const item1 = createMockContentItem('item-1', 'Item 1', 'https://schema.test.com/test');
    const item2 = createMockContentItem('item-2', 'Item 2', 'https://schema.test.com/test');
    const item3 = createMockContentItem('item-3', 'Item 3', 'https://schema.test.com/test');

    registerItem(registry, item1, []);
    registerItem(registry, item2, []);
    registerItem(registry, item3, []);

    // Map 2 items
    recordMapping(registry, 'item-1', 'target-1');
    recordMapping(registry, 'item-2', 'target-2');

    // Mark 1 as external
    markExternalReference(registry, 'external-1');

    // Mark 1 as unresolved
    markUnresolved(registry, 'unresolved-1');

    const stats = getRegistryStats(registry);

    expect(stats.totalItems).toBe(3);
    expect(stats.mappedItems).toBe(2);
    expect(stats.unmappedItems).toBe(1); // item-3 is not mapped
    expect(stats.unresolvedItems).toBe(1);
    expect(stats.externalItems).toBe(1);
    expect(stats.circularGroups).toBe(0);
  });

  it('should count circular groups correctly', () => {
    // Create a circular reference
    const itemA = createMockContentItem('item-a', 'Item A', 'https://schema.test.com/test');
    const itemB = createMockContentItem('item-b', 'Item B', 'https://schema.test.com/test');

    registerItem(registry, itemA, [createMockReference('item-b', 'https://schema.test.com/test', 'body.link')]);
    registerItem(registry, itemB, [createMockReference('item-a', 'https://schema.test.com/test', 'body.link')]);

    const stats = getRegistryStats(registry);

    expect(stats.circularGroups).toBe(1);
  });

  it('should return zeros for empty registry', () => {
    const stats = getRegistryStats(registry);

    expect(stats.totalItems).toBe(0);
    expect(stats.mappedItems).toBe(0);
    expect(stats.unmappedItems).toBe(0);
    expect(stats.unresolvedItems).toBe(0);
    expect(stats.externalItems).toBe(0);
    expect(stats.circularGroups).toBe(0);
  });
});
