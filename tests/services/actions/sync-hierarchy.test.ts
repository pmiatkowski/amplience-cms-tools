import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemCleanupResult } from '~/services/actions/archive-content-item';
import type { RemovalPreparationResult } from '~/services/actions/item-removal';
import * as itemRemovalModule from '~/services/actions/item-removal';
import { syncHierarchy, type SyncHierarchyOptions } from '~/services/actions/sync-hierarchy';
import { AmplienceService } from '~/services/amplience-service';
import { HierarchyService } from '~/services/hierarchy-service';

type ViMock = ReturnType<typeof vi.fn>;

let ensureDeletedFolderMock: ViMock;
let prepareItemForRemovalMock: ViMock;
let archivePreparedItemMock: ViMock;

let generateSyncPlanMock: ViMock;

vi.mock('~/utils', () => ({
  createProgressBar: vi.fn(() => ({
    start: vi.fn(),
    increment: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('syncHierarchy removal integration', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = { __service: 'target' } as unknown as AmplienceService;

  const baseOptions: SyncHierarchyOptions = {
    sourceService,
    targetService,
    targetRepositoryId: 'target-repo',
    sourceTree: {} as Amplience.HierarchyNode,
    targetTree: {} as Amplience.HierarchyNode,
    updateContent: false,
    localeStrategy: { strategy: 'keep' },
    publishAfterSync: false,
    isDryRun: false,
  };

  const buildRemovalPlan = (
    removalItems: Array<{
      targetItem?: Partial<Amplience.ContentItem> | null;
      sourceItem?: Partial<Amplience.ContentItem>;
    }>
  ): Amplience.SyncPlan =>
    ({
      itemsToCreate: [],
      itemsToRemove: removalItems.map(item => ({
        action: 'REMOVE',
        sourceItem: {
          id: item.sourceItem?.id ?? 'source-id',
          label: item.sourceItem?.label ?? 'Source Label',
        } as Amplience.ContentItem,
        targetItem: item.targetItem
          ? ({
              id: item.targetItem.id ?? 'target-id',
              label: item.targetItem.label ?? 'Target Label',
            } as Amplience.ContentItem)
          : undefined,
      })),
    }) as unknown as Amplience.SyncPlan;

  const successPreparation = (
    overrides?: Partial<RemovalPreparationResult>
  ): RemovalPreparationResult => ({
    success: true,
    itemId: 'target-id',
    label: 'Target Label',
    deletedFolderId: 'deleted-folder',
    updatedItem: {
      id: 'target-id',
      label: 'Target Label',
      version: 2,
    } as Amplience.ContentItemWithDetails,
    version: 2,
    steps: {
      ensureDeletedFolder: { success: true },
      fetchLatest: { success: true },
      unarchive: { success: true },
      moveToDeleted: { success: true },
    },
    ...overrides,
  });

  const failurePreparation = (
    overrides?: Partial<RemovalPreparationResult>
  ): RemovalPreparationResult => ({
    success: false,
    itemId: 'target-id',
    label: 'Target Label',
    deletedFolderId: 'deleted-folder',
    steps: {
      ensureDeletedFolder: { success: true },
      fetchLatest: { success: false, error: 'fetch failed' },
      unarchive: { success: true },
      moveToDeleted: { success: false, error: 'move failed' },
    },
    error: 'preparation failed',
    ...overrides,
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    ensureDeletedFolderMock = vi.spyOn(
      itemRemovalModule,
      'ensureDeletedFolder'
    ) as unknown as ViMock;
    ensureDeletedFolderMock.mockResolvedValue({ success: true, folderId: 'deleted-folder' });

    prepareItemForRemovalMock = vi.spyOn(
      itemRemovalModule,
      'prepareItemForRemoval'
    ) as unknown as ViMock;
    prepareItemForRemovalMock.mockResolvedValue(successPreparation());

    archivePreparedItemMock = vi.spyOn(
      itemRemovalModule,
      'archivePreparedItem'
    ) as unknown as ViMock;
    archivePreparedItemMock.mockResolvedValue({ overallSuccess: true } as ItemCleanupResult);

    generateSyncPlanMock = vi.spyOn(
      HierarchyService.prototype,
      'generateSyncPlan'
    ) as unknown as ViMock;
    generateSyncPlanMock.mockResolvedValue(buildRemovalPlan([{ targetItem: { id: 'target-id' } }]));

    vi.spyOn(HierarchyService.prototype, 'displaySyncPlan').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses shared removal helpers for each target item', async () => {
    const plan = buildRemovalPlan([
      {
        targetItem: { id: 'target-id', label: 'Target Label' },
        sourceItem: { id: 'source-id', label: 'Source Label' },
      },
    ]);

    generateSyncPlanMock.mockResolvedValueOnce(plan);

    const preparation = successPreparation();
    prepareItemForRemovalMock.mockResolvedValueOnce(preparation);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    consoleSpy.mockRestore();

    expect(ensureDeletedFolderMock).toHaveBeenCalledWith(targetService, 'target-repo', '__deleted');
    expect(prepareItemForRemovalMock).toHaveBeenCalledWith(
      targetService,
      'target-repo',
      'target-id',
      expect.objectContaining({
        deletedFolderId: 'deleted-folder',
        deletedFolderName: '__deleted',
        clearDeliveryKey: true,
        unarchiveIfNeeded: true,
      })
    );
    expect(archivePreparedItemMock).toHaveBeenCalledWith(
      targetService,
      preparation,
      expect.objectContaining({
        unpublishIfNeeded: true,
        unarchiveIfNeeded: true,
      })
    );
  });

  it('records a failure when preparation fails and skips archiving', async () => {
    const plan = buildRemovalPlan([
      {
        targetItem: { id: 'target-id', label: 'Target Label' },
      },
    ]);

    generateSyncPlanMock.mockResolvedValueOnce(plan);
    prepareItemForRemovalMock.mockResolvedValueOnce(failurePreparation());

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    consoleSpy.mockRestore();

    expect(archivePreparedItemMock).not.toHaveBeenCalled();
    expect(prepareItemForRemovalMock.mock.calls[0][3]).toMatchObject({
      deletedFolderId: 'deleted-folder',
    });
  });

  it('skips helper pipeline when target item is missing in the plan', async () => {
    const plan = buildRemovalPlan([
      {
        targetItem: null,
        sourceItem: { id: 'source-only', label: 'Source Label' },
      },
    ]);

    generateSyncPlanMock.mockResolvedValueOnce(plan);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    consoleSpy.mockRestore();

    expect(prepareItemForRemovalMock).not.toHaveBeenCalled();
    expect(archivePreparedItemMock).not.toHaveBeenCalled();
  });
});

describe('syncHierarchy creation operations', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = {
    __service: 'target',
    createContentItem: vi.fn(),
    publishContentItem: vi.fn(),
  } as unknown as AmplienceService;

  const baseOptions: SyncHierarchyOptions = {
    sourceService,
    targetService,
    targetRepositoryId: 'target-repo',
    sourceTree: {} as Amplience.HierarchyNode,
    targetTree: {} as Amplience.HierarchyNode,
    updateContent: false,
    localeStrategy: { strategy: 'keep' },
    publishAfterSync: false,
    isDryRun: false,
  };

  let generateSyncPlanMock: ViMock;

  beforeEach(() => {
    vi.clearAllMocks();

    generateSyncPlanMock = vi.spyOn(
      HierarchyService.prototype,
      'generateSyncPlan'
    ) as unknown as ViMock;

    vi.spyOn(HierarchyService.prototype, 'displaySyncPlan').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create single item successfully', async () => {
    const sourceItem = createTestContentItem({ id: 'source-1', label: 'Test Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [
        {
          action: 'CREATE',
          sourceItem,
          targetParentId: 'parent-id',
        },
      ],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: {
        id: 'new-id',
        label: 'Test Item',
        version: 1,
      } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        label: 'Test Item',
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            hierarchy: {
              root: false,
              parentId: 'parent-id',
            },
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should create multiple items in correct order', async () => {
    const parent = createTestContentItem({ id: 'parent-1', label: 'Parent' });
    const child = createTestContentItem({ id: 'child-1', label: 'Child' });

    const plan: Amplience.SyncPlan = {
      itemsToCreate: [
        {
          action: 'CREATE',
          sourceItem: parent,
          targetParentId: 'root-parent',
        },
        {
          action: 'CREATE',
          sourceItem: child,
          targetParentId: 'parent-1', // Source parent ID
        },
      ],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);

    let callCount = 0;
    vi.mocked(targetService.createContentItem).mockImplementation(async () => {
      callCount++;
      return {
        success: true,
        updatedItem: {
          id: callCount === 1 ? 'new-parent-id' : 'new-child-id',
          label: callCount === 1 ? 'Parent' : 'Child',
          version: 1,
        } as Amplience.ContentItemWithDetails,
      };
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    // Child should use mapped parent ID
    expect(targetService.createContentItem).toHaveBeenCalledTimes(2);
    expect(vi.mocked(targetService.createContentItem).mock.calls[1][1]).toMatchObject({
      body: expect.objectContaining({
        _meta: expect.objectContaining({
          hierarchy: {
            root: false,
            parentId: 'new-parent-id', // Mapped ID
          },
        }),
      }),
    });

    consoleSpy.mockRestore();
  });

  it('should create root item without parentId', async () => {
    const rootItem = createTestContentItem({ id: 'root-1', label: 'Root Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [
        {
          action: 'CREATE',
          sourceItem: rootItem,
          targetParentId: null,
        },
      ],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-root', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            hierarchy: {
              root: true,
              parentId: null,
            },
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should track creation failures', async () => {
    const item = createTestContentItem({ id: 'item-1', label: 'Failing Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: false,
      error: 'Creation failed',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy(baseOptions);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create: Failing Item')
    );

    consoleSpy.mockRestore();
  });
});

describe('syncHierarchy publishing workflow', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = {
    __service: 'target',
    createContentItem: vi.fn(),
    publishContentItem: vi.fn(),
  } as unknown as AmplienceService;

  let generateSyncPlanMock: ViMock;

  beforeEach(() => {
    vi.clearAllMocks();

    generateSyncPlanMock = vi.spyOn(
      HierarchyService.prototype,
      'generateSyncPlan'
    ) as unknown as ViMock;

    vi.spyOn(HierarchyService.prototype, 'displaySyncPlan').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should publish created items when publishAfterSync is enabled', async () => {
    const item = createTestContentItem({ id: 'item-1', label: 'Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-item-id', version: 1 } as Amplience.ContentItemWithDetails,
    });
    vi.mocked(targetService.publishContentItem).mockResolvedValue({ success: true });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: true,
      isDryRun: false,
    });

    expect(targetService.publishContentItem).toHaveBeenCalledWith('new-item-id');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Publishing'));

    consoleSpy.mockRestore();
  });

  it('should not publish when publishAfterSync is disabled', async () => {
    const item = createTestContentItem({ id: 'item-1', label: 'Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-item-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.publishContentItem).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should track publishing failures', async () => {
    const item = createTestContentItem({ id: 'item-1', label: 'Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-item-id', version: 1 } as Amplience.ContentItemWithDetails,
    });
    vi.mocked(targetService.publishContentItem).mockResolvedValue({
      success: false,
      error: 'Publish failed',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: true,
      isDryRun: false,
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to publish'));

    consoleSpy.mockRestore();
  });

  it('should skip publishing when no items were created', async () => {
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: true,
      isDryRun: false,
    });

    expect(targetService.publishContentItem).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('syncHierarchy locale transformation', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = {
    __service: 'target',
    createContentItem: vi.fn(),
  } as unknown as AmplienceService;

  let generateSyncPlanMock: ViMock;

  beforeEach(() => {
    vi.clearAllMocks();

    generateSyncPlanMock = vi.spyOn(
      HierarchyService.prototype,
      'generateSyncPlan'
    ) as unknown as ViMock;

    vi.spyOn(HierarchyService.prototype, 'displaySyncPlan').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should keep delivery key unchanged with keep strategy', async () => {
    const item = createTestContentItem({
      id: 'item-1',
      label: 'Item',
      body: { _meta: { deliveryKey: 'en-GB-content-name' } },
    });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            deliveryKey: 'en-GB-content-name',
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should remove locale prefix with remove strategy', async () => {
    const item = createTestContentItem({
      id: 'item-1',
      label: 'Item',
      body: { _meta: { deliveryKey: 'en-GB-content-name' } },
    });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'remove' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            deliveryKey: 'content-name',
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should replace locale prefix with replace strategy', async () => {
    const item = createTestContentItem({
      id: 'item-1',
      label: 'Item',
      body: { _meta: { deliveryKey: 'en-GB-content-name' } },
    });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'replace', targetLocale: 'fr-FR' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            deliveryKey: 'fr-FR-content-name',
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should handle items without delivery key', async () => {
    const item = createTestContentItem({
      id: 'item-1',
      label: 'Item',
      body: { _meta: {} },
    });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'remove' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.createContentItem).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle complex delivery key with path', async () => {
    const item = createTestContentItem({
      id: 'item-1',
      label: 'Item',
      body: { _meta: { deliveryKey: 'en-GB-content/path/item' } },
    });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    vi.mocked(targetService.createContentItem).mockResolvedValue({
      success: true,
      updatedItem: { id: 'new-id', version: 1 } as Amplience.ContentItemWithDetails,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'replace', targetLocale: 'de-DE' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(targetService.createContentItem).toHaveBeenCalledWith(
      'target-repo',
      expect.objectContaining({
        body: expect.objectContaining({
          _meta: expect.objectContaining({
            deliveryKey: 'de-DE-content/path/item',
          }),
        }),
      })
    );

    consoleSpy.mockRestore();
  });
});

describe('syncHierarchy core flow', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = { __service: 'target' } as unknown as AmplienceService;

  let generateSyncPlanMock: ViMock;

  beforeEach(() => {
    vi.clearAllMocks();

    generateSyncPlanMock = vi.spyOn(
      HierarchyService.prototype,
      'generateSyncPlan'
    ) as unknown as ViMock;

    vi.spyOn(HierarchyService.prototype, 'displaySyncPlan').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return early when sync plan is empty', async () => {
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no changes needed'));

    consoleSpy.mockRestore();
  });

  it('should not execute operations in dry run mode', async () => {
    const item = createTestContentItem({ id: 'item-1', label: 'Item' });
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [{ action: 'CREATE', sourceItem: item, targetParentId: 'parent' }],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);

    const targetServiceWithMock = {
      __service: 'target',
      createContentItem: vi.fn(),
    } as unknown as AmplienceService;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService: targetServiceWithMock,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: false,
      isDryRun: true,
    });

    expect(targetServiceWithMock.createContentItem).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN COMPLETE'));

    consoleSpy.mockRestore();
  });

  it('should display sync plan', async () => {
    const plan: Amplience.SyncPlan = {
      itemsToCreate: [],
      itemsToRemove: [],
    };

    generateSyncPlanMock.mockResolvedValue(plan);
    const displaySyncPlanSpy = vi.spyOn(HierarchyService.prototype, 'displaySyncPlan');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: 'target-repo',
      sourceTree: {} as Amplience.HierarchyNode,
      targetTree: {} as Amplience.HierarchyNode,
      updateContent: false,
      localeStrategy: { strategy: 'keep' },
      publishAfterSync: false,
      isDryRun: false,
    });

    expect(displaySyncPlanSpy).toHaveBeenCalledWith(plan);

    consoleSpy.mockRestore();
  });
});

// Test helper functions

function createTestContentItem(overrides?: Partial<Amplience.ContentItem>): Amplience.ContentItem {
  return {
    id: 'default-id',
    label: 'Default Label',
    schemaId: 'default-schema',
    version: 1,
    body: {
      _meta: {
        name: 'default-name',
        schema: 'default-schema',
      },
    },
    folderId: null,
    ...overrides,
  } as Amplience.ContentItem;
}
