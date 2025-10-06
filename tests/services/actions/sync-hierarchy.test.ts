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
