import { AmplienceService } from '../amplience-service';

/**
 * Archives a content item with optional preparation steps
 * @param service - The Amplience service instance
 * @param item - The content item to archive
 * @param options - Configuration options for the archive process
 * @param options.clearDeliveryKey - Whether to clear the delivery key before archiving (default: true)
 * @param options.unpublishIfNeeded - Whether to unpublish the item if it's published (default: true)
 * @param options.unarchiveIfNeeded - Whether to unarchive the item first if it's already archived (default: true)
 * @param options.moveToRoot - Whether to move the item to the root folder before archiving (default: true)
 * @returns Promise with the cleanup result
 */
export async function archiveContentItem(
  service: AmplienceService,
  item: Amplience.ContentItem | Amplience.ContentItemWithDetails | Amplience.ContentItemVersion,
  options: ArchiveContentItemOptions = {}
): Promise<ItemCleanupResult> {
  const {
    clearDeliveryKey = true,
    unpublishIfNeeded = true,
    unarchiveIfNeeded = true,
    moveToRoot = true,
    moveToDeletedFolder = false,
    deletedFolderId,
  } = options;

  const itemResult: ItemCleanupResult = {
    itemId: item.id,
    label: item.label,
    unarchiveResult: { success: true }, // Default to success for items that don't need unarchiving
    moveToDeletedResult: { success: true }, // Default to success for items that don't need moving
    clearKeyResult: { success: true }, // Default to success for items that don't need key clearing
    unpublishResult: { success: true }, // Default to success for items that don't need unpublishing
    archiveResult: { success: false },
    overallSuccess: false,
  };

  let currentVersion = item.version || 1;

  try {
    // Step 1: Un-archive if needed
    if (unarchiveIfNeeded && item.status === 'ARCHIVED') {
      const unarchiveResult = await service.unarchiveContentItem(item.id, currentVersion);
      itemResult.unarchiveResult = {
        success: unarchiveResult.success,
        ...(unarchiveResult.error && { error: unarchiveResult.error }),
      };

      if (!unarchiveResult.success) {
        throw new Error(`Failed to unarchive: ${unarchiveResult.error}`);
      }
      // Use actual version from API response
      currentVersion = unarchiveResult.updatedItem?.version || currentVersion + 1;
    }

    if (!unarchiveIfNeeded && item.status === 'ARCHIVED') {
      return itemResult; // Skip processing for already archived items
    }

    // Step 2: Move to deleted folder or root folder if needed
    if (moveToDeletedFolder && deletedFolderId) {
      // Move to deleted folder
      const updateData: Amplience.UpdateContentItemRequest = {
        body: item.body as Record<string, unknown>,
        label: item.label,
        version: currentVersion,
        folderId: deletedFolderId,
      };

      if (clearDeliveryKey && updateData.body?._meta?.deliveryKey) {
        updateData.body._meta.deliveryKey = null;
      }

      const moveToDeletedResult = await service.updateContentItem(item.id, updateData);
      itemResult.moveToDeletedResult = {
        success: moveToDeletedResult.success,
        ...(moveToDeletedResult.error && { error: moveToDeletedResult.error }),
      };

      if (!moveToDeletedResult.success) {
        throw new Error(`Failed to move to deleted folder: ${moveToDeletedResult.error}`);
      }
      // Use actual version from API response
      currentVersion = moveToDeletedResult.updatedItem?.version || currentVersion + 1;
    } else if (moveToRoot) {
      // Check if the item is in a folder by checking if it's a ContentItemWithDetails or ContentItemVersion
      const itemWithDetails = item as Amplience.ContentItemWithDetails;
      if (itemWithDetails.folderId) {
        const updateData: Amplience.UpdateContentItemRequest = {
          body: item.body as Record<string, unknown>,
          label: item.label,
          version: currentVersion,
          // Explicitly omit folderId to move to root folder - most REST APIs use this pattern
        };

        const moveToRootResult = await service.updateContentItem(item.id, updateData);
        itemResult.moveToDeletedResult = {
          success: moveToRootResult.success,
          ...(moveToRootResult.error && { error: moveToRootResult.error }),
        };

        if (!moveToRootResult.success) {
          throw new Error(`Failed to move to root: ${moveToRootResult.error}`);
        }
        // Use actual version from API response
        currentVersion = moveToRootResult.updatedItem?.version || currentVersion + 1;
      }
    }

    // // Step 3: Clear delivery key if it exists and option is enabled
    // if (clearDeliveryKey) {
    //   // Check if the body has the expected structure with _meta.deliveryKey
    //   const metaBody = item.body as Amplience.MetaObj;
    //   if (metaBody?._meta?.deliveryKey) {
    //     const clearKeyResult = await service.updateDeliveryKey(item.id, currentVersion, '');
    //     itemResult.clearKeyResult = {
    //       success: clearKeyResult.success,
    //       ...(clearKeyResult.error && { error: clearKeyResult.error }),
    //     };

    //     if (!clearKeyResult.success) {
    //       throw new Error(`Failed to clear delivery key: ${clearKeyResult.error}`);
    //     }
    //     // Use actual version from API response
    //     currentVersion = clearKeyResult.updatedItem?.version || currentVersion + 1;
    //   }
    // }

    // Step 4: Unpublish (only if item has been published and option is enabled)
    if (
      unpublishIfNeeded &&
      (item.publishingStatus === 'LATEST' || item.publishingStatus === 'EARLY')
    ) {
      const unpublishResult = await service.unpublishContentItem(item.id);
      itemResult.unpublishResult = {
        success: unpublishResult.success,
        ...(unpublishResult.error && { error: unpublishResult.error }),
      };

      if (!unpublishResult.success) {
        throw new Error(`Failed to unpublish: ${unpublishResult.error}`);
      }
      // Unpublish doesn't return an updated item, so keep the current version
    }

    // Step 5: Archive
    if (item.status === 'ACTIVE') {
      const archiveResult = await service.archiveContentItem(item.id, currentVersion);
      itemResult.archiveResult = {
        success: archiveResult.success,
        ...(archiveResult.error && { error: archiveResult.error }),
      };

      if (!archiveResult.success) {
        throw new Error(`Failed to archive: ${archiveResult.error}`);
      }
    }

    itemResult.overallSuccess = true;
  } catch (error) {
    // Item failed at some step
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    itemResult.overallSuccess = false;

    // Add error to the last attempted step if it doesn't already have one
    if (!itemResult.archiveResult.error && !itemResult.archiveResult.success) {
      itemResult.archiveResult.error = errorMessage;
    }
  }

  return itemResult;
}

type CleanupStepResult = {
  success: boolean;
  error?: string;
};

export type ArchiveContentItemOptions = {
  clearDeliveryKey?: boolean;
  unpublishIfNeeded?: boolean;
  unarchiveIfNeeded?: boolean;
  moveToRoot?: boolean;
  moveToDeletedFolder?: boolean;
  deletedFolderId?: string;
};

export type ItemCleanupResult = {
  itemId: string;
  label: string;
  unarchiveResult: CleanupStepResult;
  moveToDeletedResult: CleanupStepResult;
  clearKeyResult: CleanupStepResult;
  unpublishResult: CleanupStepResult;
  archiveResult: CleanupStepResult;
  overallSuccess: boolean;
};
