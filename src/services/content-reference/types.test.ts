/**
 * Tests for content reference types
 *
 * This file validates that the type definitions compile correctly
 * and that constants are properly defined.
 */
import { describe, it, expect } from 'vitest';
import {
  CONTENT_REFERENCE_SCHEMAS,
  isContentReferenceSchema,
  getReferenceSchemaType,
} from './types';
import type {
  DetectedReference,
  ReferenceScanResult,
  ReferenceRegistryEntry,
  ReferenceRegistry,
  ReferenceDiscoveryOptions,
  TargetMatchResult,
  ReferenceResolutionResult,
  BodyTransformOptions,
  ReferenceSchemaTypeLiteral,
} from './types';

describe('Content Reference Types', () => {
  describe('CONTENT_REFERENCE_SCHEMAS constant', () => {
    it('should have correct content-reference schema URI', () => {
      expect(CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE).toBe(
        'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
      );
    });

    it('should have correct content-link schema URI', () => {
      expect(CONTENT_REFERENCE_SCHEMAS.CONTENT_LINK).toBe(
        'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link'
      );
    });

    it('should be readonly (as const)', () => {
      // TypeScript enforces readonly at compile time
      // This test verifies the values exist and are correct
      const schemas = CONTENT_REFERENCE_SCHEMAS;
      expect(Object.keys(schemas)).toHaveLength(2);
    });
  });

  describe('isContentReferenceSchema', () => {
    it('should return true for content-reference schema', () => {
      expect(
        isContentReferenceSchema(
          'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
        )
      ).toBe(true);
    });

    it('should return true for content-link schema', () => {
      expect(
        isContentReferenceSchema(
          'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link'
        )
      ).toBe(true);
    });

    it('should return false for non-reference schemas', () => {
      expect(
        isContentReferenceSchema('http://bigcontent.io/cms/schema/v1/core#/definitions/other')
      ).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isContentReferenceSchema('')).toBe(false);
    });

    it('should return false for unrelated URIs', () => {
      expect(isContentReferenceSchema('https://example.com/schema')).toBe(false);
    });
  });

  describe('getReferenceSchemaType', () => {
    it('should return "content-reference" for content-reference schema', () => {
      expect(
        getReferenceSchemaType(
          'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference'
        )
      ).toBe('content-reference');
    });

    it('should return "content-link" for content-link schema', () => {
      expect(
        getReferenceSchemaType('http://bigcontent.io/cms/schema/v1/core#/definitions/content-link')
      ).toBe('content-link');
    });

    it('should return null for non-reference schemas', () => {
      expect(
        getReferenceSchemaType('http://bigcontent.io/cms/schema/v1/core#/definitions/other')
      ).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getReferenceSchemaType('')).toBeNull();
    });
  });
});

