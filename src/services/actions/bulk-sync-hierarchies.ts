import { createProgressBar } from '~/utils';
import { HierarchyService } from '../hierarchy-service';
import { syncHierarchy, type LocaleStrategy } from './sync-hierarchy';
import type { AmplienceService } from '../amplience-service';

/**
 * Execute bulk hierarchy synchronization action
 * Processes multiple hierarchy pairs sequentially, continuing on individual failures
 */
export async function bulkSyncHierarchies(
  options: BulkSyncHierarchiesOptions
): Promise<BulkSyncResult> {
  const {
    sourceService,
    targetService,
    targetRepositoryId,
    matchedPairs,
    updateContent,
    localeStrategy,
    publishAfterSync,
    isDryRun,
  } = options;

  // Initialize result tracking
  const result: BulkSyncResult = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    results: [],
  };

  // Handle empty matched pairs
  if (matchedPairs.length === 0) {
    return result;
  }

  // Create overall progress bar
  const progressBar = createProgressBar(matchedPairs.length, 'Processing hierarchies');

  try {
    // Process each matched pair sequentially
    for (const pair of matchedPairs) {
      const sourceDeliveryKey = pair.source.item.body?._meta?.deliveryKey || 'unknown';
      const sourceName = pair.source.item.label || 'Unnamed Hierarchy';

      console.log(`\n\nCurrent: ${sourceName} (${sourceDeliveryKey})`);

      result.totalProcessed++;

      try {
        // Build hierarchy trees for source and target
        const hierarchyService = new HierarchyService(sourceService);
        const sourceTree = hierarchyService.buildHierarchyTreeFromItems(
          pair.source.item.id,
          pair.source.allItems
        );
        const targetTree = hierarchyService.buildHierarchyTreeFromItems(
          pair.target.item.id,
          pair.target.allItems
        );

        // Execute synchronization for this hierarchy
        await syncHierarchy({
          sourceService,
          targetService,
          targetRepositoryId,
          sourceTree,
          targetTree,
          updateContent,
          localeStrategy,
          publishAfterSync,
          isDryRun,
        });

        // Track success
        result.successful++;
        result.results.push({
          sourceDeliveryKey,
          sourceName,
          success: true,
        });
      } catch (error) {
        // Track failure but continue with remaining hierarchies
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.results.push({
          sourceDeliveryKey,
          sourceName,
          success: false,
          error: errorMessage,
        });

        console.error(`❌ Failed to synchronize ${sourceName}:`, errorMessage);
      }

      // Update progress
      progressBar.increment();
    }
  } finally {
    // Ensure progress bar is stopped
    progressBar.stop();
  }

  return result;
}

/**
 * Options for bulk hierarchy synchronization action
 */
export type BulkSyncHierarchiesOptions = {
  sourceService: AmplienceService;
  targetService: AmplienceService;
  targetRepositoryId: string;
  matchedPairs: MatchedHierarchyPair[];
  updateContent: boolean;
  localeStrategy: LocaleStrategy;
  publishAfterSync: boolean;
  isDryRun: boolean;
};

/**
 * Result of bulk hierarchy synchronization
 */
export type BulkSyncResult = {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    sourceDeliveryKey: string;
    sourceName: string;
    success: boolean;
    error?: string;
    itemsCreated?: number;
    itemsRemoved?: number;
  }>;
};

/**
 * Matched pair of source and target hierarchies
 */
export type MatchedHierarchyPair = {
  source: SourceHierarchy;
  target: {
    item: Amplience.ContentItem;
    allItems: Amplience.ContentItem[];
  };
};

/**
 * Source hierarchy with associated content items
 */
export type SourceHierarchy = {
  item: Amplience.ContentItem;
  allItems: Amplience.ContentItem[];
  contentCount?: number;
};
