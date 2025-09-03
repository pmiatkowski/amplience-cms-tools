import { AmplienceService } from '../amplience-service';
import {
  archiveContentItem,
  ItemCleanupResult,
  ArchiveContentItemOptions,
} from './archive-content-item';

/**
 * Detaches a content item from its hierarchy by removing hierarchy references
 * @param service - The Amplience service instance
 * @param item - The content item to detach from hierarchy
 * @returns Promise with the operation result
 */
async function detachFromHierarchy(
  service: AmplienceService,
  item: Amplience.ContentItem | Amplience.ContentItemWithDetails | Amplience.ContentItemVersion
): Promise<{ success: boolean; error?: string; updatedItem?: Amplience.ContentItem }> {
  try {
    // Check if the item has hierarchy information that needs to be removed
    if (!item.hierarchy && !item.body?._meta?.hierarchy) {
      return { success: true }; // Already detached
    }

    console.log(`  Detaching ${item.id} (${item.label}) from hierarchy...`);

    // Create updated body without hierarchy references
    const updatedBody = { ...item.body } as Record<string, unknown>;

    // Remove hierarchy from _meta if it exists
    if (updatedBody._meta && typeof updatedBody._meta === 'object') {
      const meta = { ...updatedBody._meta } as Record<string, unknown>;
      if (meta.hierarchy) {
        delete meta.hierarchy;
        updatedBody._meta = meta;
      }
    }

    // Update the content item to remove hierarchy
    const updateResult = await service.updateContentItem(item.id, {
      body: updatedBody,
      label: item.label,
      version: item.version || 1,
      // Remove hierarchy by not including it in the update
    });

    if (updateResult.success && updateResult.updatedItem) {
      console.log(`    ✅ Successfully detached ${item.id} from hierarchy`);

      return { success: true, updatedItem: updateResult.updatedItem };
    } else {
      const error = updateResult.error || 'Unknown error during update';
      console.log(`    ❌ Failed to detach ${item.id} from hierarchy: ${error}`);

      return { success: false, error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`    ❌ Error detaching ${item.id} from hierarchy: ${errorMessage}`);

    return { success: false, error: errorMessage };
  }
}

/**
 * Archives a content item along with all its hierarchy descendants
 * @param service - The Amplience service instance
 * @param item - The content item to archive (root of hierarchy)
 * @param repositoryId - The repository ID containing the items
 * @param options - Configuration options for the archive process
 * @returns Promise with the cleanup results for all items
 */
export async function archiveContentItemWithDescendants(
  service: AmplienceService,
  item: Amplience.ContentItem | Amplience.ContentItemWithDetails | Amplience.ContentItemVersion,
  repositoryId: string,
  options: ArchiveContentItemOptions = {}
): Promise<ExtendedItemCleanupResult[]> {
  const results: ExtendedItemCleanupResult[] = [];

  try {
    // Check if this item has hierarchy information and might have descendants
    const hasHierarchy = item.hierarchy && (item.hierarchy.root || item.hierarchy.parentId);

    if (hasHierarchy) {
      console.log(
        `Item ${item.id} (${item.label}) appears to be part of a hierarchy, checking for descendants...`
      );

      // Get all descendants of this item
      const descendants = await service.getAllHierarchyDescendants(
        repositoryId,
        item.id,
        (fetched, total) => {
          console.log(`  Scanning for descendants: ${fetched}/${total} items checked`);
        }
      );

      if (descendants.length > 0) {
        console.log(`Found ${descendants.length} descendant items to archive`);

        // Archive all descendants (in reverse order to handle nested hierarchies)
        // This ensures children are archived before parents
        const descendantsReversed = [...descendants].reverse();

        console.log('Archiving descendants with hierarchy detachment...');
        for (const descendant of descendantsReversed) {
          console.log(`Processing descendant: ${descendant.id} (${descendant.label})`);

          // Detach from hierarchy right before archiving to avoid version conflicts
          const detachResult = await detachFromHierarchy(service, descendant);

          // Get the latest item details after detachment to ensure we have current publishing status
          let itemToArchive = descendant;
          if (detachResult.success && detachResult.updatedItem) {
            // Fetch fresh details to get current publishing status
            const freshItem = await service.getContentItemWithDetails(detachResult.updatedItem.id);
            if (freshItem) {
              itemToArchive = freshItem;
            } else {
              itemToArchive = detachResult.updatedItem;
            }
          }

          const descendantResult = await archiveContentItem(service, itemToArchive, options);

          const extendedResult: ExtendedItemCleanupResult = {
            ...descendantResult,
            hierarchyDetachResult: detachResult,
          };
          results.push(extendedResult);
        }
      } else {
        console.log(`No descendant items found for ${item.id}`);
      }
    }

    // Finally, detach and archive the original item
    console.log(`Processing root item: ${item.id} (${item.label})`);
    const rootDetachResult = await detachFromHierarchy(service, item);

    // Get the latest item details after detachment to ensure we have current publishing status
    let rootItemToArchive = item;
    if (rootDetachResult.success && rootDetachResult.updatedItem) {
      // Fetch fresh details to get current publishing status
      const freshRootItem = await service.getContentItemWithDetails(
        rootDetachResult.updatedItem.id
      );
      if (freshRootItem) {
        rootItemToArchive = freshRootItem;
      } else {
        rootItemToArchive = rootDetachResult.updatedItem;
      }
    }

    const itemResult = await archiveContentItem(service, rootItemToArchive, options);

    const extendedItemResult: ExtendedItemCleanupResult = {
      ...itemResult,
      hierarchyDetachResult: rootDetachResult,
    };
    results.push(extendedItemResult);
  } catch (error) {
    console.error(`Error archiving item with descendants ${item.id}:`, error);

    // Create an error result for the main item
    const errorResult: ExtendedItemCleanupResult = {
      itemId: item.id,
      label: item.label,
      unarchiveResult: { success: false, error: 'Failed to process hierarchy' },
      moveToDeletedResult: { success: false, error: 'Failed to process hierarchy' },
      clearKeyResult: { success: false, error: 'Failed to process hierarchy' },
      unpublishResult: { success: false, error: 'Failed to process hierarchy' },
      archiveResult: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      hierarchyDetachResult: { success: false, error: 'Failed to process hierarchy' },
      overallSuccess: false,
    };
    results.push(errorResult);
  }

  return results;
}

/**
 * Extended cleanup result that includes hierarchy detachment information
 */
export type ExtendedItemCleanupResult = {
  hierarchyDetachResult: { success: boolean; error?: string };
} & ItemCleanupResult;

/**
 * Checks if a content item is likely to be a hierarchy root or have descendants
 * @param item - The content item to check
 * @returns True if the item might have descendants
 */
export function isLikelyHierarchyItem(
  item: Amplience.ContentItem | Amplience.ContentItemWithDetails | Amplience.ContentItemVersion
): boolean {
  // Check if the item has hierarchy information
  if (item.hierarchy) {
    // If it's a root item, it might have descendants
    if (item.hierarchy.root) {
      return true;
    }

    // If it has a parentId, it's part of a hierarchy (but might not have descendants)
    // We'll check for descendants anyway to be safe
    if (item.hierarchy.parentId) {
      return true;
    }
  }

  // Check schema ID patterns that commonly indicate hierarchical content
  const schemaId = item.body?._meta?.schema;
  if (schemaId) {
    const hierarchySchemaPatterns = [
      'category',
      'navigation',
      'menu',
      'tree',
      'hierarchy',
      'folder',
      'section',
    ];

    return hierarchySchemaPatterns.some(pattern => schemaId.toLowerCase().includes(pattern));
  }

  return false;
}