describe('Type Compilation Tests', () => {
  it('should compile DetectedReference type correctly', () => {
    const ref: DetectedReference = {
      sourceId: 'test-id-123',
      contentType: 'https://schema.example.com/test',
      path: 'body.component[0].image',
      isArrayElement: true,
      referenceSchemaType: 'content-reference',
    };

    expect(ref.sourceId).toBe('test-id-123');
    expect(ref.isArrayElement).toBe(true);
  });

  it('should compile ReferenceScanResult type correctly', () => {
    const result: ReferenceScanResult = {
      sourceItemId: 'item-123',
      references: [],
      referencedItemIds: [],
    };

    expect(result.sourceItemId).toBe('item-123');
    expect(result.references).toEqual([]);
  });

  it('should compile ReferenceRegistryEntry type correctly', () => {
    const mockSourceItem = {
      id: 'test-id',
      label: 'Test Item',
      schemaId: 'https://schema.example.com/test',
      status: 'ACTIVE' as const,
      publishingStatus: 'LATEST' as const,
      createdDate: '2024-01-01',
      lastModifiedDate: '2024-01-01',
      version: 1,
      deliveryId: 'delivery-123',
      validationState: 'VALID',
      body: { _meta: { schema: 'https://schema.example.com/test' } },
      contentRepositoryId: 'repo-123',
      createdBy: 'user-1',
      lastModifiedBy: 'user-1',
    };

    const entry: ReferenceRegistryEntry = {
      sourceItem: mockSourceItem as Amplience.ContentItemWithDetails,
      references: [],
      referencesTo: [],
      referencedBy: [],
      processed: false,
    };

    expect(entry.processed).toBe(false);
    expect(entry.referencesTo).toEqual([]);
  });

  it('should compile ReferenceRegistry type correctly', () => {
    const registry: ReferenceRegistry = {
      entries: new Map(),
      sourceToTargetIdMap: new Map(),
      unresolvedIds: new Set(),
      externalReferenceIds: new Set(),
    };

    expect(registry.entries.size).toBe(0);
    expect(registry.unresolvedIds.size).toBe(0);
  });

  it('should compile ReferenceDiscoveryOptions type correctly', () => {
    const options: ReferenceDiscoveryOptions = {
      sourceRepositoryId: 'repo-123',
      maxDepth: 10,
      includeDeliveryKeyItemsOnly: true,
    };

    expect(options.sourceRepositoryId).toBe('repo-123');
    expect(options.maxDepth).toBe(10);
  });

  it('should compile TargetMatchResult type correctly', () => {
    const matchResult: TargetMatchResult = {
      sourceId: 'source-123',
      status: 'matched',
      confidence: 'delivery_key',
    };

    expect(matchResult.status).toBe('matched');
    expect(matchResult.confidence).toBe('delivery_key');
  });

  it('should compile ReferenceResolutionResult type correctly', () => {
    const result: ReferenceResolutionResult = {
      totalDiscovered: 10,
      matchedCount: 5,
      toCreateCount: 3,
      unresolvedCount: 2,
      externalCount: 1,
      circularGroups: [['id1', 'id2']],
      registry: {
        entries: new Map(),
        sourceToTargetIdMap: new Map(),
        unresolvedIds: new Set(),
        externalReferenceIds: new Set(),
      },
      creationOrder: ['id1', 'id2', 'id3'],
    };

    expect(result.totalDiscovered).toBe(10);
    expect(result.circularGroups).toHaveLength(1);
  });

  it('should compile BodyTransformOptions type correctly', () => {
    const options: BodyTransformOptions = {
      phase: 1,
      sourceToTargetIdMap: new Map([['source-id', 'target-id']]),
      preserveUnmapped: false,
    };

    expect(options.phase).toBe(1);
    expect(options.preserveUnmapped).toBe(false);
  });

  it('should compile ReferenceSchemaTypeLiteral correctly', () => {
    const type1: ReferenceSchemaTypeLiteral = 'content-reference';
    const type2: ReferenceSchemaTypeLiteral = 'content-link';

    expect(type1).toBe('content-reference');
    expect(type2).toBe('content-link');
  });
});

describe('ReferenceRegistry operations', () => {
  it('should allow adding entries to the registry', () => {
    const registry: ReferenceRegistry = {
      entries: new Map(),
      sourceToTargetIdMap: new Map(),
      unresolvedIds: new Set(),
      externalReferenceIds: new Set(),
    };

    const mockEntry: ReferenceRegistryEntry = {
      sourceItem: {
        id: 'test-id',
        label: 'Test',
      } as Amplience.ContentItemWithDetails,
      references: [],
      referencesTo: ['ref-1'],
      referencedBy: [],
      processed: false,
    };

    registry.entries.set('test-id', mockEntry);
    registry.sourceToTargetIdMap.set('source-1', 'target-1');
    registry.unresolvedIds.add('unresolved-1');
    registry.externalReferenceIds.add('external-1');

    expect(registry.entries.has('test-id')).toBe(true);
    expect(registry.sourceToTargetIdMap.get('source-1')).toBe('target-1');
    expect(registry.unresolvedIds.has('unresolved-1')).toBe(true);
    expect(registry.externalReferenceIds.has('external-1')).toBe(true);
  });
});

describe('TargetMatchResult status types', () => {
  it('should support all status values', () => {
    const statuses: Array<TargetMatchResult['status']> = [
      'matched',
      'no_match',
      'multiple_matches',
      'external',
    ];

    expect(statuses).toContain('matched');
    expect(statuses).toContain('no_match');
    expect(statuses).toContain('multiple_matches');
    expect(statuses).toContain('external');
  });

  it('should support all confidence values', () => {
    const confidences: Array<TargetMatchResult['confidence']> = [
      'delivery_key',
      'schema_label',
      'none',
    ];

    expect(confidences).toContain('delivery_key');
    expect(confidences).toContain('schema_label');
    expect(confidences).toContain('none');
  });
});

describe('BodyTransformOptions phase types', () => {
  it('should only accept phase 1 or 2', () => {
    const phase1: BodyTransformOptions['phase'] = 1;
    const phase2: BodyTransformOptions['phase'] = 2;

    expect(phase1).toBe(1);
    expect(phase2).toBe(2);
  });
});
