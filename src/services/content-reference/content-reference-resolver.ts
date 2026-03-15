/**
 * Content Reference Resolver Service
 *
 * Main orchestration service that coordinates the full reference resolution process:
 * 1. Discovers all references recursively
 * 2. Matches items to target hub
 * 3. Builds dependency graph
 * 4. Determines creation order
 * 5. Executes two-phase creation for circular references
 */
import { scanContentItem } from './content-reference-discovery';
import { buildDependencyGraph } from './content-reference-graph';
import {
  createReferenceRegistry,
  registerItem,
  recordMapping,
  matchSourceToTarget,
  buildReverseReferences,
  getTopologicalOrder,
  markExternalReference,
  markUnresolved,
  getRegistryStats,
} from './content-reference-mapping';
import {
  prepareBodyForPhase1Creation,
  prepareBodyForPhase2Update,
} from './content-reference-transform';
import type { ReferenceResolutionResult, ReferenceRegistry } from './types';
import type { AmplienceService } from '../amplience-service';

/**
 * Execute phase 1: Create items with circular references nullified
 */
export async function executePhase1Creation(
  registry: ReferenceRegistry,
  targetService: AmplienceService,
  targetRepositoryId: string,
  circularGroupIds: Set<string>,
  onProgress?: (current: number, total: number) => void
): Promise<{ created: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  let failed = 0;

  // Get items in topological order
  const creationOrder = getTopologicalOrder(registry);
  let processed = 0;

  for (const sourceId of creationOrder) {
    const entry = registry.entries.get(sourceId);
    if (!entry || entry.targetId) {
      // Already has target ID (was matched), skip
      processed++;
      onProgress?.(processed, creationOrder.length);
      continue;
    }

    try {
      // Prepare body for phase 1 (nullify circular refs)
      const body = prepareBodyForPhase1Creation(entry.sourceItem, circularGroupIds);

      // Create the item
      const createRequest = {
        body,
        label: entry.sourceItem.label,
        ...(entry.sourceItem.locale && { locale: entry.sourceItem.locale }),
      };

      const result = await targetService.createContentItem(targetRepositoryId, createRequest);

      if (result.success && result.updatedItem) {
        // Record the mapping
        recordMapping(registry, sourceId, result.updatedItem.id);
        created++;

        // Assign delivery key if present
        if (entry.sourceItem.body._meta?.deliveryKey) {
          await targetService.assignDeliveryKey(
            result.updatedItem.id,
            entry.sourceItem.body._meta.deliveryKey
          );
        }
      } else {
        failed++;
        errors.push(`Failed to create item ${sourceId}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error creating item ${sourceId}: ${errorMessage}`);
    }

    processed++;
    onProgress?.(processed, creationOrder.length);
  }

  return { created, failed, errors };
}

/**
 * Execute phase 2: Update items to resolve circular references
 */
export async function executePhase2Update(
  registry: ReferenceRegistry,
  targetService: AmplienceService,
  circularGroupIds: Set<string>,
  onProgress?: (current: number, total: number) => void
): Promise<{ updated: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  let failed = 0;

  // Get phase 2 items (items in circular groups)
  const phase2ItemIds = [...circularGroupIds];
  let processed = 0;

  for (const sourceId of phase2ItemIds) {
    const entry = registry.entries.get(sourceId);
    if (!entry || !entry.targetId) {
      processed++;
      onProgress?.(processed, phase2ItemIds.length);
      continue;
    }

    try {
      // Prepare body for phase 2 (resolve refs with target IDs)
      const body = prepareBodyForPhase2Update(entry.sourceItem, registry.sourceToTargetIdMap);

      // Fetch current item to get version
      const currentItem = await targetService.getContentItemWithDetails(entry.targetId);
      if (!currentItem) {
        throw new Error('Could not fetch current item');
      }

      // Update the item
      const updateRequest = {
        body,
        label: entry.sourceItem.label,
        version: currentItem.version,
        ...(currentItem.folderId && { folderId: currentItem.folderId }),
        ...(currentItem.locale && { locale: currentItem.locale }),
      };

      const result = await targetService.updateContentItem(entry.targetId, updateRequest);

      if (result.success) {
        updated++;
      } else {
        failed++;
        errors.push(`Failed to update item ${entry.targetId}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error updating item ${sourceId}: ${errorMessage}`);
    }

    processed++;
    onProgress?.(processed, phase2ItemIds.length);
  }

  return { updated, failed, errors };
}

/**
 * Get pre-flight summary for user confirmation
 */
export function getPreFlightSummary(resolution: ReferenceResolutionResult): {
  summary: string;
  warnings: string[];
  details: {
    totalItems: number;
    matchedItems: number;
    itemsToCreate: number;
    unresolvedItems: string[];
    externalItems: string[];
    circularGroups: number;
  };
} {
  const warnings: string[] = [];

  // Get unresolved item IDs
  const unresolvedItems: string[] = [];
  for (const [sourceId, entry] of resolution.registry.entries) {
    if (!entry.targetId && !resolution.registry.externalReferenceIds.has(sourceId)) {
      unresolvedItems.push(sourceId);
    }
  }

  // Get external item IDs
  const externalItems = [...resolution.registry.externalReferenceIds];

  // Generate warnings
  if (unresolvedItems.length > 0) {
    warnings.push(`${unresolvedItems.length} items could not be matched in the target hub`);
  }
  if (externalItems.length > 0) {
    warnings.push(
      `${externalItems.length} references point to items outside the source repository`
    );
  }
  if (resolution.circularGroups.length > 0) {
    warnings.push(
      `${resolution.circularGroups.length} circular reference groups detected - will use two-phase creation`
    );
  }

  const summary =
    `Discovered ${resolution.totalDiscovered} items: ` +
    `${resolution.matchedCount} already exist in target, ` +
    `${resolution.toCreateCount} need to be created, ` +
    `${resolution.unresolvedCount} could not be matched`;

  return {
    summary,
    warnings,
    details: {
      totalItems: resolution.totalDiscovered,
      matchedItems: resolution.matchedCount,
      itemsToCreate: resolution.toCreateCount,
      unresolvedItems,
      externalItems,
      circularGroups: resolution.circularGroups.length,
    },
  };
}

/**
 * Main orchestration function that performs full reference resolution
 * 1. Discovers all references recursively
 * 2. Matches items to target hub
 * 3. Builds dependency graph
 * 4. Determines creation order
 */
export async function resolveContentReferences(options: ResolverOptions): Promise<ResolverResult> {
  const {
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    initialItemIds,
    onProgress,
  } = options;

  try {
    // Step 1: Create registry
    const registry = createReferenceRegistry();

    // Step 2: Discover all references recursively
    onProgress?.('discovery', 0, initialItemIds.length);

    // Fetch all items in source repository to determine external references
    const sourceRepoItems = await sourceService.getAllContentItems(
      sourceRepositoryId,
      () => {},
      {}
    );
    const sourceRepoItemIds = new Set(sourceRepoItems.map(item => item.id));

    // Process each initial item and discover its references
    const processedIds = new Set<string>();
    const queue = [...initialItemIds];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (processedIds.has(currentId)) {
        continue;
      }
      processedIds.add(currentId);

      // Fetch the item
      const item = await sourceService.getContentItemWithDetails(currentId);
      if (!item) {
        continue;
      }

      // Scan for references
      const scanResult = scanContentItem(item);

      // Check if this item is external (outside the repository)
      if (!sourceRepoItemIds.has(currentId)) {
        markExternalReference(registry, currentId);
      }

      // Register the item
      registerItem(registry, item, scanResult.references);

      // Add new references to queue
      for (const refId of scanResult.referencedItemIds) {
        if (!processedIds.has(refId)) {
          queue.push(refId);
        }
      }

      onProgress?.('discovery', processedIds.size, processedIds.size + queue.length);
    }

    // Step 3: Build reverse references
    buildReverseReferences(registry);

    // Step 4: Fetch target items and match
    onProgress?.('matching', 0, registry.entries.size);

    const targetItems = await targetService.getAllContentItems(targetRepositoryId, () => {}, {});
    let matchCount = 0;

    for (const [sourceId, entry] of registry.entries) {
      // Skip external references
      if (registry.externalReferenceIds.has(sourceId)) {
        continue;
      }

      // Match to target
      const matchResult = matchSourceToTarget(entry.sourceItem, targetItems);

      if (matchResult.status === 'matched' && matchResult.targetItem) {
        recordMapping(registry, sourceId, matchResult.targetItem.id);
        matchCount++;
      } else if (matchResult.status === 'no_match') {
        markUnresolved(registry, sourceId);
      }

      matchCount++;
      onProgress?.('matching', matchCount, registry.entries.size);
    }

    // Step 5: Build dependency graph
    const graph = buildDependencyGraph(registry);
    const circularGroups = graph.circularGroups;

    // Step 6: Get creation order
    const creationOrder = getTopologicalOrder(registry);

    // Build the result
    const stats = getRegistryStats(registry);

    const resolution: ReferenceResolutionResult = {
      totalDiscovered: stats.totalItems,
      matchedCount: stats.mappedItems,
      toCreateCount: stats.unmappedItems,
      unresolvedCount: stats.unresolvedItems,
      externalCount: stats.externalItems,
      circularGroups,
      registry,
      creationOrder,
    };

    return {
      success: true,
      resolution,
      registry,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      resolution: {
        totalDiscovered: 0,
        matchedCount: 0,
        toCreateCount: 0,
        unresolvedCount: 0,
        externalCount: 0,
        circularGroups: [],
        registry: createReferenceRegistry(),
        creationOrder: [],
      },
      registry: createReferenceRegistry(),
      error: errorMessage,
    };
  }
}

/**
 * Options for the content reference resolver
 */
export type ResolverOptions = {
  /** Service for the source hub */
  sourceService: AmplienceService;
  /** Service for the target hub */
  targetService: AmplienceService;
  /** Source repository ID */
  sourceRepositoryId: string;
  /** Target repository ID */
  targetRepositoryId: string;
  /** Initial item IDs to process */
  initialItemIds: string[];
  /** Progress callback for UI updates */
  onProgress?: (phase: string, current: number, total: number) => void;
};

/**
 * Result of the content reference resolution
 */
export type ResolverResult = {
  /** Whether resolution was successful */
  success: boolean;
  /** The resolution result details */
  resolution: ReferenceResolutionResult;
  /** The populated registry */
  registry: ReferenceRegistry;
  /** Error message if resolution failed */
  error?: string;
};
