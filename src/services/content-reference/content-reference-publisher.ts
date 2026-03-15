/**
 * Content Reference Publisher Service
 *
 * Handles publishing status preservation during content reference resolution.
 * Tracks publishing status from source items and replicates in target hub after creation.
 */
import type { AmplienceService } from '../amplience-service';
import type { ReferenceRegistry } from './types';



/**
 * Extract publishing status from source items
 * Checks _meta.publishingStatus to determine LATEST, EARLY, or UNPUBLISHED
 *
 * @param sourceItems - Array of source content items
 * @returns Map of item ID to publishing status
 */
export function extractPublishingStatus(
  sourceItems: Amplience.ContentItemWithDetails[]
): Map<string, PublishingStatus> {
  const statusMap = new Map<string, PublishingStatus>();

  for (const item of sourceItems) {
    // Check the publishingStatus field
    if (item.publishingStatus === 'LATEST') {
      statusMap.set(item.id, 'LATEST');
    } else if (item.publishingStatus === 'EARLY') {
      statusMap.set(item.id, 'EARLY');
    } else {
      // Item is either unpublished, archived, or has no publishing status
      statusMap.set(item.id, 'UNPUBLISHED');
    }
  }

  return statusMap;
}




/**
 * Result of publishing operation
 */
export type PublishingResult = {
  /** Number of items successfully published */
  published: number;
  /** Number of items that failed to publish */
  failed: number;
  /** Errors encountered during publishing */
  errors: Array<{ itemId: string; error: string }>;
}


/**
 * Publishing status types
 */
export type PublishingStatus = 'LATEST' | 'EARLY' | 'UNPUBLISHED';


/**
 * Publish a single content item in target hub
 *
 * @param targetService - Amplience service for the target hub
 * @param targetItemId - ID of the item to publish
 * @returns Success status and optional error message
 */
export async function publishItem(
  targetService: AmplienceService,
  targetItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await targetService.publishContentItem(targetItemId);

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Publish failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
    };
  }
}


/**
 * Replicate publishing status in target hub after items are created
 * Only publishes items that were published in source
 *
 * @param targetService - Amplience service for the target hub
 * @param registry - Reference registry with source-to-target mappings
 * @param sourceStatusMap - Map of source item ID to publishing status
 * @param onProgress - Optional progress callback
 * @returns Publishing result with counts and errors
 */
export async function replicatePublishingStatus(
  targetService: AmplienceService,
  registry: ReferenceRegistry,
  sourceStatusMap: Map<string, PublishingStatus>,
  onProgress?: (current: number, total: number) => void
): Promise<PublishingResult> {
  const result: PublishingResult = {
    published: 0,
    failed: 0,
    errors: [],
  };

  // Get all items that need to be published (LATEST or EARLY)
  const itemsToPublish: Array<{ sourceId: string; targetId: string }> = [];

  for (const [sourceId, targetId] of registry.sourceToTargetIdMap) {
    const status = sourceStatusMap.get(sourceId);
    if (status === 'LATEST' || status === 'EARLY') {
      itemsToPublish.push({ sourceId, targetId });
    }
  }

  // Track progress
  let processed = 0;
  const total = itemsToPublish.length;

  // Publish each item
  for (const { targetId } of itemsToPublish) {
    try {
      const publishResult = await publishItem(targetService, targetId);

      if (publishResult.success) {
        result.published++;
      } else {
        result.failed++;
        result.errors.push({
          itemId: targetId,
          error: publishResult.error || 'Unknown error',
        });
      }
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        itemId: targetId,
        error: errorMessage,
      });
    }

    processed++;
    onProgress?.(processed, total);
  }

  return result;
}
