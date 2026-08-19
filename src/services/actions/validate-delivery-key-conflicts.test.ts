import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import { validateDeliveryKeyConflicts } from './validate-delivery-key-conflicts';

describe('validateDeliveryKeyConflicts', () => {
  const targetService = {
    getContentItemByDeliveryKey: vi.fn(),
    getRepositories: vi.fn(),
    getAllContentItems: vi.fn(),
  } as unknown as AmplienceService;

  const createItem = (
    id: string,
    label: string,
    deliveryKey?: string
  ): Amplience.ContentItemWithDetails =>
    ({
      id,
      label,
      body: {
        _meta: {
          schema: 'https://schema.example.com/item',
          ...(deliveryKey ? { deliveryKey } : {}),
        },
      },
    }) as Amplience.ContentItemWithDetails;

  const createRepository = (
    id: string,
    name: string,
    status: Amplience.RepositoryStatus = 'ACTIVE' as Amplience.RepositoryStatus
  ): Amplience.ContentRepository => ({
    id,
    name,
    label: name,
    status,
    contentTypes: [],
  });

  const createTargetOwner = (
    id: string,
    label: string,
    deliveryKey: string,
    contentRepositoryId?: string
  ): Amplience.ContentItemWithDetails =>
    ({
      id,
      label,
      ...(contentRepositoryId ? { contentRepositoryId } : {}),
      body: { _meta: { deliveryKey } },
    }) as Amplience.ContentItemWithDetails;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes without API calls when candidates have no delivery keys', async () => {
    const onProgress = vi.fn();
    const onInventoryProgress = vi.fn();
    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'No key')],
      onProgress,
      onInventoryProgress,
    });

    expect(result).toEqual({ status: 'valid', checkedDeliveryKeys: [] });
    expect(targetService.getContentItemByDeliveryKey).not.toHaveBeenCalled();
    expect(targetService.getRepositories).not.toHaveBeenCalled();
    expect(targetService.getAllContentItems).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
    expect(onInventoryProgress).not.toHaveBeenCalled();
  });

  it('reports direct owners without starting repository inventory', async () => {
    const onProgress = vi.fn();
    vi.mocked(targetService.getContentItemByDeliveryKey).mockImplementation(async deliveryKey =>
      createTargetOwner(`target-${deliveryKey}`, `Owner ${deliveryKey}`, deliveryKey, 'target-repo')
    );

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [
        createItem('item-2', 'Second', 'owned/two'),
        createItem('item-1', 'First', 'owned/one'),
      ],
      onProgress,
    });

    expect(result).toEqual({
      status: 'conflict',
      checkedDeliveryKeys: ['owned/one', 'owned/two'],
      conflicts: [
        {
          deliveryKey: 'owned/one',
          sourceItems: [{ id: 'item-1', label: 'First' }],
          targetItem: {
            id: 'target-owned/one',
            label: 'Owner owned/one',
            contentRepositoryId: 'target-repo',
          },
        },
        {
          deliveryKey: 'owned/two',
          sourceItems: [{ id: 'item-2', label: 'Second' }],
          targetItem: {
            id: 'target-owned/two',
            label: 'Owner owned/two',
            contentRepositoryId: 'target-repo',
          },
        },
      ],
    });
    expect(targetService.getRepositories).not.toHaveBeenCalled();
    expect(targetService.getAllContentItems).not.toHaveBeenCalled();
    expect(onProgress.mock.calls).toEqual([[2, 2]]);
  });

  it('accepts an unresolved key only after one complete inventory finds no owner', async () => {
    const repository = createRepository('repo-1', 'Repository 1');
    const progressEvents: string[] = [];
    const onProgress = vi.fn((current: number, total: number) => {
      progressEvents.push(`validation:${current}/${total}`);
    });
    const onInventoryProgress = vi.fn((current: number, total: number) => {
      progressEvents.push(`inventory:${current}/${total}`);
    });
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue([repository]);
    vi.mocked(targetService.getAllContentItems).mockResolvedValue([]);

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Unused', 'unused/key')],
      onProgress,
      onInventoryProgress,
    });

    expect(result).toEqual({
      status: 'valid',
      checkedDeliveryKeys: ['unused/key'],
    });
    expect(targetService.getRepositories).toHaveBeenCalledTimes(1);
    expect(targetService.getAllContentItems).toHaveBeenCalledTimes(2);
    expect(onInventoryProgress.mock.calls).toEqual([[1, 1]]);
    expect(onProgress.mock.calls).toEqual([[1, 1]]);
    expect(progressEvents).toEqual(['inventory:1/1', 'validation:1/1']);
  });

  it('reports an ACTIVE owner found in another repository', async () => {
    const firstRepository = createRepository('repo-1', 'Repository 1');
    const ownerRepository = createRepository('repo-2', 'Owner Repository');
    vi.mocked(targetService.getContentItemByDeliveryKey).mockImplementation(async deliveryKey =>
      deliveryKey === 'direct/key'
        ? createTargetOwner('direct-owner', 'Direct Owner', deliveryKey, 'direct-repo')
        : null
    );
    vi.mocked(targetService.getRepositories).mockResolvedValue([firstRepository, ownerRepository]);
    vi.mocked(targetService.getAllContentItems).mockImplementation(
      async (repositoryId, _, params) =>
        repositoryId === ownerRepository.id && params?.status === 'ACTIVE'
          ? [
              createTargetOwner('inventory-direct-owner', 'Inventory Direct Owner', 'direct/key'),
              createTargetOwner('active-owner', 'Active Owner', 'shared/key'),
            ]
          : []
    );

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [
        createItem('item-1', 'Direct Source', 'direct/key'),
        createItem('item-2', 'Inventory Source', 'shared/key'),
      ],
    });

    expect(result).toEqual({
      status: 'conflict',
      checkedDeliveryKeys: ['direct/key', 'shared/key'],
      conflicts: [
        {
          deliveryKey: 'direct/key',
          sourceItems: [{ id: 'item-1', label: 'Direct Source' }],
          targetItem: {
            id: 'direct-owner',
            label: 'Direct Owner',
            contentRepositoryId: 'direct-repo',
          },
        },
        {
          deliveryKey: 'shared/key',
          sourceItems: [{ id: 'item-2', label: 'Inventory Source' }],
          targetItem: {
            id: 'active-owner',
            label: 'Active Owner',
            contentRepositoryId: 'repo-2',
          },
        },
      ],
    });
  });

  it('reports an ARCHIVED owner found by repository inventory', async () => {
    const repository = createRepository(
      'archive-repo',
      'Archive Repository',
      'ARCHIVED' as Amplience.RepositoryStatus
    );
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue([repository]);
    vi.mocked(targetService.getAllContentItems).mockImplementation(async (_, __, params) =>
      params?.status === 'ARCHIVED'
        ? [createTargetOwner('archived-owner', 'Archived Owner', 'archived/key')]
        : []
    );

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Source', 'archived/key')],
    });

    expect(result).toEqual({
      status: 'conflict',
      checkedDeliveryKeys: ['archived/key'],
      conflicts: [
        {
          deliveryKey: 'archived/key',
          sourceItems: [{ id: 'item-1', label: 'Source' }],
          targetItem: {
            id: 'archived-owner',
            label: 'Archived Owner',
            contentRepositoryId: 'archive-repo',
          },
        },
      ],
    });
  });

  it('scans every repository separately for full ACTIVE and ARCHIVED items', async () => {
    const repositories = [
      createRepository('repo-1', 'Repository 1'),
      createRepository('repo-2', 'Archived Repository', 'ARCHIVED' as Amplience.RepositoryStatus),
    ];
    const onInventoryProgress = vi.fn((current: number) => {
      expect(targetService.getAllContentItems).toHaveBeenCalledTimes(current * 2);
    });
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue(repositories);
    vi.mocked(targetService.getAllContentItems).mockResolvedValue([]);

    await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Source', 'unused/key')],
      onInventoryProgress,
    });

    expect(targetService.getAllContentItems).toHaveBeenCalledTimes(4);
    for (const [callIndex, [repositoryId, onPageFetched, params]] of vi
      .mocked(targetService.getAllContentItems)
      .mock.calls.entries()) {
      expect(repositoryId).toBe(repositories[Math.floor(callIndex / 2)].id);
      expect(onPageFetched).toEqual(expect.any(Function));
      expect(params).toEqual({
        size: 100,
        sort: 'lastModifiedDate,asc',
        status: callIndex % 2 === 0 ? 'ACTIVE' : 'ARCHIVED',
      });
      expect(params).not.toHaveProperty('projection');
    }
    expect(onInventoryProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('shares one inventory across unresolved keys and deduplicates source delivery keys', async () => {
    const repository = createRepository('repo-1', 'Repository 1');
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue([repository]);
    vi.mocked(targetService.getAllContentItems).mockResolvedValue([]);
    const items = Array.from({ length: 7 }, (_, index) =>
      createItem(`item-${index}`, `Item ${index}`, `key/${index}`)
    );
    items.push(createItem('duplicate-item', 'Duplicate', 'key/0'));

    const result = await validateDeliveryKeyConflicts({ targetService, items });

    expect(result.status).toBe('conflict');
    expect(targetService.getContentItemByDeliveryKey).toHaveBeenCalledTimes(5);
    expect(
      vi
        .mocked(targetService.getContentItemByDeliveryKey)
        .mock.calls.map(([deliveryKey]) => deliveryKey)
    ).toEqual(['key/0', 'key/1', 'key/2', 'key/3', 'key/4']);
    expect(targetService.getRepositories).toHaveBeenCalledTimes(1);
    expect(targetService.getAllContentItems).toHaveBeenCalledTimes(2);
  });

  it('preserves deterministic duplicate-source conflicts after a complete inventory', async () => {
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue([]);

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [
        createItem('item-3', 'Zulu', 'duplicate/z'),
        createItem('item-2', 'Beta', 'duplicate/a'),
        createItem('item-1', 'Alpha', 'duplicate/a'),
        createItem('item-4', 'Alpha', 'duplicate/z'),
      ],
    });

    expect(result).toEqual({
      status: 'conflict',
      checkedDeliveryKeys: ['duplicate/a', 'duplicate/z'],
      conflicts: [
        {
          deliveryKey: 'duplicate/a',
          sourceItems: [
            { id: 'item-1', label: 'Alpha' },
            { id: 'item-2', label: 'Beta' },
          ],
        },
        {
          deliveryKey: 'duplicate/z',
          sourceItems: [
            { id: 'item-4', label: 'Alpha' },
            { id: 'item-3', label: 'Zulu' },
          ],
        },
      ],
    });
  });

  it('returns genuine direct lookup failures without starting inventory', async () => {
    const onProgress = vi.fn();
    vi.mocked(targetService.getContentItemByDeliveryKey).mockRejectedValue(
      new Error('API Error: 500 Internal Server Error')
    );

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Failed', 'failed/key')],
      onProgress,
    });

    expect(result).toEqual({
      status: 'lookup-failed',
      stage: 'direct-lookup',
      checkedDeliveryKeys: [],
      deliveryKey: 'failed/key',
      error: 'API Error: 500 Internal Server Error',
    });
    expect(targetService.getRepositories).not.toHaveBeenCalled();
    expect(targetService.getAllContentItems).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('returns a repository-inventory failure when repository listing fails', async () => {
    const onProgress = vi.fn();
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockRejectedValue(
      new Error('API Error: 500 Repository listing failed')
    );

    const result = await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Unresolved', 'unresolved/key')],
      onProgress,
    });

    expect(result).toEqual({
      status: 'lookup-failed',
      stage: 'repository-inventory',
      checkedDeliveryKeys: [],
      deliveryKey: 'unresolved/key',
      error: 'API Error: 500 Repository listing failed',
    });
    expect(targetService.getAllContentItems).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'ARCHIVED'] as const)(
    'fails closed when a repository %s fetch fails',
    async failingStatus => {
      const repository = createRepository('failed-repo', 'Failed Repository');
      const onProgress = vi.fn();
      vi.mocked(targetService.getContentItemByDeliveryKey).mockImplementation(async deliveryKey =>
        deliveryKey === 'direct/key'
          ? createTargetOwner('direct-owner', 'Direct Owner', deliveryKey, 'direct-repo')
          : null
      );
      vi.mocked(targetService.getRepositories).mockResolvedValue([repository]);
      vi.mocked(targetService.getAllContentItems).mockImplementation(async (_, __, params) => {
        if (params?.status === failingStatus) {
          throw new Error(`API Error: 500 ${failingStatus} fetch failed`);
        }

        return [];
      });

      const result = await validateDeliveryKeyConflicts({
        targetService,
        items: [
          createItem('item-1', 'Direct', 'direct/key'),
          createItem('item-2', 'Unresolved', 'unresolved/key'),
        ],
        onProgress,
      });

      expect(result).toEqual({
        status: 'lookup-failed',
        stage: 'repository-inventory',
        checkedDeliveryKeys: ['direct/key'],
        deliveryKey: 'unresolved/key',
        repositoryId: 'failed-repo',
        repositoryLabel: 'Failed Repository',
        error: `API Error: 500 ${failingStatus} fetch failed`,
      });
      expect(onProgress).not.toHaveBeenCalled();
    }
  );

  it('reports inventory progress only after each repository is fully scanned', async () => {
    const repositories = [
      createRepository('repo-1', 'Repository 1'),
      createRepository('repo-2', 'Repository 2'),
    ];
    const onInventoryProgress = vi.fn();
    vi.mocked(targetService.getContentItemByDeliveryKey).mockResolvedValue(null);
    vi.mocked(targetService.getRepositories).mockResolvedValue(repositories);
    vi.mocked(targetService.getAllContentItems).mockResolvedValue([]);

    await validateDeliveryKeyConflicts({
      targetService,
      items: [createItem('item-1', 'Unresolved', 'unresolved/key')],
      onInventoryProgress,
    });

    expect(onInventoryProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(vi.mocked(targetService.getAllContentItems).mock.invocationCallOrder[1]).toBeLessThan(
      onInventoryProgress.mock.invocationCallOrder[0]
    );
    expect(vi.mocked(targetService.getAllContentItems).mock.invocationCallOrder[3]).toBeLessThan(
      onInventoryProgress.mock.invocationCallOrder[1]
    );
  });
});
