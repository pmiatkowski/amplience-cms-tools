import { AmplienceService } from '../amplience-service';
import { archivePreparedItem, ensureDeletedFolder, prepareItemForRemoval } from './item-removal';
import { FolderTreeNode, listNestedSubfolders } from './list-nested-subfolders';
import type { ItemCleanupResult } from './archive-content-item';

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
    unpublishIfNeeded = true,
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

    console.log('Step 4: Preparing content items for removal...');
    if (allContentItems.length > 0) {
      await processContentItemsForRemoval(
        service,
        repositoryId,
        allContentItems,
        deletedFolder.folderId!,
        { deletedFolderName, clearDeliveryKey, unarchiveIfNeeded, unpublishIfNeeded },
        result
      );
    }
    console.log('Step 5: Deleting empty folders...');
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

async function processContentItemsForRemoval(
  service: AmplienceService,
  repositoryId: string,
  contentItems: ContentItemWithFolder[],
  deletedFolderId: string,
  options: {
    deletedFolderName: string;
    clearDeliveryKey: boolean;
    unarchiveIfNeeded: boolean;
    unpublishIfNeeded: boolean;
  },
  result: FolderCleanupResult
): Promise<void> {
  for (const item of contentItems) {
    console.log(`  Processing item ${item.label} (${item.id})`);

    const processedItem: ProcessedContentItem = {
      itemId: item.id,
      label: item.label,
      status: item.status,
      sourceFolderId: item.sourceFolderId,
      sourceFolderName: item.sourceFolderName,
      moveToDeletedResult: {
        success: false,
      },
    };

    try {
      const prepareResult = await prepareItemForRemoval(service, repositoryId, item.id, {
        deletedFolderId,
        deletedFolderName: options.deletedFolderName,
        clearDeliveryKey: options.clearDeliveryKey,
        unarchiveIfNeeded: options.unarchiveIfNeeded,
      });

      processedItem.moveToDeletedResult = {
        success: prepareResult.success,
        ...(prepareResult.error && { error: prepareResult.error }),
        ...(prepareResult.updatedItem && { updatedItem: prepareResult.updatedItem }),
      };

      if (prepareResult.updatedItem) {
        processedItem.status = prepareResult.updatedItem.status;
      }

      if (!prepareResult.success) {
        result.errors.push(
          `Failed to move item ${item.label} (${item.id}) to deleted folder: ${prepareResult.error ?? 'Unknown error'}`
        );
        result.contentItemsProcessed.push(processedItem);
        continue;
      }

      const archiveResult = await archivePreparedItem(service, prepareResult, {
        unpublishIfNeeded: options.unpublishIfNeeded,
        unarchiveIfNeeded: options.unarchiveIfNeeded,
      });

      if (archiveResult) {
        processedItem.archiveResult = archiveResult;
        if (!archiveResult.overallSuccess) {
          result.errors.push(
            `Failed to archive item ${item.label} (${item.id}): ${archiveResult.archiveResult.error ?? 'Archive operation failed'}`
          );
          console.log(`    ⚠️  Prepared but failed to archive ${item.label}`);
        } else {
          console.log(`    ✅ Archived ${item.label}`);
        }
      } else {
        processedItem.archiveResult = {
          itemId: item.id,
          label: item.label,
          unarchiveResult: { success: true },
          moveToDeletedResult: { success: true },
          clearKeyResult: { success: true },
          unpublishResult: { success: true },
          archiveResult: {
            success: false,
            error: 'Archive step skipped: missing prepared item',
          },
          overallSuccess: false,
        };
        result.errors.push(
          `Failed to archive item ${item.label} (${item.id}): Archive step skipped due to missing prepared item`
        );
        console.log(`    ⚠️  Skipped archiving ${item.label}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      processedItem.moveToDeletedResult = {
        success: false,
        error: errorMessage,
      };
      result.errors.push(
        `Unexpected error while removing item ${item.label} (${item.id}): ${errorMessage}`
      );
      console.log(`    ❌ Failed to process ${item.label}: ${errorMessage}`);
    }

    result.contentItemsProcessed.push(processedItem);
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
