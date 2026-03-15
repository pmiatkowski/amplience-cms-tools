/**
 * Tests for Content Reference Transformation Service
 */
import { describe, expect, it } from 'vitest';
import {
  deepTransform,
  nullifyReferences,
  prepareBodyForPhase1Creation,
  prepareBodyForPhase2Update,
  resolveReferences,
  transformBodyReferences,
  transformReference,
  validateResolvedReferences,
} from './content-reference-transform';
import type { BodyTransformOptions } from './types';

// Type for test bodies with references
type TestBody = {
  _meta?: {
    schema?: string;
    deliveryKey?: string;
    hierarchy?: { root: boolean };
  };
  [key: string]: unknown;
};

// Helper to create mock content items
function createMockContentItem(id: string, body: TestBody): Amplience.ContentItemWithDetails {
  return {
    id,
    label: `Item ${id}`,
    status: 'ACTIVE',
    publishingStatus: 'LATEST',
    body: {
      _meta: {
        schema: 'https://schema.example.com/test.json',
        ...body._meta,
      },
      ...body,
    },
  } as Amplience.ContentItemWithDetails;
}

// Helper to create a content reference
function createContentReference(id: string, contentType: string): TestBody {
  return {
    id,
    contentType,
    _meta: {
      schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
    },
  };
}

// Helper to create a content link
function createContentLink(id: string, contentType: string): TestBody {
  return {
    id,
    contentType,
    _meta: {
      schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link',
    },
  };
}

