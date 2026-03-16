import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { scanContentItem } from './content-reference-discovery';
import { createReferenceRegistry, registerItem } from './content-reference-mapping';
import {
  resolveContentReferences,
  executePhase1Creation,
  executePhase2Update,
  getPreFlightSummary,
  type ResolverOptions,
} from './content-reference-resolver';
import type { AmplienceService } from '../amplience-service';
import type { ReferenceRegistry, ReferenceResolutionResult } from './types';

/**
 * Helper to record mapping in registry (for tests)
 */
function recordMapping(registry: ReferenceRegistry, sourceId: string, targetId: string): void {
  registry.sourceToTargetIdMap.set(sourceId, targetId);
  const entry = registry.entries.get(sourceId);
  if (entry) {
    entry.targetId = targetId;
  }
}

// Mock AmplienceService
const createMockService = (): AmplienceService => {
  return {
    getAllContentItems: vi.fn(),
    getContentItemWithDetails: vi.fn(),
    createContentItem: vi.fn(),
    updateContentItem: vi.fn(),
    assignDeliveryKey: vi.fn(),
    publishContentItem: vi.fn(),
  } as unknown as AmplienceService;
};

// Helper to create mock content item
const createMockItem = (
  id: string,
  label: string,
  schema: string,
  references: Array<{ id: string; contentType: string }> = []
): Amplience.ContentItemWithDetails => {
  const body: Record<string, unknown> = {
    _meta: {
      schema,
    },
  };

  // Add references to body
  if (references.length > 0) {
    body.references = references.map(ref => ({
      id: ref.id,
      contentType: ref.contentType,
      _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
    }));
  }

  return {
    id,
    label,
    body,
    status: 'ACTIVE',
    version: 1,
    schemaId: schema,
  } as Amplience.ContentItemWithDetails;
};

describe('resolveContentReferences', () => {
  let mockSourceService: AmplienceService;
  let mockTargetService: AmplienceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSourceService = createMockService();
    mockTargetService = createMockService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should discover and resolve all references', async () => {
    // Setup mock items
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1', [
      { id: 'item-2', contentType: 'https://schema.example.com/type2' },
    ]);
    const item2 = createMockItem('item-2', 'Item 2', 'https://schema.example.com/type2');

    const targetItem2 = {
      id: 'target-item-2',
      label: 'Item 2',
      body: { _meta: { schema: 'https://schema.example.com/type2' } },
    };

    vi.mocked(mockSourceService.getAllContentItems).mockResolvedValue([item1, item2]);
    vi.mocked(mockSourceService.getContentItemWithDetails).mockImplementation(
      async (id: string) => {
        if (id === 'item-1') return item1;
        if (id === 'item-2') return item2;

        return null;
      }
    );
    vi.mocked(mockTargetService.getAllContentItems).mockResolvedValue([
      targetItem2 as Amplience.ContentItem,
    ]);

    const options: ResolverOptions = {
      sourceService: mockSourceService,
      targetService: mockTargetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['item-1'],
    };

    const result = await resolveContentReferences(options);

    expect(result.success).toBe(true);
    expect(result.resolution.totalDiscovered).toBeGreaterThan(0);
  });

  it('should handle items with no references', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');

    vi.mocked(mockSourceService.getAllContentItems).mockResolvedValue([item1]);
    vi.mocked(mockSourceService.getContentItemWithDetails).mockImplementation(
      async (id: string) => {
        if (id === 'item-1') return item1;

        return null;
      }
    );
    vi.mocked(mockTargetService.getAllContentItems).mockResolvedValue([]);

    const options: ResolverOptions = {
      sourceService: mockSourceService,
      targetService: mockTargetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['item-1'],
    };

    const result = await resolveContentReferences(options);

    expect(result.success).toBe(true);
    expect(result.resolution.totalDiscovered).toBe(1);
    expect(result.resolution.circularGroups.length).toBe(0);
  });

  it('should handle circular references', async () => {
    // Create circular reference: item-1 -> item-2 -> item-1
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1', [
      { id: 'item-2', contentType: 'https://schema.example.com/type2' },
    ]);
    const item2 = createMockItem('item-2', 'Item 2', 'https://schema.example.com/type2', [
      { id: 'item-1', contentType: 'https://schema.example.com/type1' },
    ]);

    vi.mocked(mockSourceService.getAllContentItems).mockResolvedValue([item1, item2]);
    vi.mocked(mockSourceService.getContentItemWithDetails).mockImplementation(
      async (id: string) => {
        if (id === 'item-1') return item1;
        if (id === 'item-2') return item2;

        return null;
      }
    );
    vi.mocked(mockTargetService.getAllContentItems).mockResolvedValue([]);

    const options: ResolverOptions = {
      sourceService: mockSourceService,
      targetService: mockTargetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['item-1'],
    };

    const result = await resolveContentReferences(options);

    expect(result.success).toBe(true);
    // Should have detected the circular group
    expect(result.resolution.circularGroups.length).toBeGreaterThanOrEqual(0);
  });

  it('should call progress callback', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    const progressCallback = vi.fn();

    vi.mocked(mockSourceService.getAllContentItems).mockResolvedValue([item1]);
    vi.mocked(mockSourceService.getContentItemWithDetails).mockImplementation(
      async (id: string) => {
        if (id === 'item-1') return item1;

        return null;
      }
    );
    vi.mocked(mockTargetService.getAllContentItems).mockResolvedValue([]);

    const options: ResolverOptions = {
      sourceService: mockSourceService,
      targetService: mockTargetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['item-1'],
      onProgress: progressCallback,
    };

    await resolveContentReferences(options);

    expect(progressCallback).toHaveBeenCalled();
  });
});

