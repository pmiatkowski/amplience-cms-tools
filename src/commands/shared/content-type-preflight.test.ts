import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentItemRecreationPreflightResult } from '~/services/actions';
import { displayContentTypePreflightResult } from './content-type-preflight';

describe('displayContentTypePreflightResult', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const context = {
    sourceRepositoryId: 'source-repo',
    targetRepositoryId: 'target-repo',
    initialItemIds: ['item-1'],
  };

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints each missing URI, item count, label, and ID', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'content-type-validation-failed',
      ...context,
      validation: {
        status: 'invalid',
        targetRepositoryId: 'target-repo',
        requiredContentTypeUris: [
          'https://schema.example.com/category',
          'https://schema.example.com/item',
        ],
        missingContentTypes: [
          {
            contentTypeUri: 'https://schema.example.com/category',
            itemCount: 2,
            items: [
              { id: 'category-1', label: 'Categories' },
              { id: 'category-2', label: 'Subcategories' },
            ],
          },
          {
            contentTypeUri: 'https://schema.example.com/item',
            itemCount: 1,
            items: [{ id: 'item-1', label: 'Press Release' }],
          },
        ],
        itemsWithoutSchema: [],
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('https://schema.example.com/category (2 items)');
    expect(output).toContain('Categories (category-1)');
    expect(output).toContain('Subcategories (category-2)');
    expect(output).toContain('https://schema.example.com/item (1 item)');
    expect(output).toContain('Press Release (item-1)');
    expect(output).toContain('assign these content types to "Newsroom"');
    expect(output).toContain('No target changes were made.');
  });

  it('reports source items whose schema cannot be determined', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'content-type-validation-failed',
      ...context,
      validation: {
        status: 'invalid',
        targetRepositoryId: 'target-repo',
        requiredContentTypeUris: [],
        missingContentTypes: [],
        itemsWithoutSchema: [{ id: 'item-1', label: 'Unknown item' }],
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Could not determine a content type for these source items:');
    expect(output).toContain('Unknown item (item-1)');
  });

  it('reports strict reference discovery failures separately', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'reference-discovery-failed',
      ...context,
      error: 'Discovery API unavailable',
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Reference discovery failed: Discovery API unavailable');
    expect(output).toContain('No target changes were made.');
  });

  it('reports non-discovery reference resolution failures separately', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'reference-resolution-failed',
      ...context,
      phase: 'matching',
      error: 'Target repository unavailable',
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Reference matching failed: Target repository unavailable');
    expect(output).toContain('No target changes were made.');
  });

  it('reports repository assignment lookup failures separately', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'content-type-lookup-failed',
      ...context,
      validation: {
        status: 'lookup-failed',
        targetRepositoryId: 'target-repo',
        error: 'API Error: 403 Forbidden',
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'Could not load content types assigned to "Newsroom": API Error: 403 Forbidden'
    );
  });

  it('prints delivery keys, source items, and existing hub owners', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'delivery-key-conflicts',
      ...context,
      validation: {
        status: 'conflict',
        checkedDeliveryKeys: ['duplicate/key', 'existing/key'],
        conflicts: [
          {
            deliveryKey: 'duplicate/key',
            sourceItems: [
              { id: 'item-1', label: 'First source' },
              { id: 'item-2', label: 'Second source' },
            ],
          },
          {
            deliveryKey: 'existing/key',
            sourceItems: [{ id: 'item-3', label: 'Third source' }],
            targetItem: {
              id: 'target-item',
              label: 'Existing target',
              contentRepositoryId: 'other-repository',
            },
          },
        ],
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Delivery keys must be unique across the target hub');
    expect(output).toContain('duplicate/key');
    expect(output).toContain('First source (item-1)');
    expect(output).toContain('Second source (item-2)');
    expect(output).toContain('multiple source items');
    expect(output).toContain('existing/key');
    expect(output).toContain('Third source (item-3)');
    expect(output).toContain(
      'Existing target: Existing target (target-item, repository other-repository)'
    );
    expect(output).toContain('No target changes were made.');
  });

  it('identifies direct target-hub delivery-key lookup failures', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'delivery-key-lookup-failed',
      ...context,
      validation: {
        status: 'lookup-failed',
        stage: 'direct-lookup',
        checkedDeliveryKeys: [],
        deliveryKey: 'restricted/key',
        error: 'API Error: 401 Unauthorized',
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'Direct target-hub lookup failed for delivery key "restricted/key": API Error: 401 Unauthorized'
    );
    expect(output).toContain('No target changes were made.');
  });

  it('identifies the repository where complete delivery-key inventory failed', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'delivery-key-lookup-failed',
      ...context,
      validation: {
        status: 'lookup-failed',
        stage: 'repository-inventory',
        checkedDeliveryKeys: [],
        deliveryKey: 'unresolved/key',
        repositoryId: 'archive-repo',
        repositoryLabel: 'Archive Repository',
        error: 'API Error: 500 ARCHIVED fetch failed',
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'Complete target-hub delivery-key inventory failed while scanning Archive Repository (archive-repo): API Error: 500 ARCHIVED fetch failed'
    );
    expect(output).toContain('No target changes were made.');
  });

  it('identifies target-hub repository listing failures before inventory', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'delivery-key-lookup-failed',
      ...context,
      validation: {
        status: 'lookup-failed',
        stage: 'repository-inventory',
        checkedDeliveryKeys: [],
        deliveryKey: 'unresolved/key',
        error: 'API Error: 500 Repository listing failed',
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'Target-hub repositories could not be listed for complete delivery-key inventory: API Error: 500 Repository listing failed'
    );
    expect(output).toContain('No target changes were made.');
  });

  it('retains the generic fallback for legacy delivery-key lookup failures', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'delivery-key-lookup-failed',
      ...context,
      validation: {
        status: 'lookup-failed',
        checkedDeliveryKeys: [],
        deliveryKey: 'restricted/key',
        error: 'API Error: 403 Forbidden',
      },
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'Could not verify delivery key "restricted/key" across the target hub: API Error: 403 Forbidden'
    );
    expect(output).toContain('No target changes were made.');
  });

  it('reports unavailable source items separately', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'source-items-unavailable',
      ...context,
      missingItemIds: ['item-1', 'item-2'],
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Could not load these source items: item-1, item-2');
  });

  it('prints relaxed-mode warnings and the successful validation summary', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'ready',
      ...context,
      validation: {
        status: 'valid',
        targetRepositoryId: 'target-repo',
        requiredContentTypeUris: [
          'https://schema.example.com/category',
          'https://schema.example.com/item',
        ],
      },
      referenceResolution: {} as ContentItemRecreationPreflightResult extends {
        status: 'ready';
        referenceResolution: infer Resolution;
      }
        ? Resolution
        : never,
      sourceItems: new Map(),
      warnings: ['Reference discovery was incomplete.'],
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    expect(warnSpy).toHaveBeenCalledWith('⚠️  Reference discovery was incomplete.');
    expect(logSpy).toHaveBeenCalledWith(
      '✓ Content type preflight passed: 2 required content types are assigned to "Newsroom".'
    );
  });

  it('prints the prepared reference discovery summary before confirmation', () => {
    const result: ContentItemRecreationPreflightResult = {
      status: 'ready',
      ...context,
      validation: {
        status: 'valid',
        targetRepositoryId: 'target-repo',
        requiredContentTypeUris: ['https://schema.example.com/item'],
      },
      referenceResolution: {
        success: true,
        resolution: {
          totalDiscovered: 99,
          matchedCount: 98,
          toCreateCount: 1,
          unresolvedCount: 0,
          externalCount: 1,
          circularGroups: [['item-1', 'item-2']],
          registry: {
            entries: new Map(),
            sourceToTargetIdMap: new Map(),
            unresolvedIds: new Set(),
            externalReferenceIds: new Set(['external-item']),
          },
          creationOrder: [],
        },
        registry: {
          entries: new Map(),
          sourceToTargetIdMap: new Map(),
          unresolvedIds: new Set(),
          externalReferenceIds: new Set(['external-item']),
        },
      },
      referenceSummary: {
        totalDiscovered: 8,
        matchedReferences: 3,
        itemsToCreate: 4,
        externalReferences: 1,
        circularGroups: 1,
      },
      sourceItems: new Map(),
      warnings: [],
    };

    displayContentTypePreflightResult(result, 'Newsroom');

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('Reference discovery summary:');
    expect(output).toContain('Discovered: 8');
    expect(output).toContain('Already matched references in target: 3');
    expect(output).toContain('Need to create: 4');
    expect(output).toContain('External references: 1');
    expect(output).toContain('Circular reference groups: 1');
  });
});