describe('transformBodyReferences', () => {
  it('should replace reference IDs with target IDs in phase 2', () => {
    const body = {
      title: 'Test',
      image: createContentReference('source-id-1', 'https://schema.example.com/image.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-id-1', 'target-id-1');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect((result.image as TestBody).id).toBe('target-id-1');
    expect(result.title).toBe('Test');
  });

  it('should handle phase 1 (nullify)', () => {
    const body = {
      title: 'Test',
      image: createContentReference('source-id-1', 'https://schema.example.com/image.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-id-1', 'target-id-1');

    const options: BodyTransformOptions = {
      phase: 1,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect((result.image as TestBody).id).toBeNull();
    expect(result.title).toBe('Test');
  });

  it('should preserve body structure', () => {
    const body = {
      _meta: {
        schema: 'https://schema.example.com/test.json',
      },
      title: 'Test',
      nested: {
        value: 123,
        ref: createContentReference('source-id-1', 'https://schema.example.com/image.json'),
      },
      items: ['a', 'b', 'c'],
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-id-1', 'target-id-1');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect(result._meta).toBeDefined();
    expect(result._meta!.schema).toBe('https://schema.example.com/test.json');
    expect(result.title).toBe('Test');
    expect((result.nested as TestBody).value).toBe(123);
    expect(((result.nested as TestBody).ref as TestBody).id).toBe('target-id-1');
    expect(result.items).toEqual(['a', 'b', 'c']);
  });

  it('should not modify original body', () => {
    const originalBody = {
      title: 'Test',
      image: createContentReference('source-id-1', 'https://schema.example.com/image.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-id-1', 'target-id-1');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(originalBody, options) as TestBody;

    // Original body should be unchanged
    expect((originalBody.image as TestBody).id).toBe('source-id-1');
    // Result should have new ID
    expect((result.image as TestBody).id).toBe('target-id-1');
  });

  it('should preserve unmapped references when configured', () => {
    const body = {
      title: 'Test',
      image: createContentReference('unmapped-id', 'https://schema.example.com/image.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: true,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect((result.image as TestBody).id).toBe('unmapped-id');
  });

  it('should nullify unmapped references when configured', () => {
    const body = {
      title: 'Test',
      image: createContentReference('unmapped-id', 'https://schema.example.com/image.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect((result.image as TestBody).id).toBeNull();
  });
});

describe('nullifyReferences', () => {
  it('should set all reference IDs to null', () => {
    const body = {
      title: 'Test',
      ref1: createContentReference('id-1', 'https://schema.example.com/type1.json'),
      ref2: createContentLink('id-2', 'https://schema.example.com/type2.json'),
    };

    const result = nullifyReferences(body) as TestBody;

    expect((result.ref1 as TestBody).id).toBeNull();
    expect((result.ref2 as TestBody).id).toBeNull();
    expect(result.title).toBe('Test');
  });

  it('should preserve reference structure', () => {
    const body = {
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
    };

    const result = nullifyReferences(body) as TestBody;

    expect((result.ref as TestBody).id).toBeNull();
    expect((result.ref as TestBody).contentType).toBe('https://schema.example.com/type.json');
    expect(((result.ref as TestBody)._meta as TestBody).schema).toBe(
      'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
    );
  });

  it('should handle empty body', () => {
    const body = {};
    const result = nullifyReferences(body);
    expect(result).toEqual({});
  });

  it('should handle body with no references', () => {
    const body = {
      title: 'Test',
      value: 123,
      items: ['a', 'b', 'c'],
    };

    const result = nullifyReferences(body) as TestBody;

    expect(result.title).toBe('Test');
    expect(result.value).toBe(123);
    expect(result.items).toEqual(['a', 'b', 'c']);
  });

  it('should not modify original body', () => {
    const originalBody = {
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
    };

    nullifyReferences(originalBody);

    expect((originalBody.ref as TestBody).id).toBe('id-1');
  });
});

describe('resolveReferences', () => {
  it('should replace source IDs with target IDs', () => {
    const body = {
      ref1: createContentReference('source-1', 'https://schema.example.com/type1.json'),
      ref2: createContentReference('source-2', 'https://schema.example.com/type2.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');
    sourceToTargetIdMap.set('source-2', 'target-2');

    const result = resolveReferences(body, sourceToTargetIdMap) as TestBody;

    expect((result.ref1 as TestBody).id).toBe('target-1');
    expect((result.ref2 as TestBody).id).toBe('target-2');
  });

  it('should preserve unmapped references', () => {
    const body = {
      ref: createContentReference('unmapped', 'https://schema.example.com/type.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const result = resolveReferences(body, sourceToTargetIdMap) as TestBody;

    // Unmapped references should keep original ID
    expect((result.ref as TestBody).id).toBe('unmapped');
  });

  it('should handle nested references', () => {
    const body = {
      level1: {
        level2: {
          ref: createContentReference('source-1', 'https://schema.example.com/type.json'),
        },
      },
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');

    const result = resolveReferences(body, sourceToTargetIdMap) as TestBody;

    expect((((result.level1 as TestBody).level2 as TestBody).ref as TestBody).id).toBe('target-1');
  });

  it('should handle references in arrays', () => {
    const body = {
      items: [
        createContentReference('source-1', 'https://schema.example.com/type.json'),
        createContentReference('source-2', 'https://schema.example.com/type.json'),
      ],
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');
    sourceToTargetIdMap.set('source-2', 'target-2');

    const result = resolveReferences(body, sourceToTargetIdMap) as TestBody;

    const items = result.items as TestBody[];
    expect((items[0] as TestBody).id).toBe('target-1');
    expect((items[1] as TestBody).id).toBe('target-2');
  });
});

describe('deepTransform', () => {
  it('should transform nested objects', () => {
    const obj = {
      level1: {
        level2: {
          ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
        },
      },
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    const result = deepTransform(obj, transformer, '') as TestBody;

    expect((((result.level1 as TestBody).level2 as TestBody).ref as TestBody).id).toBe(
      'transformed'
    );
  });

  it('should transform arrays', () => {
    const obj = {
      items: [
        createContentReference('id-1', 'https://schema.example.com/type.json'),
        createContentReference('id-2', 'https://schema.example.com/type.json'),
      ],
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    const result = deepTransform(obj, transformer, '') as TestBody;

    const items = result.items as TestBody[];
    expect((items[0] as TestBody).id).toBe('transformed');
    expect((items[1] as TestBody).id).toBe('transformed');
  });

  it('should handle mixed content', () => {
    const obj = {
      title: 'Test',
      count: 42,
      flag: true,
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
      nested: {
        value: 'nested value',
      },
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    const result = deepTransform(obj, transformer, '') as TestBody;

    expect(result.title).toBe('Test');
    expect(result.count).toBe(42);
    expect(result.flag).toBe(true);
    expect((result.ref as TestBody).id).toBe('transformed');
    expect((result.nested as TestBody).value).toBe('nested value');
  });

  it('should preserve _meta without transforming it', () => {
    const obj = {
      _meta: {
        schema: 'https://schema.example.com/test.json',
        deliveryKey: 'test-key',
      },
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    const result = deepTransform(obj, transformer, '') as TestBody;

    expect(result._meta!.schema).toBe('https://schema.example.com/test.json');
    expect(result._meta!.deliveryKey).toBe('test-key');
  });

  it('should handle null values', () => {
    const obj = {
      value: null,
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    const result = deepTransform(obj, transformer, '') as TestBody;

    expect(result.value).toBeNull();
    expect((result.ref as TestBody).id).toBe('transformed');
  });

  it('should not modify original object', () => {
    const original = {
      ref: createContentReference('id-1', 'https://schema.example.com/type.json'),
    };

    const transformer = (): { id: string } => ({ id: 'transformed' });

    deepTransform(original, transformer, '');

    expect((original.ref as TestBody).id).toBe('id-1');
  });
});

describe('transformReference', () => {
  it('should nullify reference in phase 1', () => {
    const ref = {
      id: 'source-1',
      contentType: 'https://schema.example.com/type.json',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };

    const options: BodyTransformOptions = {
      phase: 1,
      sourceToTargetIdMap: new Map(),
      preserveUnmapped: false,
    };

    const result = transformReference(ref, options);

    expect(result).not.toBeNull();
    expect(result!.id).toBeNull();
    expect(result!.contentType).toBe('https://schema.example.com/type.json');
  });

  it('should resolve reference in phase 2', () => {
    const ref = {
      id: 'source-1',
      contentType: 'https://schema.example.com/type.json',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformReference(ref, options);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('target-1');
    expect(result!.contentType).toBe('https://schema.example.com/type.json');
  });

  it('should preserve unmapped reference when configured', () => {
    const ref = {
      id: 'unmapped',
      contentType: 'https://schema.example.com/type.json',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap: new Map(),
      preserveUnmapped: true,
    };

    const result = transformReference(ref, options);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('unmapped');
  });

  it('should nullify unmapped reference when configured', () => {
    const ref = {
      id: 'unmapped',
      contentType: 'https://schema.example.com/type.json',
      _meta: {
        schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
      },
    };

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap: new Map(),
      preserveUnmapped: false,
    };

    const result = transformReference(ref, options);

    expect(result).not.toBeNull();
    expect(result!.id).toBeNull();
  });
});

describe('validateResolvedReferences', () => {
  it('should return empty array when all resolved', () => {
    const body = {
      ref: createContentReference('source-1', 'https://schema.example.com/type.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');

    const result = validateResolvedReferences(body, sourceToTargetIdMap);

    expect(result).toEqual([]);
  });

  it('should return unresolved IDs', () => {
    const body = {
      ref1: createContentReference('resolved', 'https://schema.example.com/type.json'),
      ref2: createContentReference('unresolved', 'https://schema.example.com/type.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('resolved', 'target-1');

    const result = validateResolvedReferences(body, sourceToTargetIdMap);

    expect(result).toEqual(['unresolved']);
  });

  it('should deduplicate unresolved IDs', () => {
    const body = {
      ref1: createContentReference('unresolved', 'https://schema.example.com/type.json'),
      ref2: createContentReference('unresolved', 'https://schema.example.com/type.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const result = validateResolvedReferences(body, sourceToTargetIdMap);

    expect(result).toEqual(['unresolved']);
    expect(result.length).toBe(1);
  });

  it('should handle nested references', () => {
    const body = {
      level1: {
        level2: {
          ref: createContentReference('unresolved', 'https://schema.example.com/type.json'),
        },
      },
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const result = validateResolvedReferences(body, sourceToTargetIdMap);

    expect(result).toEqual(['unresolved']);
  });

  it('should handle references in arrays', () => {
    const body = {
      items: [
        createContentReference('unresolved-1', 'https://schema.example.com/type.json'),
        createContentReference('unresolved-2', 'https://schema.example.com/type.json'),
      ],
    };

    const sourceToTargetIdMap = new Map<string, string>();

    const result = validateResolvedReferences(body, sourceToTargetIdMap);

    expect(result).toContain('unresolved-1');
    expect(result).toContain('unresolved-2');
  });
});

describe('prepareBodyForPhase1Creation', () => {
  it('should nullify circular references', () => {
    const sourceItem = createMockContentItem('item-1', {
      title: 'Test',
      circularRef: createContentReference('item-2', 'https://schema.example.com/type.json'),
      normalRef: createContentReference('item-3', 'https://schema.example.com/type.json'),
    });

    const circularGroupIds = new Set<string>();
    circularGroupIds.add('item-2');

    const result = prepareBodyForPhase1Creation(sourceItem, circularGroupIds) as TestBody;

    // Circular reference should be nullified
    expect((result.circularRef as TestBody).id).toBeNull();
    // Normal reference should be preserved
    expect((result.normalRef as TestBody).id).toBe('item-3');
    expect(result.title).toBe('Test');
  });

  it('should preserve non-circular references', () => {
    const sourceItem = createMockContentItem('item-1', {
      ref1: createContentReference('item-2', 'https://schema.example.com/type.json'),
      ref2: createContentReference('item-3', 'https://schema.example.com/type.json'),
    });

    // No items in circular groups
    const circularGroupIds = new Set<string>();

    const result = prepareBodyForPhase1Creation(sourceItem, circularGroupIds) as TestBody;

    expect((result.ref1 as TestBody).id).toBe('item-2');
    expect((result.ref2 as TestBody).id).toBe('item-3');
  });

  it('should preserve body structure', () => {
    const sourceItem = createMockContentItem('item-1', {
      _meta: {
        schema: 'https://schema.example.com/test.json',
        deliveryKey: 'test-key',
      },
      title: 'Test',
      count: 42,
    });

    const circularGroupIds = new Set<string>();

    const result = prepareBodyForPhase1Creation(sourceItem, circularGroupIds) as TestBody;

    expect(result._meta!.schema).toBe('https://schema.example.com/test.json');
    expect(result._meta!.deliveryKey).toBe('test-key');
    expect(result.title).toBe('Test');
    expect(result.count).toBe(42);
  });

  it('should not modify source item', () => {
    const sourceItem = createMockContentItem('item-1', {
      ref: createContentReference('item-2', 'https://schema.example.com/type.json'),
    });

    const circularGroupIds = new Set<string>();
    circularGroupIds.add('item-2');

    prepareBodyForPhase1Creation(sourceItem, circularGroupIds);

    // Original should be unchanged
    expect((sourceItem.body as TestBody).ref as TestBody).toBeDefined();
    expect(((sourceItem.body as TestBody).ref as TestBody).id).toBe('item-2');
  });
});

describe('prepareBodyForPhase2Update', () => {
  it('should resolve all references with target IDs', () => {
    const sourceItem = createMockContentItem('item-1', {
      ref1: createContentReference('source-1', 'https://schema.example.com/type.json'),
      ref2: createContentReference('source-2', 'https://schema.example.com/type.json'),
    });

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');
    sourceToTargetIdMap.set('source-2', 'target-2');

    const result = prepareBodyForPhase2Update(sourceItem, sourceToTargetIdMap) as TestBody;

    expect((result.ref1 as TestBody).id).toBe('target-1');
    expect((result.ref2 as TestBody).id).toBe('target-2');
  });

  it('should preserve unmapped references', () => {
    const sourceItem = createMockContentItem('item-1', {
      ref: createContentReference('unmapped', 'https://schema.example.com/type.json'),
    });

    const sourceToTargetIdMap = new Map<string, string>();

    const result = prepareBodyForPhase2Update(sourceItem, sourceToTargetIdMap) as TestBody;

    // Unmapped references should keep original ID
    expect((result.ref as TestBody).id).toBe('unmapped');
  });

  it('should handle nested references', () => {
    const sourceItem = createMockContentItem('item-1', {
      level1: {
        level2: {
          ref: createContentReference('source-1', 'https://schema.example.com/type.json'),
        },
      },
    });

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');

    const result = prepareBodyForPhase2Update(sourceItem, sourceToTargetIdMap) as TestBody;

    expect((((result.level1 as TestBody).level2 as TestBody).ref as TestBody).id).toBe('target-1');
  });

  it('should not modify source item', () => {
    const sourceItem = createMockContentItem('item-1', {
      ref: createContentReference('source-1', 'https://schema.example.com/type.json'),
    });

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('source-1', 'target-1');

    prepareBodyForPhase2Update(sourceItem, sourceToTargetIdMap);

    // Original should be unchanged
    expect(((sourceItem.body as TestBody).ref as TestBody).id).toBe('source-1');
  });
});

describe('edge cases', () => {
  it('should handle mixed valid/invalid references in same array', () => {
    const body = {
      items: [
        createContentReference('valid', 'https://schema.example.com/type.json'),
        createContentReference('invalid', 'https://schema.example.com/type.json'),
      ],
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('valid', 'target-1');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;
    const items = result.items as TestBody[];

    expect((items[0] as TestBody).id).toBe('target-1');
    expect((items[1] as TestBody).id).toBeNull();
  });

  it('should handle empty arrays', () => {
    const body = {
      items: [],
    };

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap: new Map(),
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect(result.items).toEqual([]);
  });

  it('should handle null reference properties', () => {
    const body = {
      value: null,
    };

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap: new Map(),
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect(result.value).toBeNull();
  });

  it('should handle both content-reference and content-link types', () => {
    const body = {
      contentRef: createContentReference('id-1', 'https://schema.example.com/type.json'),
      contentLink: createContentLink('id-2', 'https://schema.example.com/type.json'),
    };

    const sourceToTargetIdMap = new Map<string, string>();
    sourceToTargetIdMap.set('id-1', 'target-1');
    sourceToTargetIdMap.set('id-2', 'target-2');

    const options: BodyTransformOptions = {
      phase: 2,
      sourceToTargetIdMap,
      preserveUnmapped: false,
    };

    const result = transformBodyReferences(body, options) as TestBody;

    expect((result.contentRef as TestBody).id).toBe('target-1');
    expect((result.contentLink as TestBody).id).toBe('target-2');
    // Verify schema types are preserved
    expect(((result.contentRef as TestBody)._meta as TestBody).schema).toBe(
      'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
    );
    expect(((result.contentLink as TestBody)._meta as TestBody).schema).toBe(
      'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link'
    );
  });
});
