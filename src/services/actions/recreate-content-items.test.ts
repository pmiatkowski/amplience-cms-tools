import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import * as contentReferenceModule from '../content-reference';
import {
  recreateContentItems,
} from './recreate-content-items';

type ViMock = ReturnType<typeof vi.fn>;

// Mock dependencies
vi.mock('~/utils', () => ({
  createProgressBar: vi.fn(() => ({
    start: vi.fn(),
    increment: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('recreateContentItems', () => {
  const sourceService = {
    getRepositories: vi.fn(),
    getContentItemWithDetails: vi.fn(),
    getAllContentItems: vi.fn(),
  } as unknown as AmplienceService;

  const targetService = {
    getRepositories: vi.fn(),
    createContentItem: vi.fn(),
    getContentItemWithDetails: vi.fn(),
    assignDeliveryKey: vi.fn(),
    publishContentItem: vi.fn(),
    updateContentItem: vi.fn(),
    createHierarchyNode: vi.fn(),
  } as unknown as AmplienceService;

  let resolveContentReferencesMock: ViMock;
  let transformBodyReferencesMock: ViMock;

  const createMockSourceItem = (
    id: string,
    label: string,
    options?: {
      deliveryKey?: string;
      references?: string[];
      status?: string;
      publishingStatus?: string;
      hierarchy?: { root?: boolean; parentId?: string };
    }
  ): Amplience.ContentItemWithDetails => {
    const body: Record<string, unknown> = {
      _meta: {
        schema: 'https://schema.example.com/test',
      },
    };

    if (options?.deliveryKey) {
      body._meta = { ...(body._meta as Record<string, unknown>), deliveryKey: options.deliveryKey };
    }

    if (options?.references && options.references.length > 0) {
      body.component = options.references.map(refId => ({
        id: refId,
        contentType: 'https://schema.example.com/component',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference' },
      }));
    }

    return {
      id,
      label,
      body,
      version: 1,
      schemaId: 'https://schema.example.com/test',
      status: options?.status || 'ACTIVE',
      publishingStatus: options?.publishingStatus || 'LATEST',
      locale: 'en-US',
      hierarchy: options?.hierarchy,
    } as Amplience.ContentItemWithDetails;
  };

  const createMockTargetItem = (
    id: string,
    label: string
  ): Amplience.ContentItemWithDetails => ({
    id,
    label,
    body: { _meta: { schema: 'https://schema.example.com/test' } },
    contentRepositoryId: 'target-repo-id',
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
  } as Amplience.ContentItemWithDetails);

  const baseParams = {
    sourceService,
    targetService,
    itemsWithFolders: [{ itemId: 'source-item-1', sourceFolderId: 'source-folder-1' }],
    targetRepositoryId: 'target-repo-id',
    folderMapping: new Map([['source-folder-1', 'target-folder-1']]),
    sourceRepositoryId: 'source-repo-id',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(sourceService.getRepositories).mockResolvedValue([
      { id: 'source-repo-id', label: 'Source Repo' },
    ] as Amplience.ContentRepository[]);
    vi.mocked(targetService.getRepositories).mockResolvedValue([
      {
        id: 'target-repo-id',
        label: 'Target Repo',
        contentTypes: [{ contentTypeUri: 'https://schema.example.com/test' }],
      },
    ] as Amplience.ContentRepository[]);

    const sourceItem = createMockSourceItem('source-item-1', 'Test Item');
    vi.mocked(sourceService.getContentItemWithDetails).mockResolvedValue(sourceItem);

    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: createMockTargetItem('target-item-1', 'Test Item'),
    });
    vi.mocked(targetService.getContentItemWithDetails).mockResolvedValue(
      createMockTargetItem('target-item-1', 'Test Item')
    );
    vi.mocked(targetService.assignDeliveryKey).mockResolvedValue(true);
    vi.mocked(targetService.publishContentItem).mockResolvedValue({ success: true });
    vi.mocked(targetService.updateContentItem).mockResolvedValue({ success: true });

    // Mock content reference module
    resolveContentReferencesMock = vi.fn().mockResolvedValue({
      success: true,
      resolution: {
        totalDiscovered: 1,
        matchedCount: 0,
        toCreateCount: 1,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry: {
          entries: new Map(),
          sourceToTargetIdMap: new Map([['source-item-1', 'target-item-1']]),
          unresolvedIds: new Set(),
          externalReferenceIds: new Set(),
        },
        creationOrder: ['source-item-1'],
      },
      registry: {
        entries: new Map(),
        sourceToTargetIdMap: new Map([['source-item-1', 'target-item-1']]),
        unresolvedIds: new Set(),
        externalReferenceIds: new Set(),
      },
    });
    transformBodyReferencesMock = vi.fn((body) => body);

    vi.spyOn(contentReferenceModule, 'resolveContentReferences').mockImplementation(
      resolveContentReferencesMock
    );
    vi.spyOn(contentReferenceModule, 'transformBodyReferences').mockImplementation(
      transformBodyReferencesMock
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recreateContentItems with reference resolution', () => {
    it('should resolve content references automatically when enabled', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId
      );

      expect(resolveContentReferencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceService,
          targetService,
          sourceRepositoryId: 'source-repo-id',
          targetRepositoryId: 'target-repo-id',
          initialItemIds: ['source-item-1'],
        })
      );
      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('should handle circular references with two-phase creation', async () => {
      // Setup circular references
      resolveContentReferencesMock.mockResolvedValue({
        success: true,
        resolution: {
          totalDiscovered: 1,
          matchedCount: 0,
          toCreateCount: 1,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroups: [['source-item-1']],
          registry: {
            entries: new Map(),
            sourceToTargetIdMap: new Map([['source-item-1', 'target-item-1']]),
            unresolvedIds: new Set(),
            externalReferenceIds: new Set(),
          },
          creationOrder: ['source-item-1'],
        },
        registry: {
          entries: new Map(),
          sourceToTargetIdMap: new Map([['source-item-1', 'target-item-1']]),
          unresolvedIds: new Set(),
          externalReferenceIds: new Set(),
        },
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId
      );

      // Verify phase 2 update was called
      expect(targetService.updateContentItem).toHaveBeenCalled();
      expect(result.itemsUpdated).toBe(1);
    });

    it('should preserve non-circular references', async () => {
      // Setup non-circular reference resolution
      resolveContentReferencesMock.mockResolvedValue({
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 1,
          toCreateCount: 1,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroups: [], // No circular references
          registry: {
            entries: new Map(),
            sourceToTargetIdMap: new Map([
              ['source-item-1', 'target-item-1'],
              ['ref-item-1', 'target-ref-1'],
            ]),
            unresolvedIds: new Set(),
            externalReferenceIds: new Set(),
          },
          creationOrder: ['ref-item-1', 'source-item-1'],
        },
        registry: {
          entries: new Map(),
          sourceToTargetIdMap: new Map([
            ['source-item-1', 'target-item-1'],
            ['ref-item-1', 'target-ref-1'],
          ]),
          unresolvedIds: new Set(),
          externalReferenceIds: new Set(),
        },
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId
      );

      expect(transformBodyReferencesMock).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should skip resolution when disabled', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false // resolveReferences
      );

      expect(resolveContentReferencesMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('should skip resolution when sourceRepositoryId is not provided', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true // resolveReferences
        // sourceRepositoryId not provided (undefined)
      );

      // Should still succeed but without reference resolution
      expect(result.success).toBe(true);
    });

    it('should continue when reference resolution fails', async () => {
      resolveContentReferencesMock.mockResolvedValue({
        success: false,
        resolution: {
          totalDiscovered: 0,
          matchedCount: 0,
          toCreateCount: 0,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroups: [],
          registry: {
            entries: new Map(),
            sourceToTargetIdMap: new Map(),
            unresolvedIds: new Set(),
            externalReferenceIds: new Set(),
          },
          creationOrder: [],
        },
        registry: {
          entries: new Map(),
          sourceToTargetIdMap: new Map(),
          unresolvedIds: new Set(),
          externalReferenceIds: new Set(),
        },
        error: 'Resolution failed',
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId
      );

      // Should continue without reference resolution
      expect(result.success).toBe(true);
      expect(result.referenceResolution).toBeUndefined();
    });

    it('should return reference resolution result in response', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId
      );

      expect(result.referenceResolution).toBeDefined();
      expect(result.referenceResolution?.totalDiscovered).toBe(1);
    });
  });

  describe('recreateContentItems backward compatibility', () => {
    it('should work without reference resolution by default', async () => {
      // Default should be resolveReferences: true, but without sourceRepositoryId
      // it should skip resolution
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping
        // progressBar, targetLocale, resolveReferences, sourceRepositoryId all use defaults
      );

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('should preserve existing functionality when resolveReferences is false', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false // resolveReferences
      );

      expect(resolveContentReferencesMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.failed).toBe(0);
    });

    it('should handle items without references', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false // resolveReferences
      );

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });
  });

  describe('recreateContentItems error handling', () => {
    it('should handle item creation failure gracefully', async () => {
      vi.mocked(targetService.createContentItem).mockResolvedValue({
        success: false,
        error: 'Creation failed',
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false // resolveReferences
      );

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const itemsWithFolders = [
        { itemId: 'source-item-1', sourceFolderId: 'source-folder-1' },
        { itemId: 'source-item-2', sourceFolderId: 'source-folder-1' },
      ];

      // First item succeeds, second fails
      vi.mocked(targetService.createContentItem)
        .mockResolvedValueOnce({
          success: true,
          updatedItem: createMockTargetItem('target-item-1', 'Item 1'),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Creation failed',
        });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false // resolveReferences
      );

      expect(result.itemsCreated).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