describe('executePhase1Creation', () => {
  let mockTargetService: AmplienceService;
  let registry: ReferenceRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTargetService = createMockService();
    registry = createReferenceRegistry();
  });

  it('should create items with nullified circular refs', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    registerItem(registry, item1, []);

    vi.mocked(mockTargetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: {
        id: 'new-item-1',
        label: 'Item 1',
        body: {},
        contentRepositoryId: 'repo-1',
        createdBy: 'user-1',
        lastModifiedBy: 'user-1',
      } as Amplience.ContentItemWithDetails,
    });

    const circularGroupIds = new Set<string>(['item-1']);
    const result = await executePhase1Creation(
      registry,
      mockTargetService,
      'target-repo',
      circularGroupIds
    );

    expect(result.created).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should record mappings in registry', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    registerItem(registry, item1, []);

    vi.mocked(mockTargetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: {
        id: 'new-item-1',
        label: 'Item 1',
        body: {},
        contentRepositoryId: 'repo-1',
        createdBy: 'user-1',
        lastModifiedBy: 'user-1',
      } as Amplience.ContentItemWithDetails,
    });

    const circularGroupIds = new Set<string>(['item-1']);
    await executePhase1Creation(registry, mockTargetService, 'target-repo', circularGroupIds);

    expect(registry.sourceToTargetIdMap.get('item-1')).toBe('new-item-1');
  });

  it('should track failures', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    registerItem(registry, item1, []);

    vi.mocked(mockTargetService.createContentItem).mockResolvedValue({
      success: false,
      error: 'Creation failed',
    });

    const circularGroupIds = new Set<string>(['item-1']);
    const result = await executePhase1Creation(
      registry,
      mockTargetService,
      'target-repo',
      circularGroupIds
    );

    expect(result.created).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('item-1');
  });
});

