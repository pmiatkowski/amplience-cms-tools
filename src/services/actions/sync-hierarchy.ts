import { createProgressBar } from '~/utils';
import { AmplienceService } from '../amplience-service';
import { HierarchyService } from '../hierarchy-service';
import {
  archivePreparedItem,
  ensureDeletedFolder,
  prepareItemForRemoval,
  RemovalPreparationResult,
} from './item-removal';
import type { ItemCleanupResult } from './archive-content-item';

const REMOVAL_DELETED_FOLDER_NAME = '__deleted';
const REMOVAL_CLEAR_DELIVERY_KEY = true;
const REMOVAL_UNARCHIVE_IF_NEEDED = true;
const REMOVAL_UNPUBLISH_IF_NEEDED = true;

type RemovalExecutionSummary = {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

/**
 * Interface for locale transformation strategy
 */
export type LocaleStrategy = {
  strategy: 'keep' | 'remove' | 'replace';
  targetLocale?: string;
};


/**
 * Execute hierarchy synchronization action
 */
export async function syncHierarchy(options: SyncHierarchyOptions): Promise<SyncHierarchyResult> {
  const {
    sourceService,
    targetService,
    targetRepositoryId,
    sourceTree,
    targetTree,
    updateContent,
    localeStrategy,
    publishAfterSync,
    isDryRun,
  } = options;

  try {
    // Step 5: Generate Sync Plan
    console.log('\n📋 Step 5: Generating Synchronization Plan');
    const hierarchyService = new HierarchyService(sourceService);
    const syncPlan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, updateContent);

    // Step 6: Display Plan and Confirm
    hierarchyService.displaySyncPlan(syncPlan);

    if (syncPlan.itemsToCreate.length === 0 && syncPlan.itemsToRemove.length === 0) {
      console.log('✅ Synchronization complete - no changes needed!');

      return {
        success: true,
        itemsCreated: 0,
        itemsRemoved: 0,
        itemsUpdated: 0,
      };
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETE - No changes were made.');

      return {
        success: true,
        itemsCreated: 0,
        itemsRemoved: 0,
        itemsUpdated: 0,
      };
    }

    // Step 6: Execute Plan
    console.log('\n🚀 Step 6: Executing Synchronization Plan');
    const result = await executeSyncPlan(
      syncPlan,
      sourceService,
      targetService,
      targetRepositoryId,
      localeStrategy,
      publishAfterSync
    );

    console.log('\n✅ Hierarchy synchronization completed successfully!');

    return result;
  } catch (error) {
    console.error('❌ Error during hierarchy synchronization:', error);

    return {
      success: false,
      itemsCreated: 0,
      itemsRemoved: 0,
      itemsUpdated: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}



/**
 * Options for hierarchy synchronization
 */
export type SyncHierarchyOptions = {
  sourceService: AmplienceService;
  targetService: AmplienceService;
  targetRepositoryId: string;
  sourceTree: Amplience.HierarchyNode;
  targetTree: Amplience.HierarchyNode;
  updateContent: boolean;
  localeStrategy: LocaleStrategy;
  publishAfterSync: boolean;
  isDryRun: boolean;
};


/**
 * Result of a hierarchy synchronization operation
 */
export type SyncHierarchyResult = {
  success: boolean;
  itemsCreated: number;
  itemsRemoved: number;
  itemsUpdated: number;
  error?: string;
};

/**
 * Execute the synchronization plan
 */
async function executeSyncPlan(
  plan: Amplience.SyncPlan,
  _sourceService: AmplienceService,
  targetService: AmplienceService,
  targetRepositoryId: string,
  localeStrategy: LocaleStrategy,
  publishAfterSync: boolean
): Promise<SyncHierarchyResult> {
  let successCount = 0;
  let failureCount = 0;
  let itemsCreated = 0;
  let itemsRemoved = 0;

  // Track mapping between source IDs and newly created target IDs
  const sourceToTargetIdMap = new Map<string, string>();

  // Track IDs of successfully created items for publishing
  const createdItemIds: string[] = [];

  // Execute removals first
  if (plan.itemsToRemove.length > 0) {
    console.log(`\n🗑️  Removing ${plan.itemsToRemove.length} items...`);
    const removeProgress = createProgressBar(plan.itemsToRemove.length, 'Removing items');
    removeProgress.start(plan.itemsToRemove.length, 0);
    const removalResults: RemovalExecutionSummary = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    const deletedFolderResult = await ensureDeletedFolder(
      targetService,
      targetRepositoryId,
      REMOVAL_DELETED_FOLDER_NAME
    );

    if (!deletedFolderResult.success || !deletedFolderResult.folderId) {
      const errorMessage = deletedFolderResult.error || 'Failed to ensure deleted folder';
      console.log(`  ❌ Unable to prepare deleted folder: ${errorMessage}`);

      for (const item of plan.itemsToRemove) {
        const label = item.targetItem?.label || item.sourceItem.label;
        removalResults.attempted++;
        removalResults.failed++;
        removalResults.errors.push(`${label}: ${errorMessage}`);
        failureCount++;
        console.log(`  ❌ Failed to remove ${label}: ${errorMessage}`);
        removeProgress.increment();
      }
    } else {
      const removalOptions = {
        deletedFolderId: deletedFolderResult.folderId,
        deletedFolderName: REMOVAL_DELETED_FOLDER_NAME,
        clearDeliveryKey: REMOVAL_CLEAR_DELIVERY_KEY,
        unarchiveIfNeeded: REMOVAL_UNARCHIVE_IF_NEEDED,
        unpublishIfNeeded: REMOVAL_UNPUBLISH_IF_NEEDED,
      } as const;

      for (const item of plan.itemsToRemove) {
        const targetItem = item.targetItem;

        if (!targetItem) {
          const fallbackLabel = item.sourceItem.label;
          removalResults.attempted++;
          removalResults.failed++;
          removalResults.errors.push(`${fallbackLabel}: Missing target item during removal`);
          failureCount++;
          console.log(`  ❌ Failed to remove ${fallbackLabel}: Missing target item`);
          removeProgress.increment();
          continue;
        }

        const removalOutcome = await handleRemoval(
          targetService,
          targetRepositoryId,
          targetItem,
          removalOptions,
          removalResults
        );

        if (removalOutcome.success) {
          successCount++;
          itemsRemoved++;
        } else {
          failureCount++;
        }

        removeProgress.increment();
      }
    }

    removeProgress.stop();
    logRemovalSummary(removalResults);
  }

  // Execute creations (order is important - we need to create parents before children)
  if (plan.itemsToCreate.length > 0) {
    console.log(`\n🆕 Creating ${plan.itemsToCreate.length} items...`);

    // Sort items by hierarchy depth to ensure parents are created before children
    const sortedItems = sortItemsByHierarchyDepth(plan.itemsToCreate);

    const createProgress = createProgressBar(sortedItems.length, 'Creating items');
    createProgress.start(sortedItems.length, 0);

    for (const item of sortedItems) {
      try {
        // Transform delivery key based on locale strategy
        const transformedBody = transformDeliveryKey(item.sourceItem.body, localeStrategy);

        // Determine the correct target parent ID
        let actualTargetParentId: string | null = null;

        if (item.targetParentId) {
          // Check if this is a mapped ID (newly created parent)
          if (sourceToTargetIdMap.has(item.targetParentId)) {
            actualTargetParentId = sourceToTargetIdMap.get(item.targetParentId)!;
          } else {
            // This should be an existing target item ID
            actualTargetParentId = item.targetParentId;
          }
        }

        // Set up hierarchy relationship in the body
        if (actualTargetParentId) {
          // Ensure _meta object exists
          if (!transformedBody._meta) {
            transformedBody._meta = {};
          }

          // Set hierarchy relationship
          transformedBody._meta.hierarchy = {
            root: false,
            parentId: actualTargetParentId,
          };
        } else {
          // This is a root item
          if (!transformedBody._meta) {
            transformedBody._meta = {};
          }
          transformedBody._meta.hierarchy = {
            root: true,
            parentId: null,
          };
        }

        // Create the content item request (no folderId for hierarchy relationships)
        const targetLocale = getTargetLocale(item.sourceItem.locale, localeStrategy);
        const createRequest: Amplience.CreateContentItemRequest = {
          body: transformedBody,
          label: item.sourceItem.label,
          ...(targetLocale && { locale: targetLocale }),
        };

        // Create the content item
        const result = await targetService.createContentItem(targetRepositoryId, createRequest);

        if (result.success && result.updatedItem) {
          // Store the mapping between source ID and newly created target ID
          sourceToTargetIdMap.set(item.sourceItem.id, result.updatedItem.id);

          // Track created item for publishing
          createdItemIds.push(result.updatedItem.id);

          successCount++;
          itemsCreated++;
          console.log(`  ✅ Created: ${item.sourceItem.label}`);
        } else {
          failureCount++;
          console.log(
            `  ❌ Failed to create: ${item.sourceItem.label} - ${result.error || 'Unknown error'}`
          );
        }
      } catch (error) {
        failureCount++;
        console.log(`  ❌ Failed to create: ${item.sourceItem.label} - ${error}`);
      }
      createProgress.increment();
    }
    createProgress.stop();
  }

  console.log(`\n📊 Execution Summary:`);
  console.log(`  ✅ Successful operations: ${successCount}`);
  console.log(`  ❌ Failed operations: ${failureCount}`);
  console.log(
    `  📈 Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`
  );

  // Step 7: Bulk Publishing (if enabled and items were created)
  if (publishAfterSync && createdItemIds.length > 0) {
    console.log(`\n📤 Step 7: Publishing ${createdItemIds.length} created items...`);

    const publishProgress = createProgressBar(createdItemIds.length, 'Publishing items');
    publishProgress.start(createdItemIds.length, 0);

    let publishSuccessCount = 0;
    let publishFailureCount = 0;

    for (const itemId of createdItemIds) {
      try {
        const publishResult = await targetService.publishContentItem(itemId);
        if (publishResult.success) {
          publishSuccessCount++;
        } else {
          publishFailureCount++;
          console.log(
            `  ❌ Failed to publish item ${itemId}: ${publishResult.error || 'Unknown error'}`
          );
        }
      } catch (error) {
        publishFailureCount++;
        console.log(`  ❌ Failed to publish item ${itemId}: ${error}`);
      }
      publishProgress.increment();
    }

    publishProgress.stop();

    console.log(`\n📤 Publishing Summary:`);
    console.log(`  ✅ Successfully published: ${publishSuccessCount}`);
    console.log(`  ❌ Failed to publish: ${publishFailureCount}`);
    console.log(
      `  📈 Publishing success rate: ${((publishSuccessCount / (publishSuccessCount + publishFailureCount)) * 100).toFixed(1)}%`
    );
  }

  return {
    success: true,
    itemsCreated,
    itemsRemoved,
    itemsUpdated: 0,
  };
}

/**
 * Sort items by hierarchy depth to ensure parents are created before children
 */
function logRemovalSummary(summary: RemovalExecutionSummary): void {
  if (summary.attempted === 0) {
    return;
  }

  console.log(
    `  🗑️ Removal summary: ${summary.succeeded}/${summary.attempted} succeeded, ${summary.failed} failed`
  );

  if (summary.errors.length > 0) {
    console.log('  ⚠️ Removal errors:');
    summary.errors.forEach(error => {
      console.log(`    - ${error}`);
    });
  }
}

type RemovalHandlerOptions = {
  deletedFolderId: string;
  deletedFolderName: string;
  clearDeliveryKey: boolean;
  unarchiveIfNeeded: boolean;
  unpublishIfNeeded: boolean;
};

async function handleRemoval(
  service: AmplienceService,
  repositoryId: string,
  item: Amplience.ContentItem,
  options: RemovalHandlerOptions,
  summary: RemovalExecutionSummary
): Promise<{ success: boolean }> {
  summary.attempted++;

  try {
    const preparation: RemovalPreparationResult = await prepareItemForRemoval(
      service,
      repositoryId,
      item.id,
      {
        deletedFolderId: options.deletedFolderId,
        deletedFolderName: options.deletedFolderName,
        clearDeliveryKey: options.clearDeliveryKey,
        unarchiveIfNeeded: options.unarchiveIfNeeded,
      }
    );

    if (!preparation.success) {
      const errorMessage = preparation.error || 'Failed during removal preparation';
      summary.failed++;
      summary.errors.push(`${item.label}: ${errorMessage}`);
      console.log(`  ❌ Failed to remove ${item.label}: ${errorMessage}`);

      return { success: false };
    }

    const archiveResult = await archivePreparedItem(service, preparation, {
      unpublishIfNeeded: options.unpublishIfNeeded,
      unarchiveIfNeeded: options.unarchiveIfNeeded,
    });

    if (!archiveResult || !archiveResult.overallSuccess) {
      const archiveError = extractArchiveError(archiveResult);
      summary.failed++;
      summary.errors.push(`${item.label}: ${archiveError}`);
      console.log(`  ❌ Failed to remove ${item.label}: ${archiveError}`);

      return { success: false };
    }

    summary.succeeded++;
    console.log(`  ✅ Removed: ${item.label}`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    summary.failed++;
    summary.errors.push(`${item.label}: ${errorMessage}`);
    console.log(`  ❌ Failed to remove ${item.label}: ${errorMessage}`);

    return { success: false };
  }
}

function extractArchiveError(result?: ItemCleanupResult): string {
  if (!result) {
    return 'Archive step skipped: missing prepared item';
  }

  return (
    result.archiveResult.error ||
    result.unpublishResult.error ||
    result.clearKeyResult.error ||
    result.moveToDeletedResult.error ||
    'Archive operation failed'
  );
}

function sortItemsByHierarchyDepth(items: Amplience.SyncItem[]): Amplience.SyncItem[] {
  // Create a map to track parent-child relationships
  const parentChildMap = new Map<string, string[]>();
  const itemMap = new Map<string, Amplience.SyncItem>();

  // Initialize maps
  items.forEach(item => {
    itemMap.set(item.sourceItem.id, item);
    parentChildMap.set(item.sourceItem.id, []);
  });

  // Build parent-child relationships
  items.forEach(item => {
    const parentId = item.targetParentId;
    if (parentId && parentChildMap.has(parentId)) {
      parentChildMap.get(parentId)!.push(item.sourceItem.id);
    }
  });

  // Perform topological sort to get correct order
  const visited = new Set<string>();
  const sorted: Amplience.SyncItem[] = [];

  function visit(itemId: string): void {
    if (visited.has(itemId)) return;

    visited.add(itemId);
    const item = itemMap.get(itemId);
    if (item) {
      sorted.push(item);

      // Visit children
      const children = parentChildMap.get(itemId) || [];
      children.forEach(childId => visit(childId));
    }
  }

  // Start with items that don't have parents in the create list (roots of subtrees)
  items.forEach(item => {
    const hasParentInCreateList = items.some(other => other.sourceItem.id === item.targetParentId);
    if (!hasParentInCreateList && !visited.has(item.sourceItem.id)) {
      visit(item.sourceItem.id);
    }
  });

  // Handle any remaining items (shouldn't happen with a proper hierarchy)
  items.forEach(item => {
    if (!visited.has(item.sourceItem.id)) {
      visit(item.sourceItem.id);
    }
  });

  return sorted;
}

/**
 * Transform delivery key based on locale strategy
 */
function transformDeliveryKey(body: Amplience.Body, strategy: LocaleStrategy): Amplience.Body {
  const transformedBody = { ...body };

  if (!transformedBody._meta?.deliveryKey) {
    return transformedBody;
  }

  const currentDeliveryKey = transformedBody._meta.deliveryKey;

  switch (strategy.strategy) {
    case 'keep':
      // No transformation needed
      break;

    case 'remove': {
      // Remove locale prefix (assuming format like "en-GB-content-name")
      const withoutLocale = currentDeliveryKey.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
      transformedBody._meta!.deliveryKey = withoutLocale;
      break;
    }

    case 'replace': {
      if (strategy.targetLocale) {
        // Replace locale prefix
        const withoutLocale = currentDeliveryKey.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
        transformedBody._meta!.deliveryKey = `${strategy.targetLocale}-${withoutLocale}`;
      }
      break;
    }
  }

  return transformedBody;
}

/**
 * Determine the target locale for a content item based on the locale strategy
 * @param sourceLocale - The locale from the source content item
 * @param localeStrategy - The strategy for handling locale
 * @returns The locale to assign to the new item, or undefined if no locale should be assigned
 */
function getTargetLocale(
  sourceLocale: string | undefined,
  localeStrategy: LocaleStrategy
): string | undefined {
  switch (localeStrategy.strategy) {
    case 'keep':
      // Preserve source locale - return undefined if source has no locale
      return sourceLocale;
    case 'replace':
      // Use the target locale from the strategy
      return localeStrategy.targetLocale;
    case 'remove':
      // No locale assignment
      return undefined;
    default:
      return undefined;
  }
}
