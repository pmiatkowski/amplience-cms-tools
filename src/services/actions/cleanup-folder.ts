import { AmplienceService } from '../amplience-service';
import {
  archiveContentItem,
  ItemCleanupResult,
  ArchiveContentItemOptions,
} from './archive-content-item';
import { listNestedSubfolders, FolderTreeNode } from './list-nested-subfolders';

/**
 * Performs comprehensive cleanup of a selected folder and all its nested content
 * @param service - The Amplience service instance
 * @param repositoryId - The content repository ID
 * @param targetFolderId - The folder ID to cleanup, or null for repository root
 * @param options - Configuration options for the cleanup process
 * @returns Promise with the cleanup result
 */
export async function cleanupFolder(
  service: AmplienceService,
  repositoryId: string,
  targetFolderId: string | null,
  options: CleanupFolderOptions = {}
): Promise<FolderCleanupResult> {
  const {
    deletedFolderName = '__deleted',
    clearDeliveryKey = true,
    unarchiveIfNeeded = true,
  } = options;

  const result: FolderCleanupResult = {
    targetFolderId: targetFolderId || 'ROOT',
    repositoryId,
    deletedFolderId: null,
    foldersProcessed: [],
    contentItemsProcessed: [],
    foldersDeleted: [],
    overallSuccess: false,
    errors: [],
  };

  try {
    const targetName = targetFolderId ? `folder ${targetFolderId}` : 'repository root';
    console.log(`Starting cleanup for ${targetName} in repository ${repositoryId}`);

    // Step 1: Get all nested subfolders within the target folder (or repository)
    console.log('Step 1: Getting all nested subfolders...');
    const nestedResult = await listNestedSubfolders(
      service,
      repositoryId,
      targetFolderId || undefined
    );
    const allFolders = [
      // Include the target folder itself in processing (if not root)
      ...(targetFolderId ? await getFolderById(service, targetFolderId) : []),
      ...nestedResult.raw,
    ];

    console.log(`Found ${allFolders.length} folders to process`);

    // Step 2: Get all content items from all folders (and repository root if applicable)
    console.log('Step 2: Getting all content items from folders...');
    const allContentItems: ContentItemWithFolder[] = [];

    // If cleaning repository root, also get items not in any folder
    if (!targetFolderId) {
      try {
        console.log('  Getting content items from repository root...');
        const rootItems = await service.getAllContentItems(
          repositoryId,
          (fetched, total) => {
            console.log(`  Repository Root: ${fetched}/${total} items fetched`);
          }
          // Omit folderId parameter to get items not in any folder
        );

        const rootItemsWithFolder: ContentItemWithFolder[] = rootItems.map(item => ({
          ...item,
          sourceFolderId: null,
          sourceFolderName: 'Repository Root',
        }));

        allContentItems.push(...rootItemsWithFolder);
        result.foldersProcessed.push({
          folderId: 'ROOT',
          folderName: 'Repository Root',
          itemCount: rootItems.length,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to get content items from repository root: ${errorMessage}`);
        result.foldersProcessed.push({
          folderId: 'ROOT',
          folderName: 'Repository Root',
          itemCount: 0,
          success: false,
          error: errorMessage,
        });
      }
    }

    for (const folder of allFolders) {
      try {
        const items = await service.getAllContentItems(
          repositoryId,
          (fetched, total) => {
            console.log(`  Folder ${folder.name}: ${fetched}/${total} items fetched`);
          },
          { folderId: folder.id }
        );

        const itemsWithFolder: ContentItemWithFolder[] = items.map(item => ({
          ...item,
          sourceFolderId: folder.id,
          sourceFolderName: folder.name,
        }));

        allContentItems.push(...itemsWithFolder);
        result.foldersProcessed.push({
          folderId: folder.id,
          folderName: folder.name,
          itemCount: items.length,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(
          `Failed to get content items from folder ${folder.name}: ${errorMessage}`
        );
        result.foldersProcessed.push({
          folderId: folder.id,
          folderName: folder.name,
          itemCount: 0,
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log(`Found ${allContentItems.length} total content items to process`);

    // Step 3: Check for __deleted folder, create if needed
    console.log('Step 3: Checking for __deleted folder...');
    const deletedFolder = await ensureDeletedFolder(service, repositoryId, deletedFolderName);
    if (!deletedFolder.success) {
      throw new Error(`Failed to ensure deleted folder exists: ${deletedFolder.error}`);
    }
    result.deletedFolderId = deletedFolder.folderId!;

    // Step 4: Move all content items to __deleted folder
    console.log('Step 4: Moving content items to __deleted folder...');
    if (allContentItems.length > 0) {
      await moveContentItemsToDeletedFolder(
        service,
        allContentItems,
        deletedFolder.folderId!,
        result,
        { unarchiveIfNeeded, clearDeliveryKey }
      );
    }

    // Step 5: Archive all moved content items
    console.log('Step 5: Archiving moved content items...');
    if (result.contentItemsProcessed.length > 0) {
      await archiveMovedContentItems(
        service,
        result.contentItemsProcessed,
        {
          clearDeliveryKey: false, // Already cleared during move
          unpublishIfNeeded: false, // Skip unpublish - items are in __deleted folder for cleanup
          unarchiveIfNeeded,
        },
        result
      );
    }

    // Step 6: Delete folders in reverse order (deepest first)
    console.log('Step 6: Deleting empty folders...');
    if (targetFolderId) {
      // Only delete folders if we're cleaning a specific folder, not the repository root
      await deleteFoldersInReverseOrder(service, nestedResult.tree, targetFolderId, result);
    } else {
      // When cleaning repository root, we still delete empty subfolders but not the root itself
      await deleteFoldersInReverseOrder(service, nestedResult.tree, null, result);
    }

    result.overallSuccess = result.errors.length === 0;
    console.log(`Cleanup completed. Success: ${result.overallSuccess}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Cleanup failed: ${errorMessage}`);
    result.overallSuccess = false;
  }

  return result;
}

/**
 * Gets a folder by ID and returns it as an array (for consistency with other folder operations)
 */
async function getFolderById(
  service: AmplienceService,
  folderId: string
): Promise<Amplience.Folder[]> {
  try {
    const folderResult = await service.getFolder(folderId);

    return folderResult.success && folderResult.updatedItem ? [folderResult.updatedItem] : [];
  } catch (error) {
    console.warn(`Failed to get target folder ${folderId}:`, error);

    return [];
  }
}

// Interfaces
export type CleanupFolderOptions = {
  /** Name of the deleted folder (default: '__deleted') */
  deletedFolderName?: string;
  /** Whether to clear delivery keys during archive (default: true) */
  clearDeliveryKey?: boolean;
  /** Whether to unpublish items if needed during archive (default: true) */
  unpublishIfNeeded?: boolean;
  /** Whether to unarchive items if needed during archive (default: true) */
  unarchiveIfNeeded?: boolean;
};

/**
 * Moves content items to the __deleted folder with retry logic for version conflicts
 */
async function moveContentItemsToDeletedFolder(
  service: AmplienceService,
  contentItems: ContentItemWithFolder[],
  deletedFolderId: string,
  result: FolderCleanupResult,
  options: CleanupFolderOptions = {}
): Promise<void> {
  const { unarchiveIfNeeded = true, clearDeliveryKey = true } = options;
  const batchSize = 5; // Reduced batch size to avoid overwhelming the API
  const maxRetries = 3;

  for (let i = 0; i < contentItems.length; i += batchSize) {
    const batch = contentItems.slice(i, i + batchSize);

    // Process batch items sequentially to avoid version conflicts
    for (const item of batch) {
      let retryCount = 0;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          // Get the latest version of the item before processing
          const latestItem = await service.getContentItemWithDetails(item.id);
          if (!latestItem) {
            throw new Error(`Failed to get latest version of item`);
          }
          let currentVersion = latestItem.version;

          // Step 1: Unarchive if needed
          if (unarchiveIfNeeded && latestItem.status === 'ARCHIVED') {
            const unarchiveResult = await service.unarchiveContentItem(item.id, currentVersion);
            if (!unarchiveResult.success) {
              throw new Error(`Failed to unarchive before move: ${unarchiveResult.error}`);
            }
            // Update version after unarchiving
            currentVersion = unarchiveResult.updatedItem?.version || currentVersion + 1;
          }

          // Step 2: Move to deleted folder and drop hierarchy
          const model: Amplience.UpdateContentItemRequest = {
            body: latestItem.body,
            label: latestItem.label,
            version: currentVersion,
            folderId: deletedFolderId,
          };

          // Drop hierarchy if it exists
          if (latestItem.hierarchy?.parentId || latestItem.hierarchy?.root === false) {
            model.hierarchy = null;
            if (model.body._meta) {
              model.body._meta.hierarchy = null;
            }
          }

          // Clear delivery key during move if requested
          if (clearDeliveryKey && model.body._meta?.deliveryKey) {
            model.body._meta.deliveryKey = null;
          }

          const updateResult = await service.updateContentItem(item.id, model);

          const processedItem: ProcessedContentItem = {
            itemId: item.id,
            label: item.label,
            status: latestItem.status,
            sourceFolderId: item.sourceFolderId,
            sourceFolderName: item.sourceFolderName,
            moveToDeletedResult: {
              success: updateResult.success,
              ...(updateResult.error && { error: updateResult.error }),
              ...(updateResult.updatedItem && { updatedItem: updateResult.updatedItem }),
            },
          };

          result.contentItemsProcessed.push(processedItem);

          if (!updateResult.success) {
            throw new Error(`Move failed: ${updateResult.error}`);
          }

          success = true;
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check if it's a version conflict error
          if (errorMessage.includes('CONTENT_ITEM_VERSION_NOT_LATEST') && retryCount < maxRetries) {
            console.log(
              `  Retry ${retryCount}/${maxRetries} for item ${item.label} due to version conflict`
            );
            // Wait a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // If we've exhausted retries or it's not a version conflict, record the failure
          const processedItem: ProcessedContentItem = {
            itemId: item.id,
            label: item.label,
            status: item.status,
            sourceFolderId: item.sourceFolderId,
            sourceFolderName: item.sourceFolderName,
            moveToDeletedResult: {
              success: false,
              error: errorMessage,
            },
          };

          result.contentItemsProcessed.push(processedItem);
          result.errors.push(`Failed to move item ${item.label} (${item.id}): ${errorMessage}`);
          break; // Exit retry loop
        }
      }
    }

    console.log(
      `  Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contentItems.length / batchSize)}`
    );
  }
}

/**
 * Archives all content items that were successfully moved to the deleted folder
 */
async function archiveMovedContentItems(
  service: AmplienceService,
  processedItems: ProcessedContentItem[],
  archiveOptions: ArchiveContentItemOptions,
  result: FolderCleanupResult
): Promise<void> {
  // Only archive items that were successfully moved
  const itemsToArchive = processedItems.filter(item => item.moveToDeletedResult.success);

  console.log(`Archiving ${itemsToArchive.length} successfully moved items...`);

  for (const processedItem of itemsToArchive) {
    try {
      // Use the updated content item from the move operation if available
      const updatedItem = processedItem.moveToDeletedResult.updatedItem;
      const versionToUse = updatedItem ? updatedItem.version : 1;

      // Create a minimal content item object for the archive function
      const contentItem: Amplience.ContentItem = {
        id: processedItem.itemId,
        label: processedItem.label,
        schemaId: updatedItem?.schemaId || '', // Use actual schema if available
        status: updatedItem?.status || ('ACTIVE' as Amplience.ContentStatus),
        publishingStatus: updatedItem?.publishingStatus || ('NONE' as Amplience.PublishingStatus),
        createdDate: updatedItem?.createdDate || '',
        lastModifiedDate: updatedItem?.lastModifiedDate || '',
        version: versionToUse, // Use the updated version from move operation
        deliveryId: updatedItem?.deliveryId || '',
        validationState: updatedItem?.validationState || '',
        body: updatedItem?.body || {},
      };

      const archiveResult = await archiveContentItem(service, contentItem, archiveOptions);
      processedItem.archiveResult = archiveResult;

      if (!archiveResult.overallSuccess) {
        result.errors.push(
          `Failed to archive item ${processedItem.label} (${processedItem.itemId}): Archive operation failed`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(
        `Failed to archive item ${processedItem.label} (${processedItem.itemId}): ${errorMessage}`
      );
    }
  }
}

/**
 * Deletes folders in reverse order (deepest first), excluding the __deleted folder
 */
async function deleteFoldersInReverseOrder(
  service: AmplienceService,
  folderTree: FolderTreeNode[],
  targetFolderId: string | null,
  result: FolderCleanupResult
): Promise<void> {
  // Collect all folders in depth-first order, then reverse
  const allFolders: FolderTreeNode[] = [];

  function collectFoldersDepthFirst(nodes: FolderTreeNode[]): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        collectFoldersDepthFirst(node.children);
      }
      allFolders.push(node);
    }
  }

  collectFoldersDepthFirst(folderTree);

  // Add the target folder as the last one to delete (only if we have a specific target folder)
  if (targetFolderId && !allFolders.find(f => f.id === targetFolderId)) {
    try {
      const targetFolderResult = await service.getFolder(targetFolderId);
      if (targetFolderResult.success && targetFolderResult.updatedItem) {
        allFolders.push({
          id: targetFolderResult.updatedItem.id,
          name: targetFolderResult.updatedItem.name,
          children: [],
          _links: targetFolderResult.updatedItem._links,
        });
      }
    } catch (error) {
      console.warn(`Could not add target folder to deletion list:`, error);
    }
  }

  console.log(`Deleting ${allFolders.length} folders in reverse order...`);

  // Delete folders (deepest first)
  for (const folder of allFolders) {
    // Skip the __deleted folder
    if (folder.name === '__deleted' || folder.id === result.deletedFolderId) {
      continue;
    }

    try {
      const deleteResult = await service.deleteFolder(folder.id);

      const deletedFolder: DeletedFolder = {
        folderId: folder.id,
        folderName: folder.name,
        success: deleteResult.success,
        ...(deleteResult.error && { error: deleteResult.error }),
      };

      result.foldersDeleted.push(deletedFolder);

      if (!deleteResult.success) {
        result.errors.push(
          `Failed to delete folder ${folder.name} (${folder.id}): ${deleteResult.error}`
        );
      } else {
        console.log(`  Deleted folder: ${folder.name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const deletedFolder: DeletedFolder = {
        folderId: folder.id,
        folderName: folder.name,
        success: false,
        error: errorMessage,
      };

      result.foldersDeleted.push(deletedFolder);
      result.errors.push(`Failed to delete folder ${folder.name} (${folder.id}): ${errorMessage}`);
    }
  }
}

/**
 * Ensures the __deleted folder exists, creating it if necessary
 * This function is exported so it can be used by other cleanup operations
 */
export async function ensureDeletedFolder(
  service: AmplienceService,
  repositoryId: string,
  deletedFolderName: string
): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    // Check if __deleted folder already exists
    const allFolders = await service.getAllFolders(repositoryId, () => {});
    const existingDeletedFolder = allFolders.find(folder => folder.name === deletedFolderName);

    if (existingDeletedFolder) {
      return { success: true, folderId: existingDeletedFolder.id };
    }

    // Create __deleted folder
    const createResult = await service.createFolder(repositoryId, deletedFolderName);
    if (createResult.success && createResult.updatedItem) {
      return { success: true, folderId: createResult.updatedItem.id };
    } else {
      return { success: false, error: createResult.error || 'Failed to create deleted folder' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type ContentItemWithFolder = {
  sourceFolderId: string | null;
  sourceFolderName: string;
} & Amplience.ContentItem;

type ProcessedContentItem = {
  itemId: string;
  label: string;
  status: Amplience.ContentStatus;
  sourceFolderId: string | null;
  sourceFolderName: string;
  moveToDeletedResult: {
    success: boolean;
    error?: string;
    updatedItem?: Amplience.ContentItemWithDetails; // Store the updated item from move operation
  };
  archiveResult?: ItemCleanupResult; // From archive-content-item.ts
};

type ProcessedFolder = {
  folderId: string;
  folderName: string;
  itemCount: number;
  success: boolean;
  error?: string;
};

type DeletedFolder = {
  folderId: string;
  folderName: string;
  success: boolean;
  error?: string;
};

export type FolderCleanupResult = {
  targetFolderId: string;
  repositoryId: string;
  deletedFolderId: string | null;
  foldersProcessed: ProcessedFolder[];
  contentItemsProcessed: ProcessedContentItem[];
  foldersDeleted: DeletedFolder[];
  overallSuccess: boolean;
  errors: string[];
};
