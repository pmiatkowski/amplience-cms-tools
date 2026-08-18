import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import * as contentReferenceModule from '../content-reference';
import { recreateContentItems } from './recreate-content-items';
import type { ResolverResult } from '../content-reference';
import type { ContentItemRecreationPreflightReady } from './preflight-content-item-recreation';

type ViMock = ReturnType<typeof vi.fn>;
const realTransformBodyReferences = contentReferenceModule.transformBodyReferences;

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
  let nullifyReferencesMock: ViMock;
  let readyPreflight: ContentItemRecreationPreflightReady;
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

    if (options?.hierarchy) {
      body._meta = { ...(body._meta as Record<string, unknown>), hierarchy: options.hierarchy };
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

  const createMockTargetItem = (id: string, label: string): Amplience.ContentItemWithDetails =>
    ({
      id,
      label,
      body: { _meta: { schema: 'https://schema.example.com/test' } },
      version: 1,
      contentRepositoryId: 'target-repo-id',
      createdBy: 'test-user',
      lastModifiedBy: 'test-user',
    }) as Amplience.ContentItemWithDetails;

  const baseParams = {
    sourceService,
    targetService,
    itemsWithFolders: [{ itemId: 'source-item-1', sourceFolderId: 'source-folder-1' }],
    targetRepositoryId: 'target-repo-id',
    folderMapping: new Map([['source-folder-1', 'target-folder-1']]),
    sourceRepositoryId: 'source-repo-id',
  };

  const createReadyPreflight = (
    referenceResolution: ResolverResult,
    overrides: Partial<
      Pick<
        ContentItemRecreationPreflightReady,
        'sourceRepositoryId' | 'targetRepositoryId' | 'initialItemIds'
      >
    > = {}
  ): ContentItemRecreationPreflightReady => {
    const initialItemIds = overrides.initialItemIds || ['source-item-1'];

    return {
      status: 'ready',
      sourceRepositoryId: 'source-repo-id',
      targetRepositoryId: 'target-repo-id',
      initialItemIds,
      validation: {
        status: 'valid',
        targetRepositoryId: 'target-repo-id',
        requiredContentTypeUris: ['https://schema.example.com/test'],
      },
      referenceResolution,
      sourceItems: new Map(
        initialItemIds.map(itemId => [itemId, createMockSourceItem(itemId, `Item ${itemId}`)])
      ),
      warnings: [],
      ...overrides,
    };
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
    const referenceResolution: ResolverResult = {
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
    };
    resolveContentReferencesMock = vi.fn().mockResolvedValue(referenceResolution);
    readyPreflight = createReadyPreflight(referenceResolution);
    nullifyReferencesMock = vi.fn(body => body);
    transformBodyReferencesMock = vi.fn(body => body);

    vi.spyOn(contentReferenceModule, 'resolveContentReferences').mockImplementation(
      resolveContentReferencesMock
    );
    vi.spyOn(contentReferenceModule, 'nullifyReferences').mockImplementation(nullifyReferencesMock);
    vi.spyOn(contentReferenceModule, 'transformBodyReferences').mockImplementation(
      transformBodyReferencesMock
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recreateContentItems with reference resolution', () => {
    it('reuses the prepared reference resolution without discovering again', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(resolveContentReferencesMock).not.toHaveBeenCalled();
      expect(sourceService.getContentItemWithDetails).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('should handle circular references with two-phase creation', async () => {
      // Setup circular references
      const circularReferenceResolution: ResolverResult = {
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
      };
      resolveContentReferencesMock.mockResolvedValue(circularReferenceResolution);
      readyPreflight = createReadyPreflight(circularReferenceResolution);

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      // Verify phase 2 update was called
      expect(targetService.updateContentItem).toHaveBeenCalled();
      expect(result.itemsUpdated).toBe(1);
    });

    it('should preserve non-circular references', async () => {
      // Setup non-circular reference resolution
      const nonCircularReferenceResolution: ResolverResult = {
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
      };
      resolveContentReferencesMock.mockResolvedValue(nonCircularReferenceResolution);
      readyPreflight = createReadyPreflight(nonCircularReferenceResolution);

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(transformBodyReferencesMock).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('preserves hierarchy root metadata when creating a root item', async () => {
      const rootItem = createMockSourceItem('source-item-1', 'Hierarchy root', {
        hierarchy: { root: true },
      });
      readyPreflight = {
        ...readyPreflight,
        sourceItems: new Map([['source-item-1', rootItem]]),
      };

      await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        false,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.createContentItem).toHaveBeenCalledWith(
        'target-repo-id',
        expect.objectContaining({
          body: expect.objectContaining({
            _meta: expect.objectContaining({ hierarchy: { root: true } }),
          }),
        })
      );
    });

    it('removes hierarchy parent metadata until child relationships are recreated', async () => {
      const childItem = createMockSourceItem('source-item-1', 'Hierarchy child', {
        hierarchy: { root: false, parentId: 'source-parent' },
      });
      readyPreflight = {
        ...readyPreflight,
        sourceItems: new Map([['source-item-1', childItem]]),
      };

      await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        false,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      const request = vi.mocked(targetService.createContentItem).mock.calls[0][1];
      expect(request.body._meta?.hierarchy).toBeUndefined();
    });

    it('creates initial items in prepared dependency order and maps each dependency for the root', async () => {
      const rootId = '2c24339f-60e6-45c5-a248-355713821caa';
      const componentIds = [
        'cf4efb7a-71a7-4f08-87a1-f90cdbfaaf63',
        '59a0da7c-3737-4667-b90b-8ac906a490c8',
        '2c4660b0-a0ed-444f-bde8-3d28a3b5f260',
      ];
      const targetIds = ['target-component-one', 'target-component-two', 'target-component-three'];
      const components = componentIds.map((componentId, index) =>
        createMockSourceItem(componentId, `Component ${index + 1}`, {
          publishingStatus: 'UNPUBLISHED',
        })
      );
      const root = createMockSourceItem(rootId, 'Hierarchy root', {
        hierarchy: { root: true },
        publishingStatus: 'UNPUBLISHED',
      });
      root.body.component = componentIds.map(componentId => ({
        id: componentId,
        contentType: 'https://schema.example.com/component',
        _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
      }));

      const itemsWithFolders = [root, ...components].map(item => ({
        itemId: item.id,
        sourceFolderId: `source-folder-${item.id}`,
      }));
      const folderMapping = new Map(
        itemsWithFolders.map(item => [item.sourceFolderId, `target-${item.sourceFolderId}`])
      );
      const initialItemIds = itemsWithFolders.map(item => item.itemId);
      const registry = {
        entries: new Map(),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(initialItemIds),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: initialItemIds.length,
          matchedCount: 0,
          toCreateCount: initialItemIds.length,
          unresolvedCount: initialItemIds.length,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: [...componentIds, rootId],
        },
        registry,
      };
      readyPreflight = {
        ...createReadyPreflight(referenceResolution, { initialItemIds }),
        sourceItems: new Map([root, ...components].map(item => [item.id, item])),
      };
      transformBodyReferencesMock.mockImplementation(realTransformBodyReferences);

      const targetIdBySourceId = new Map([
        ...componentIds.map((componentId, index) => [componentId, targetIds[index]] as const),
        [rootId, 'target-hierarchy-root'] as const,
      ]);
      const sourceIdByLabel = new Map([root, ...components].map(item => [item.label, item.id]));
      const createdItems = new Map<string, Amplience.ContentItemWithDetails>();
      vi.mocked(targetService.createContentItem).mockImplementation(async (_repoId, request) => {
        const sourceId = sourceIdByLabel.get(request.label)!;
        const targetId = targetIdBySourceId.get(sourceId)!;
        const createdItem = {
          ...createMockTargetItem(targetId, request.label),
          body: request.body,
          folderId: request.folderId,
          locale: request.locale,
        } as Amplience.ContentItemWithDetails;
        createdItems.set(targetId, createdItem);

        return { success: true, updatedItem: createdItem };
      });
      vi.mocked(targetService.getContentItemWithDetails).mockImplementation(async targetId => {
        return createdItems.get(targetId) || null;
      });

      await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      const createCalls = vi.mocked(targetService.createContentItem).mock.calls;
      const labels = createCalls.map(([, request]) => request.label);
      expect.soft(labels).toEqual(['Component 1', 'Component 2', 'Component 3', 'Hierarchy root']);

      const rootRequest = createCalls.find(([, request]) => request.label === 'Hierarchy root')![1];
      const rootLinks = rootRequest.body.component as Array<{ id: string }>;
      expect.soft(rootRequest.body._meta?.hierarchy).toEqual({ root: true });
      expect.soft(rootLinks.map(link => link.id)).toEqual(targetIds);
    });

    it('nullifies circular initial references with an empty map then updates with all target IDs', async () => {
      const firstId = 'circular-source-one';
      const secondId = 'circular-source-two';
      const firstItem = createMockSourceItem(firstId, 'Circular one', {
        publishingStatus: 'UNPUBLISHED',
      });
      const secondItem = createMockSourceItem(secondId, 'Circular two', {
        publishingStatus: 'UNPUBLISHED',
      });
      firstItem.body.component = [
        {
          id: secondId,
          contentType: 'https://schema.example.com/component',
          _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
        },
      ];
      secondItem.body.component = [
        {
          id: firstId,
          contentType: 'https://schema.example.com/component',
          _meta: { schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link' },
        },
      ];

      const itemsWithFolders = [firstItem, secondItem].map(item => ({
        itemId: item.id,
        sourceFolderId: `source-folder-${item.id}`,
      }));
      const initialItemIds = itemsWithFolders.map(item => item.itemId);
      const registry = {
        entries: new Map(),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(initialItemIds),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: initialItemIds.length,
          matchedCount: 0,
          toCreateCount: initialItemIds.length,
          unresolvedCount: initialItemIds.length,
          externalCount: 0,
          circularGroups: [[firstId, secondId]],
          registry,
          creationOrder: [firstId, secondId],
        },
        registry,
      };
      readyPreflight = {
        ...createReadyPreflight(referenceResolution, { initialItemIds }),
        sourceItems: new Map([
          [firstId, firstItem],
          [secondId, secondItem],
        ]),
      };
      transformBodyReferencesMock.mockImplementation(realTransformBodyReferences);

      const targetIdBySourceId = new Map([
        [firstId, 'circular-target-one'],
        [secondId, 'circular-target-two'],
      ]);
      const sourceIdByLabel = new Map([
        [firstItem.label, firstId],
        [secondItem.label, secondId],
      ]);
      const creationBodies = new Map<string, Record<string, unknown>>();
      const createdItems = new Map<string, Amplience.ContentItemWithDetails>();
      vi.mocked(targetService.createContentItem).mockImplementation(async (_repoId, request) => {
        const sourceId = sourceIdByLabel.get(request.label)!;
        const targetId = targetIdBySourceId.get(sourceId)!;
        creationBodies.set(sourceId, request.body);
        const createdItem = {
          ...createMockTargetItem(targetId, request.label),
          body: request.body,
          folderId: request.folderId,
          locale: request.locale,
        } as Amplience.ContentItemWithDetails;
        createdItems.set(targetId, createdItem);

        return { success: true, updatedItem: createdItem };
      });
      vi.mocked(targetService.getContentItemWithDetails).mockImplementation(async targetId => {
        return createdItems.get(targetId) || null;
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        new Map(
          itemsWithFolders.map(item => [item.sourceFolderId, `target-${item.sourceFolderId}`])
        ),
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect.soft(creationBodies.get(firstId)?.component).toEqual([null]);
      expect.soft(creationBodies.get(secondId)?.component).toEqual([null]);

      const updateBodies = new Map(
        vi
          .mocked(targetService.updateContentItem)
          .mock.calls.map(([targetId, request]) => [targetId, request.body])
      );
      const firstUpdatedLinks = updateBodies.get('circular-target-one')?.component as Array<{
        id: string;
      }>;
      const secondUpdatedLinks = updateBodies.get('circular-target-two')?.component as Array<{
        id: string;
      }>;
      expect.soft(firstUpdatedLinks.map(link => link.id)).toEqual(['circular-target-two']);
      expect.soft(secondUpdatedLinks.map(link => link.id)).toEqual(['circular-target-one']);
      expect(result.itemsUpdated).toBe(2);
    });

    it('creates referenced items in dependency order', async () => {
      const dependency = createMockSourceItem('reference-dependency', 'Dependency');
      const parent = createMockSourceItem('reference-parent', 'Parent', {
        references: ['reference-dependency'],
      });
      const registry = {
        entries: new Map([
          [
            'reference-parent',
            {
              sourceItem: parent,
              references: [],
              referencesTo: ['reference-dependency'],
              referencedBy: [],
              processed: false,
            },
          ],
          [
            'reference-dependency',
            {
              sourceItem: dependency,
              references: [],
              referencesTo: [],
              referencedBy: ['reference-parent'],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['reference-parent', 'reference-dependency']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 3,
          matchedCount: 0,
          toCreateCount: 3,
          unresolvedCount: 2,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-dependency', 'reference-parent', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = createReadyPreflight(referenceResolution);
      vi.mocked(targetService.createContentItem).mockImplementation(async (_repoId, request) => ({
        success: true,
        updatedItem: createMockTargetItem(`target-${request.label}`, request.label),
      }));

      await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      const labels = vi
        .mocked(targetService.createContentItem)
        .mock.calls.map(([, request]) => request.label);
      expect(labels.slice(0, 2)).toEqual(['Dependency', 'Parent']);
    });

    it('does not create dependent initial items after a required reference fails', async () => {
      const referencedRoot = createMockSourceItem('reference-root', 'Referenced root', {
        hierarchy: { root: true },
      });
      const registry = {
        entries: new Map([
          [
            'source-item-1',
            {
              sourceItem: createMockSourceItem('source-item-1', 'Dependent item', {
                references: ['reference-root'],
              }),
              references: [],
              referencesTo: ['reference-root'],
              referencedBy: [],
              processed: false,
            },
          ],
          [
            'reference-root',
            {
              sourceItem: referencedRoot,
              references: [],
              referencesTo: [],
              referencedBy: ['source-item-1'],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['source-item-1', 'reference-root']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 0,
          toCreateCount: 2,
          unresolvedCount: 2,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-root', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = {
        ...createReadyPreflight(referenceResolution),
        sourceItems: new Map([
          [
            'source-item-1',
            createMockSourceItem('source-item-1', 'Dependent item', {
              references: ['reference-root'],
            }),
          ],
          ['reference-root', referencedRoot],
        ]),
      };
      vi.mocked(targetService.createContentItem).mockResolvedValue({
        success: false,
        error: 'API Error: 403 Forbidden',
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.createContentItem).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.itemsCreated).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('includes recursively created referenced items in execution totals', async () => {
      const referencedItem = createMockSourceItem('reference-item', 'Referenced item');
      const registry = {
        entries: new Map([
          [
            'reference-item',
            {
              sourceItem: referencedItem,
              references: [],
              referencesTo: [],
              referencedBy: [],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['reference-item']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 0,
          toCreateCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-item', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = {
        ...createReadyPreflight(referenceResolution),
        referenceSummary: {
          totalDiscovered: 2,
          matchedReferences: 0,
          itemsToCreate: 2,
          externalReferences: 0,
          circularGroups: 0,
        },
      };

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.createContentItem).toHaveBeenCalledTimes(2);
      expect(result.itemsCreated).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('includes referenced item creation failures in execution totals', async () => {
      const referencedItem = createMockSourceItem('reference-item', 'Referenced item');
      const registry = {
        entries: new Map([
          [
            'reference-item',
            {
              sourceItem: referencedItem,
              references: [],
              referencesTo: [],
              referencedBy: [],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['reference-item']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 0,
          toCreateCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-item', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = createReadyPreflight(referenceResolution);
      vi.mocked(targetService.createContentItem)
        .mockResolvedValueOnce({ success: false, error: 'Referenced creation failed' })
        .mockResolvedValueOnce({
          success: true,
          updatedItem: createMockTargetItem('target-item-1', 'Test Item'),
        });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(result.success).toBe(false);
      expect(targetService.createContentItem).toHaveBeenCalledTimes(1);
      expect(result.itemsCreated).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('counts referenced delivery key assignment failures as operation failures', async () => {
      const referencedItem = createMockSourceItem('reference-item', 'Referenced item', {
        deliveryKey: 'referenced-item-key',
      });
      const registry = {
        entries: new Map([
          [
            'reference-item',
            {
              sourceItem: referencedItem,
              references: [],
              referencesTo: [],
              referencedBy: [],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['reference-item']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 0,
          toCreateCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-item', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = createReadyPreflight(referenceResolution);
      vi.mocked(targetService.assignDeliveryKey).mockResolvedValue(false);

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.createContentItem).toHaveBeenCalledTimes(2);
      expect(targetService.assignDeliveryKey).toHaveBeenCalledWith(
        'target-item-1',
        'referenced-item-key',
        1
      );
      expect(result.success).toBe(false);
      expect(result.itemsCreated).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('does not reassign a referenced item delivery key already applied during creation', async () => {
      const referencedItem = createMockSourceItem('reference-item', 'Referenced item', {
        deliveryKey: 'referenced-item-key',
      });
      const registry = {
        entries: new Map([
          [
            'reference-item',
            {
              sourceItem: referencedItem,
              references: [],
              referencesTo: [],
              referencedBy: [],
              processed: false,
            },
          ],
        ]),
        sourceToTargetIdMap: new Map<string, string>(),
        unresolvedIds: new Set(['reference-item']),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 0,
          toCreateCount: 2,
          unresolvedCount: 1,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-item', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = createReadyPreflight(referenceResolution);
      const createdReference = createMockTargetItem('target-reference', 'Referenced item');
      createdReference.body._meta = {
        ...createdReference.body._meta,
        deliveryKey: 'referenced-item-key',
      };
      vi.mocked(targetService.createContentItem).mockResolvedValueOnce({
        success: true,
        updatedItem: createdReference,
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.assignDeliveryKey).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(2);
    });

    it('publishes a matched referenced item left unpublished by a prior partial run', async () => {
      const referencedItem = createMockSourceItem('reference-item', 'Referenced item', {
        deliveryKey: 'referenced-item-key',
      });
      const matchedTarget = createMockTargetItem('target-reference', 'Referenced item');
      matchedTarget.body._meta = {
        ...matchedTarget.body._meta,
        deliveryKey: 'referenced-item-key',
      };
      matchedTarget.publishingStatus = 'NONE' as Amplience.PublishingStatus;
      const registry = {
        entries: new Map([
          [
            'reference-item',
            {
              sourceItem: referencedItem,
              references: [],
              referencesTo: [],
              referencedBy: [],
              processed: false,
              targetId: 'target-reference',
            },
          ],
        ]),
        sourceToTargetIdMap: new Map([['reference-item', 'target-reference']]),
        unresolvedIds: new Set<string>(),
        externalReferenceIds: new Set<string>(),
      };
      const referenceResolution: ResolverResult = {
        success: true,
        resolution: {
          totalDiscovered: 2,
          matchedCount: 1,
          toCreateCount: 1,
          unresolvedCount: 0,
          externalCount: 0,
          circularGroups: [],
          registry,
          creationOrder: ['reference-item', 'source-item-1'],
        },
        registry,
      };
      readyPreflight = createReadyPreflight(referenceResolution);
      vi.mocked(targetService.getContentItemWithDetails).mockImplementation(async itemId =>
        itemId === 'target-reference'
          ? matchedTarget
          : createMockTargetItem('target-item-1', 'Test Item')
      );

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(targetService.assignDeliveryKey).not.toHaveBeenCalled();
      expect(targetService.publishContentItem).toHaveBeenCalledWith('target-reference');
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
        false, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(resolveContentReferencesMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('rejects a preflight prepared for another source repository before mutation', async () => {
      const mismatchedPreflight = {
        ...readyPreflight,
        sourceRepositoryId: 'different-source-repo',
      };

      await expect(
        recreateContentItems(
          sourceService,
          targetService,
          baseParams.itemsWithFolders,
          baseParams.targetRepositoryId,
          baseParams.folderMapping,
          undefined,
          undefined,
          true,
          baseParams.sourceRepositoryId,
          mismatchedPreflight
        )
      ).rejects.toThrow('Preflight source repository does not match recreation request');
      expect(targetService.createContentItem).not.toHaveBeenCalled();
    });

    it('nullifies references when relaxed preflight discovery failed', async () => {
      const failedReferenceResolution: ResolverResult = {
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
        failurePhase: 'discovery',
      };
      readyPreflight = createReadyPreflight(failedReferenceResolution);

      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        true, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(resolveContentReferencesMock).not.toHaveBeenCalled();
      expect(nullifyReferencesMock).toHaveBeenCalled();
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
        baseParams.sourceRepositoryId,
        readyPreflight
      );

      expect(result.referenceResolution).toBeDefined();
      expect(result.referenceResolution?.totalDiscovered).toBe(1);
    });

    it('rejects a preflight prepared for a different initial item set before mutation', async () => {
      const mismatchedPreflight = {
        ...readyPreflight,
        initialItemIds: ['different-item'],
      };

      await expect(
        recreateContentItems(
          sourceService,
          targetService,
          baseParams.itemsWithFolders,
          baseParams.targetRepositoryId,
          baseParams.folderMapping,
          undefined,
          undefined,
          true,
          baseParams.sourceRepositoryId,
          mismatchedPreflight
        )
      ).rejects.toThrow('Preflight item set does not match recreation request');
      expect(targetService.createContentItem).not.toHaveBeenCalled();
    });

    it('rejects a preflight prepared for another target repository before mutation', async () => {
      const mismatchedPreflight = {
        ...readyPreflight,
        targetRepositoryId: 'different-target-repo',
      };

      await expect(
        recreateContentItems(
          sourceService,
          targetService,
          baseParams.itemsWithFolders,
          baseParams.targetRepositoryId,
          baseParams.folderMapping,
          undefined,
          undefined,
          true,
          baseParams.sourceRepositoryId,
          mismatchedPreflight
        )
      ).rejects.toThrow('Preflight target repository does not match recreation request');
      expect(targetService.createContentItem).not.toHaveBeenCalled();
    });

    it('rejects blocked preflight results before mutation', async () => {
      const blockedPreflight = {
        status: 'blocked',
        reason: 'reference-discovery-failed',
        sourceRepositoryId: 'source-repo-id',
        targetRepositoryId: 'target-repo-id',
        initialItemIds: ['source-item-1'],
        error: 'Discovery failed',
      } as unknown as ContentItemRecreationPreflightReady;

      await expect(
        recreateContentItems(
          sourceService,
          targetService,
          baseParams.itemsWithFolders,
          baseParams.targetRepositoryId,
          baseParams.folderMapping,
          undefined,
          undefined,
          true,
          baseParams.sourceRepositoryId,
          blockedPreflight
        )
      ).rejects.toThrow('A ready content item recreation preflight is required');
      expect(targetService.createContentItem).not.toHaveBeenCalled();
    });
  });

  describe('recreateContentItems backward compatibility', () => {
    it('should work with a ready preflight by default', async () => {
      const result = await recreateContentItems(
        sourceService,
        targetService,
        baseParams.itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        true,
        baseParams.sourceRepositoryId,
        readyPreflight
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
        false, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
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
        false, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
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
        false, // resolveReferences
        baseParams.sourceRepositoryId,
        readyPreflight
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

      const executionPreflight = createReadyPreflight(readyPreflight.referenceResolution, {
        initialItemIds: itemsWithFolders.map(item => item.itemId),
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined, // progressBar
        undefined, // targetLocale
        false, // resolveReferences
        baseParams.sourceRepositoryId,
        executionPreflight
      );

      expect(result.itemsCreated).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should cap publish concurrency to configured limit', async () => {
      process.env.PUBLISH_CONCURRENCY = '5';
      const itemsWithFolders = Array.from({ length: 8 }, (_, index) => ({
        itemId: `source-item-${index + 1}`,
        sourceFolderId: 'source-folder-1',
      }));

      vi.mocked(sourceService.getContentItemWithDetails).mockImplementation(async itemId =>
        createMockSourceItem(String(itemId), `Item ${itemId}`)
      );

      vi.mocked(targetService.createContentItem).mockImplementation(async (_repoId, payload) => {
        const label = (payload as Amplience.CreateContentItemRequest).label || 'Item';

        return {
          success: true,
          updatedItem: createMockTargetItem(`target-${label}`, label),
        };
      });

      let inFlight = 0;
      let maxInFlight = 0;
      vi.mocked(targetService.publishContentItem).mockImplementation(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(resolve => setTimeout(resolve, 20));
        inFlight -= 1;

        return { success: true };
      });

      const executionPreflight = createReadyPreflight(readyPreflight.referenceResolution, {
        initialItemIds: itemsWithFolders.map(item => item.itemId),
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        false,
        baseParams.sourceRepositoryId,
        executionPreflight
      );

      expect(result.success).toBe(true);
      expect(targetService.publishContentItem).toHaveBeenCalledTimes(8);
      expect(maxInFlight).toBeLessThanOrEqual(5);

      delete process.env.PUBLISH_CONCURRENCY;
    });

    it('should report failed publishes in publishing summary', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const itemsWithFolders = [
        { itemId: 'source-item-1', sourceFolderId: 'source-folder-1' },
        { itemId: 'source-item-2', sourceFolderId: 'source-folder-1' },
      ];

      vi.mocked(sourceService.getContentItemWithDetails)
        .mockResolvedValueOnce(createMockSourceItem('source-item-1', 'Item 1'))
        .mockResolvedValueOnce(createMockSourceItem('source-item-2', 'Item 2'));

      vi.mocked(targetService.createContentItem)
        .mockResolvedValueOnce({
          success: true,
          updatedItem: createMockTargetItem('target-1', 'Item 1'),
        })
        .mockResolvedValueOnce({
          success: true,
          updatedItem: createMockTargetItem('target-2', 'Item 2'),
        });

      vi.mocked(targetService.publishContentItem)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'API Error: 429 Too Many Requests' });

      const executionPreflight = createReadyPreflight(readyPreflight.referenceResolution, {
        initialItemIds: itemsWithFolders.map(item => item.itemId),
      });

      const result = await recreateContentItems(
        sourceService,
        targetService,
        itemsWithFolders,
        baseParams.targetRepositoryId,
        baseParams.folderMapping,
        undefined,
        undefined,
        false,
        baseParams.sourceRepositoryId,
        executionPreflight
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Publishing completed: 1 successful, 1 failed')
      );
      expect(result.success).toBe(false);
      expect(result.itemsCreated).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.publishFailed).toBe(1);

      consoleLogSpy.mockRestore();
    });
  });
});
