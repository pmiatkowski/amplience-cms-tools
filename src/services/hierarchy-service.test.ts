import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from './amplience-service';
import { HierarchyService } from './hierarchy-service';

vi.mock('./amplience-service');

describe('HierarchyService', () => {
  let mockAmplienceService: AmplienceService;
  let hierarchyService: HierarchyService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAmplienceService = {
      getContentItemWithDetails: vi.fn(),
      getHierarchyDescendantsByApi: vi.fn(),
      getAllHierarchyDescendants: vi.fn(),
    } as unknown as AmplienceService;
    hierarchyService = new HierarchyService(mockAmplienceService);
  });

  describe('buildHierarchyTree', () => {
    const rootItemId = 'root-123';
    const repositoryId = 'repo-456';

    it('should throw error when root item is not found', async () => {
      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(null);

      await expect(hierarchyService.buildHierarchyTree(rootItemId, repositoryId)).rejects.toThrow(
        `Root item with ID ${rootItemId} not found`
      );
    });

    it('should return tree with only root node when no descendants exist', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root Item' });
      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockResolvedValue([]);
      vi.mocked(mockAmplienceService.getAllHierarchyDescendants).mockResolvedValue([]);

      const result = await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      expect(result).toEqual({
        item: rootItem,
        children: [],
      });
      expect(mockAmplienceService.getHierarchyDescendantsByApi).toHaveBeenCalledWith(
        repositoryId,
        rootItemId,
        14,
        expect.any(Function)
      );
    });

    it('should build flat hierarchy with all items as direct children', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root' });
      const child1 = createContentItem({
        id: 'child-1',
        label: 'Child 1',
        hierarchy: { root: false, parentId: rootItemId },
      });
      const child2 = createContentItem({
        id: 'child-2',
        label: 'Child 2',
        hierarchy: { root: false, parentId: rootItemId },
      });

      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockResolvedValue([
        child1,
        child2,
      ]);

      const result = await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      expect(result.item).toEqual(rootItem);
      expect(result.children).toHaveLength(2);
      expect(result.children[0].item).toEqual(child1);
      expect(result.children[1].item).toEqual(child2);
    });

    it('should build deep hierarchy with correct parent-child relationships', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root' });
      const child1 = createContentItem({
        id: 'child-1',
        label: 'Child 1',
        hierarchy: { root: false, parentId: rootItemId },
      });
      const grandchild1 = createContentItem({
        id: 'grandchild-1',
        label: 'Grandchild 1',
        hierarchy: { root: false, parentId: 'child-1' },
      });
      const greatGrandchild1 = createContentItem({
        id: 'great-grandchild-1',
        label: 'Great Grandchild 1',
        hierarchy: { root: false, parentId: 'grandchild-1' },
      });

      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockResolvedValue([
        child1,
        grandchild1,
        greatGrandchild1,
      ]);

      const result = await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      expect(result.item).toEqual(rootItem);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].item).toEqual(child1);
      expect(result.children[0].children).toHaveLength(1);
      expect(result.children[0].children[0].item).toEqual(grandchild1);
      expect(result.children[0].children[0].children).toHaveLength(1);
      expect(result.children[0].children[0].children[0].item).toEqual(greatGrandchild1);
    });

    it('should fallback to repository scan when hierarchy API returns empty', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root' });
      const child = createContentItem({
        id: 'child-1',
        label: 'Child',
        hierarchy: { root: false, parentId: rootItemId },
      });

      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockResolvedValue([]);
      vi.mocked(mockAmplienceService.getAllHierarchyDescendants).mockResolvedValue([child]);

      const result = await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      expect(result.item).toEqual(rootItem);
      expect(result.children).toHaveLength(1);
      expect(mockAmplienceService.getAllHierarchyDescendants).toHaveBeenCalledWith(
        repositoryId,
        rootItemId,
        expect.any(Function)
      );
    });

    it('should use API results without fallback when descendants are returned', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root' });
      const child = createContentItem({
        id: 'child-1',
        label: 'Child',
        hierarchy: { root: false, parentId: rootItemId },
      });

      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockResolvedValue([child]);

      await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      expect(mockAmplienceService.getAllHierarchyDescendants).not.toHaveBeenCalled();
    });

    it('should invoke progress callback during fetch', async () => {
      const rootItem = createContentItem({ id: rootItemId, label: 'Root' });

      vi.mocked(mockAmplienceService.getContentItemWithDetails).mockResolvedValue(rootItem);
      vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mockImplementation(
        async (_repoId, _rootId, _depth, callback) => {
          callback?.(5, 10);
          callback?.(10, 10);

          return [];
        }
      );
      vi.mocked(mockAmplienceService.getAllHierarchyDescendants).mockResolvedValue([]);

      await hierarchyService.buildHierarchyTree(rootItemId, repositoryId);

      const callbackArg = vi.mocked(mockAmplienceService.getHierarchyDescendantsByApi).mock
        .calls[0][3];
      expect(callbackArg).toBeDefined();
    });
  });

  describe('generateSyncPlan', () => {
    it('should return empty create/remove lists when both trees have only root', async () => {
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source Root' });
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target Root' });

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });

    it('should add items to create when source has items target lacks', async () => {
      const sourceChild = createContentItem({
        id: 'child-1',
        label: 'Child 1',
        body: { _meta: { name: 'child-1', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' }, [
        createHierarchyNode(sourceChild),
      ]);
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' });

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToCreate).toHaveLength(1);
      expect(plan.itemsToCreate[0]).toMatchObject({
        action: 'CREATE',
        sourceItem: sourceChild,
        targetParentId: 'target-root',
      });
    });

    it('should add items to remove when target has items source lacks', async () => {
      const targetChild = createContentItem({
        id: 'child-1',
        label: 'Child 1',
        body: { _meta: { name: 'child-1', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' });
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' }, [
        createHierarchyNode(targetChild),
      ]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToRemove).toHaveLength(1);
      expect(plan.itemsToRemove[0]).toMatchObject({
        action: 'REMOVE',
        sourceItem: targetChild,
        targetItem: targetChild,
      });
    });

    it('should add all descendants to create when parent needs creation', async () => {
      const grandchild = createContentItem({
        id: 'grandchild-1',
        label: 'Grandchild',
        body: { _meta: { name: 'grandchild', schema: 'schema-1' } },
      });
      const child = createContentItem({
        id: 'child-1',
        label: 'Child',
        body: { _meta: { name: 'child', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' }, [
        createHierarchyNode(child, [createHierarchyNode(grandchild)]),
      ]);
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' });

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToCreate).toHaveLength(2);
      expect(plan.itemsToCreate.find(item => item.sourceItem.id === 'child-1')).toBeDefined();
      expect(plan.itemsToCreate.find(item => item.sourceItem.id === 'grandchild-1')).toBeDefined();
    });

    it('should add all descendants to remove when parent needs removal', async () => {
      const grandchild = createContentItem({
        id: 'grandchild-1',
        label: 'Grandchild',
        body: { _meta: { name: 'grandchild', schema: 'schema-1' } },
      });
      const child = createContentItem({
        id: 'child-1',
        label: 'Child',
        body: { _meta: { name: 'child', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' });
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' }, [
        createHierarchyNode(child, [createHierarchyNode(grandchild)]),
      ]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToRemove).toHaveLength(2);
      expect(plan.itemsToRemove.find(item => item.sourceItem.id === 'child-1')).toBeDefined();
      expect(plan.itemsToRemove.find(item => item.sourceItem.id === 'grandchild-1')).toBeDefined();
    });

    it('should not take action for matching items when updateContent is false', async () => {
      const matchingItem = createContentItem({
        id: 'child-1',
        label: 'Child',
        body: { _meta: { name: 'child', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' }, [
        createHierarchyNode(matchingItem),
      ]);
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' }, [
        createHierarchyNode({ ...matchingItem, id: 'different-id' }),
      ]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, false);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });

    it('should throw error when duplicate children signatures exist in source', async () => {
      const child1 = createContentItem({
        id: 'child-1',
        label: 'Child 1',
        body: { _meta: { name: 'duplicate', schema: 'schema-1' } },
      });
      const child2 = createContentItem({
        id: 'child-2',
        label: 'Child 2',
        body: { _meta: { name: 'duplicate', schema: 'schema-1' } },
      });
      const sourceTree = createHierarchyNode({ id: 'source-root', label: 'Source' }, [
        createHierarchyNode(child1),
        createHierarchyNode(child2),
      ]);
      const targetTree = createHierarchyNode({ id: 'target-root', label: 'Target' });

      await expect(
        hierarchyService.generateSyncPlan(sourceTree, targetTree, false)
      ).rejects.toThrow(/Duplicate items found in source hierarchy/);
    });
  });

  describe('displaySyncPlan', () => {
    it('should log "already synchronized" when plan is empty', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const emptyPlan: Amplience.SyncPlan = { itemsToCreate: [], itemsToRemove: [] };

      hierarchyService.displaySyncPlan(emptyPlan);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already synchronized'));
    });

    it('should log create section when items to create exist', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const plan: Amplience.SyncPlan = {
        itemsToCreate: [
          {
            action: 'CREATE',
            sourceItem: createContentItem({
              label: 'Test Item',
              body: { _meta: { schema: 'test-schema' } },
            }),
            targetParentId: 'parent-123',
          },
        ],
        itemsToRemove: [],
      };

      hierarchyService.displaySyncPlan(plan);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Items to CREATE'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Item'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-schema'));
    });

    it('should log remove section when items to remove exist', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const plan: Amplience.SyncPlan = {
        itemsToCreate: [],
        itemsToRemove: [
          {
            action: 'REMOVE',
            sourceItem: createContentItem({
              label: 'Remove Item',
              body: { _meta: { schema: 'remove-schema' } },
            }),
            targetItem: createContentItem({ label: 'Remove Item' }),
          },
        ],
      };

      hierarchyService.displaySyncPlan(plan);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Items to REMOVE'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Remove Item'));
    });

    it('should log both sections when plan has creates and removes', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const plan: Amplience.SyncPlan = {
        itemsToCreate: [
          {
            action: 'CREATE',
            sourceItem: createContentItem({ label: 'Create Item' }),
            targetParentId: 'parent-123',
          },
        ],
        itemsToRemove: [
          {
            action: 'REMOVE',
            sourceItem: createContentItem({ label: 'Remove Item' }),
            targetItem: createContentItem({ label: 'Remove Item' }),
          },
        ],
      };

      hierarchyService.displaySyncPlan(plan);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Items to CREATE'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Items to REMOVE'));
    });
  });

  describe('getItemSignature (via behavior)', () => {
    it('should use _meta.name for signature when defined', async () => {
      const item1 = createContentItem({
        id: 'item-1',
        label: 'Item 1',
        body: { _meta: { name: 'custom-name', schema: 'schema-1' } },
      });
      const item2 = createContentItem({
        id: 'item-2',
        label: 'Different Label',
        body: { _meta: { name: 'custom-name', schema: 'schema-1' } },
      });

      const sourceTree = createHierarchyNode({ id: 'source-root' }, [createHierarchyNode(item1)]);
      const targetTree = createHierarchyNode({ id: 'target-root' }, [createHierarchyNode(item2)]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });

    it('should fallback to item.label when _meta.name is not defined', async () => {
      const item1 = createContentItem({
        id: 'item-1',
        label: 'Same Label',
        body: { _meta: { schema: 'schema-1' } },
      });
      const item2 = createContentItem({
        id: 'item-2',
        label: 'Same Label',
        body: { _meta: { schema: 'schema-1' } },
      });

      const sourceTree = createHierarchyNode({ id: 'source-root' }, [createHierarchyNode(item1)]);
      const targetTree = createHierarchyNode({ id: 'target-root' }, [createHierarchyNode(item2)]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });

    it('should use _meta.schema when defined', async () => {
      const item1 = createContentItem({
        id: 'item-1',
        label: 'Item',
        schemaId: 'fallback-schema',
        body: { _meta: { name: 'item', schema: 'custom-schema' } },
      });
      const item2 = createContentItem({
        id: 'item-2',
        label: 'Item',
        schemaId: 'different-fallback',
        body: { _meta: { name: 'item', schema: 'custom-schema' } },
      });

      const sourceTree = createHierarchyNode({ id: 'source-root' }, [createHierarchyNode(item1)]);
      const targetTree = createHierarchyNode({ id: 'target-root' }, [createHierarchyNode(item2)]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });

    it('should fallback to item.schemaId when _meta.schema is not defined', async () => {
      const item1 = createContentItem({
        id: 'item-1',
        label: 'Item',
        schemaId: 'same-schema',
        body: { _meta: { name: 'item' } },
      });
      const item2 = createContentItem({
        id: 'item-2',
        label: 'Item',
        schemaId: 'same-schema',
        body: { _meta: { name: 'item' } },
      });

      const sourceTree = createHierarchyNode({ id: 'source-root' }, [createHierarchyNode(item1)]);
      const targetTree = createHierarchyNode({ id: 'target-root' }, [createHierarchyNode(item2)]);

      const plan = await hierarchyService.generateSyncPlan(sourceTree, targetTree);

      expect(plan.itemsToCreate).toHaveLength(0);
      expect(plan.itemsToRemove).toHaveLength(0);
    });
  });
});

// Test Data Factories

function createContentItem(
  overrides?: Partial<Amplience.ContentItemWithDetails>
): Amplience.ContentItemWithDetails {
  const defaults: Amplience.ContentItemWithDetails = {
    id: 'default-id',
    label: 'Default Label',
    schemaId: 'default-schema',
    version: 1,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'NONE' as Amplience.PublishingStatus,
    createdDate: '2024-01-01',
    lastModifiedDate: '2024-01-01',
    deliveryId: 'delivery-id',
    validationState: 'valid',
    body: {
      _meta: {
        name: 'default-name',
        schema: 'default-schema',
      },
    },
    folderId: 'folder-id',
    contentRepositoryId: 'repo-id',
    createdBy: 'user',
    lastModifiedBy: 'user',
  };

  return { ...defaults, ...overrides };
}

function createHierarchyNode(
  item?: Partial<Amplience.ContentItem>,
  children: Amplience.HierarchyNode[] = []
): Amplience.HierarchyNode {
  return {
    item: createContentItem(item),
    children,
  };
}
