import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archivePreparedItem,
  prepareItemForRemoval,
  removeContentItem,
  RemovalOptions,
} from '~/services/actions/item-removal';
import { AmplienceService } from '~/services/amplience-service';
import * as archiveModule from './archive-content-item';

describe('item-removal helpers', () => {
  const repositoryId = 'repo-1';
  const baseItem: Amplience.ContentItemWithDetails = {
    id: 'item-1',
    label: 'Sample Item',
    schemaId: 'https://example.com/schema.json',
    status: 'ARCHIVED' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: new Date().toISOString(),
    lastModifiedDate: new Date().toISOString(),
    hierarchy: {
      root: false,
      parentId: 'parent-1',
    },
    version: 1,
    deliveryId: 'delivery-id',
    validationState: 'VALID',
    body: {
      _meta: {
        deliveryKey: 'en-GB/sample-item',
        hierarchy: {
          root: false,
          parentId: 'parent-1',
        },
      },
    },
    contentRepositoryId: repositoryId,
    createdBy: 'tester',
    lastModifiedBy: 'tester',
  };

  let service: AmplienceService;
  let options: RemovalOptions;

  beforeEach(() => {
    const serviceMock = {
      getAllFolders: vi.fn().mockResolvedValue([{ id: 'deleted-folder', name: '__deleted' }]),
      createFolder: vi.fn(),
      getContentItemWithDetails: vi.fn().mockResolvedValue({ ...baseItem }),
      unarchiveContentItem: vi.fn().mockResolvedValue({
        success: true,
        updatedItem: {
          ...baseItem,
          status: 'ACTIVE' as Amplience.ContentStatus,
          version: 2,
        },
      }),
      updateContentItem: vi.fn().mockResolvedValue({
        success: true,
        updatedItem: {
          ...baseItem,
          status: 'ACTIVE' as Amplience.ContentStatus,
          hierarchy: null,
          version: 3,
          body: {
            _meta: {
              deliveryKey: null,
              hierarchy: null,
            },
          },
        },
      }),
      unpublishContentItem: vi.fn().mockResolvedValue({ success: true }),
      archiveContentItem: vi.fn().mockResolvedValue({ success: true }),
      updateDeliveryKey: vi.fn().mockResolvedValue({ success: true }),
    } satisfies Partial<AmplienceService>;

    service = serviceMock as unknown as AmplienceService;
    options = { deletedFolderName: '__deleted' };
  });

  it('prepares an item by unarchiving, stripping hierarchy, and moving to deleted folder', async () => {
    const result = await prepareItemForRemoval(service, repositoryId, baseItem.id, options);

    expect(result.success).toBe(true);
    expect(result.deletedFolderId).toBe('deleted-folder');
    expect(result.updatedItem?.hierarchy).toBeNull();
    expect(result.updatedItem?.body._meta?.hierarchy).toBeNull();
    expect(result.updatedItem?.body._meta?.deliveryKey).toBeNull();

    expect(service.unarchiveContentItem).toHaveBeenCalledWith(baseItem.id, 1);
    expect(service.updateContentItem).toHaveBeenCalledTimes(1);

    const updatePayload = (service.updateContentItem as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload.folderId).toBe('deleted-folder');
    expect(updatePayload.hierarchy).toBeNull();
    expect(updatePayload.body._meta?.hierarchy).toBeNull();
    expect(updatePayload.body._meta?.deliveryKey).toBeNull();
  });

  it('reuses provided deleted folder id without ensuring folder', async () => {
    const folderId = 'existing-deleted-folder';

    const result = await prepareItemForRemoval(service, repositoryId, baseItem.id, {
      ...options,
      deletedFolderId: folderId,
    });

    expect(service.getAllFolders).not.toHaveBeenCalled();
    expect(service.createFolder).not.toHaveBeenCalled();

    const updatePayload = (service.updateContentItem as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload.folderId).toBe(folderId);
    expect(result.deletedFolderId).toBe(folderId);
  });

  it('archives a prepared item through the full removal pipeline', async () => {
    // Adjust mocks for publishing/archiving flow
    (service.getAllFolders as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (service.createFolder as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      updatedItem: { id: 'deleted-folder', name: '__deleted' },
    });
    (service.getContentItemWithDetails as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseItem,
      status: 'ACTIVE' as Amplience.ContentStatus,
      version: 4,
    });
    (service.updateContentItem as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      updatedItem: {
        ...baseItem,
        status: 'ACTIVE' as Amplience.ContentStatus,
        hierarchy: null,
        version: 5,
        body: {
          _meta: {
            deliveryKey: null,
            hierarchy: null,
          },
        },
      },
    });
    (service.unpublishContentItem as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (service.archiveContentItem as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (service.unarchiveContentItem as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      updatedItem: {
        ...baseItem,
        status: 'ACTIVE' as Amplience.ContentStatus,
        version: 5,
      },
    });

    const result = await removeContentItem(service, repositoryId, baseItem.id, options);

    expect(service.createFolder).toHaveBeenCalled();
    expect(service.unpublishContentItem).toHaveBeenCalledWith(baseItem.id);
    expect(service.archiveContentItem).toHaveBeenCalledWith(baseItem.id, expect.any(Number));

    expect(result.overallSuccess).toBe(true);
    expect(result.prepareResult.success).toBe(true);
    expect(result.archiveResult?.overallSuccess).toBe(true);
  });

  it('skips archiving when preparation fails', async () => {
    (service.getAllFolders as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API down'));

    const archiveSpy = vi.spyOn(archiveModule, 'archiveContentItem');

    const result = await removeContentItem(service, repositoryId, baseItem.id, options);

    expect(result.overallSuccess).toBe(false);
    expect(result.prepareResult.success).toBe(false);
    expect(archiveSpy).not.toHaveBeenCalled();

    archiveSpy.mockRestore();
  });

  it('does not archive when prepared state is missing updated item', async () => {
    const prepareResult = await prepareItemForRemoval(service, repositoryId, baseItem.id, options);
    const invalidPrepare = {
      ...prepareResult,
      updatedItem: undefined,
    } as unknown as Parameters<typeof archivePreparedItem>[1];

    const archiveResult = await archivePreparedItem(service, invalidPrepare, options);

    expect(archiveResult).toBeUndefined();
  });
});