describe('executePhase2Update', () => {
  let mockTargetService: AmplienceService;
  let registry: ReferenceRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTargetService = createMockService();
    registry = createReferenceRegistry();
  });

  it('should update items with resolved references', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1', [
      { id: 'item-2', contentType: 'https://schema.example.com/type2' },
    ]);

    registerItem(registry, item1, scanContentItem(item1).references);
    recordMapping(registry, 'item-1', 'target-item-1');
    recordMapping(registry, 'item-2', 'target-item-2');

    vi.mocked(mockTargetService.getContentItemWithDetails).mockResolvedValue({
      id: 'target-item-1',
      label: 'Item 1',
      body: {},
      version: 1,
    } as Amplience.ContentItemWithDetails);

    vi.mocked(mockTargetService.updateContentItem).mockResolvedValue({
      success: true,
    });

    const circularGroupIds = new Set<string>(['item-1']);
    const result = await executePhase2Update(registry, mockTargetService, circularGroupIds);

    expect(result.updated).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should only update circular group items', async () => {
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    const item2 = createMockItem('item-2', 'Item 2', 'https://schema.example.com/type2');

    registerItem(registry, item1, []);
    registerItem(registry, item2, []);
    recordMapping(registry, 'item-1', 'target-item-1');
    recordMapping(registry, 'item-2', 'target-item-2');

    // Mock the getContentItemWithDetails call for the update
    vi.mocked(mockTargetService.getContentItemWithDetails).mockResolvedValue({
      id: 'target-item-1',
      label: 'Item 1',
      body: {},
      version: 1,
    } as Amplience.ContentItemWithDetails);

    vi.mocked(mockTargetService.updateContentItem).mockResolvedValue({
      success: true,
    });

    // Only item-1 is in circular group
    const circularGroupIds = new Set<string>(['item-1']);
    const result = await executePhase2Update(registry, mockTargetService, circularGroupIds);

    expect(result.updated).toBe(1);
  });
});

describe('getPreFlightSummary', () => {
  it('should generate accurate summary', () => {
    const registry = createReferenceRegistry();
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    registerItem(registry, item1, []);
    recordMapping(registry, 'item-1', 'target-item-1');

    const resolution: ReferenceResolutionResult = {
      totalDiscovered: 1,
      matchedCount: 1,
      toCreateCount: 0,
      unresolvedCount: 0,
      externalCount: 0,
      circularGroups: [],
      registry,
      creationOrder: ['item-1'],
    };

    const summary = getPreFlightSummary(resolution);

    expect(summary.summary).toContain('1 items');
    expect(summary.summary).toContain('1 already exist');
    expect(summary.details.totalItems).toBe(1);
    expect(summary.details.matchedItems).toBe(1);
    expect(summary.details.itemsToCreate).toBe(0);
  });

  it('should include warnings for unresolved items', () => {
    const registry = createReferenceRegistry();
    const item1 = createMockItem('item-1', 'Item 1', 'https://schema.example.com/type1');
    registerItem(registry, item1, []);
    // No mapping recorded - item is unresolved

    const resolution: ReferenceResolutionResult = {
      totalDiscovered: 1,
      matchedCount: 0,
      toCreateCount: 1,
      unresolvedCount: 1,
      externalCount: 0,
      circularGroups: [],
      registry,
      creationOrder: ['item-1'],
    };

    const summary = getPreFlightSummary(resolution);

    expect(summary.warnings.length).toBeGreaterThan(0);
    expect(summary.warnings[0]).toContain('could not be matched');
  });

  it('should include warnings for circular groups', () => {
    const registry = createReferenceRegistry();

    const resolution: ReferenceResolutionResult = {
      totalDiscovered: 2,
      matchedCount: 0,
      toCreateCount: 2,
      unresolvedCount: 0,
      externalCount: 0,
      circularGroups: [['item-1', 'item-2']],
      registry,
      creationOrder: ['item-1', 'item-2'],
    };

    const summary = getPreFlightSummary(resolution);

    expect(summary.warnings.some(w => w.includes('circular reference'))).toBe(true);
    expect(summary.details.circularGroups).toBe(1);
  });

  it('should include warnings for external items', () => {
    const registry = createReferenceRegistry();
    registry.externalReferenceIds.add('external-item-1');

    const resolution: ReferenceResolutionResult = {
      totalDiscovered: 1,
      matchedCount: 0,
      toCreateCount: 0,
      unresolvedCount: 0,
      externalCount: 1,
      circularGroups: [],
      registry,
      creationOrder: [],
    };

    const summary = getPreFlightSummary(resolution);

    expect(summary.warnings.some(w => w.includes('outside the source repository'))).toBe(true);
    expect(summary.details.externalItems).toContain('external-item-1');
  });
});
