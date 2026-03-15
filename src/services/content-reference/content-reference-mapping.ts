/**
 * Content Reference Mapping Service
 *
 * This module provides functions for managing the reference registry that tracks
 * source-to-target ID mappings and provides matching functionality to find
 * equivalent items in the target hub.
 */
import type {
  DetectedReference,
  ReferenceRegistry,
  ReferenceRegistryEntry,
  TargetMatchResult,
} from './types';


/**
 * Build the reverse reference mapping (referencedBy) for all entries
 */
export function buildReverseReferences(registry: ReferenceRegistry): void {
  // Clear existing reverse references
  for (const entry of registry.entries.values()) {
    entry.referencedBy = [];
  }

  // Build reverse references
  for (const [sourceId, entry] of registry.entries) {
    for (const referencedId of entry.referencesTo) {
      const referencedEntry = registry.entries.get(referencedId);
      if (referencedEntry && !referencedEntry.referencedBy.includes(sourceId)) {
        referencedEntry.referencedBy.push(sourceId);
      }
    }
  }
}






/**
 * Create a new empty reference registry
 */
export function createReferenceRegistry(): ReferenceRegistry {
  return {
    entries: new Map<string, ReferenceRegistryEntry>(),
    sourceToTargetIdMap: new Map<string, string>(),
    unresolvedIds: new Set<string>(),
    externalReferenceIds: new Set<string>(),
  };
}









/**
 * Detect circular reference groups in the registry
 * Uses DFS-based cycle detection
 */
export function detectCircularGroups(registry: ReferenceRegistry): string[][] {
  const circularGroups: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // Found a cycle - extract the cycle nodes
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart !== -1) {
        const cycleNodes = path.slice(cycleStart);
        circularGroups.push(cycleNodes);
      }

      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const entry = registry.entries.get(nodeId);
    if (entry) {
      for (const refId of entry.referencesTo) {
        if (registry.entries.has(refId)) {
          dfs(refId, [...path]);
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  // Run DFS from each node
  for (const sourceId of registry.entries.keys()) {
    if (!visited.has(sourceId)) {
      dfs(sourceId, []);
    }
  }

  // Merge overlapping cycles and deduplicate
  return mergeCircularGroups(circularGroups, registry);
}









/**
 * Get all items that reference a specific item (reverse lookup)
 */
export function getItemsReferencing(
  registry: ReferenceRegistry,
  sourceId: string
): ReferenceRegistryEntry[] {
  const items: ReferenceRegistryEntry[] = [];

  for (const entry of registry.entries.values()) {
    if (entry.referencesTo.includes(sourceId)) {
      items.push(entry);
    }
  }

  return items;
}










/**
 * Get registry statistics for reporting
 */
export function getRegistryStats(registry: ReferenceRegistry): {
  totalItems: number;
  mappedItems: number;
  unmappedItems: number;
  unresolvedItems: number;
  externalItems: number;
  circularGroups: number;
} {
  const circularGroups = detectCircularGroups(registry);

  // Count unmapped items (items without targetId)
  let unmappedCount = 0;
  for (const entry of registry.entries.values()) {
    if (!entry.targetId && !registry.externalReferenceIds.has(entry.sourceItem.id)) {
      unmappedCount++;
    }
  }

  return {
    totalItems: registry.entries.size,
    mappedItems: registry.sourceToTargetIdMap.size,
    unmappedItems: unmappedCount,
    unresolvedItems: registry.unresolvedIds.size,
    externalItems: registry.externalReferenceIds.size,
    circularGroups: circularGroups.length,
  };
}









/**
 * Get the target ID for a source ID, if mapped
 */
export function getTargetId(
  registry: ReferenceRegistry,
  sourceId: string
): string | undefined {
  return registry.sourceToTargetIdMap.get(sourceId);
}









/**
 * Get all source IDs in topological order (dependencies first)
 * Uses Kahn's algorithm for topological sort
 *
 * When A references B, A depends on B, so B must be created before A.
 * The result order should have dependencies first, then dependents.
 */
export function getTopologicalOrder(registry: ReferenceRegistry): string[] {
  // Build dependency graph
  // inDegree[A] = number of items A references (A's dependencies)
  // adjacencyList[B] = list of items that reference B (B's dependents)

  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  // Initialize structures
  for (const sourceId of registry.entries.keys()) {
    inDegree.set(sourceId, 0);
    adjacencyList.set(sourceId, []);
  }

  // Calculate in-degrees and build adjacency list
  // When A references B: A depends on B, so increment A's in-degree
  // and add A to B's adjacency list (A is B's dependent)
  for (const [sourceId, entry] of registry.entries) {
    for (const refId of entry.referencesTo) {
      if (registry.entries.has(refId)) {
        // sourceId references refId, so sourceId depends on refId
        inDegree.set(sourceId, (inDegree.get(sourceId) || 0) + 1);
        // refId has sourceId as a dependent
        adjacencyList.set(refId, [...(adjacencyList.get(refId) || []), sourceId]);
      }
    }
  }

  // Queue items with no dependencies (in-degree 0)
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    result.push(currentId);

    // Reduce in-degree of items that depend on currentId
    const dependents = adjacencyList.get(currentId) || [];
    for (const dependentId of dependents) {
      const newDegree = (inDegree.get(dependentId) || 0) - 1;
      inDegree.set(dependentId, newDegree);

      if (newDegree === 0) {
        queue.push(dependentId);
      }
    }
  }

  // If not all items are in result, there's a cycle
  // Add remaining items (in circular groups) at the end
  for (const sourceId of registry.entries.keys()) {
    if (!result.includes(sourceId)) {
      result.push(sourceId);
    }
  }

  return result;
}










/**
 * Check if an item has been registered
 */
export function isRegistered(registry: ReferenceRegistry, sourceId: string): boolean {
  return registry.entries.has(sourceId);
}









/**
 * Mark an item as having an external reference (outside repository)
 */
export function markExternalReference(
  registry: ReferenceRegistry,
  sourceId: string
): void {
  registry.externalReferenceIds.add(sourceId);
}










/**
 * Mark an item as unresolved (could not match in target)
 */
export function markUnresolved(registry: ReferenceRegistry, sourceId: string): void {
  registry.unresolvedIds.add(sourceId);
}











/**
 * Match multiple source items to target items
 * Returns map of source ID to match result
 */
export function matchAllSourcesToTargets(
  sourceItems: Amplience.ContentItemWithDetails[],
  targetItems: Amplience.ContentItem[]
): Map<string, TargetMatchResult> {
  const results = new Map<string, TargetMatchResult>();

  for (const sourceItem of sourceItems) {
    const matchResult = matchSourceToTarget(sourceItem, targetItems);
    results.set(sourceItem.id, matchResult);
  }

  return results;
}

/**
 * Merge overlapping circular groups into unique groups
 */
function mergeCircularGroups(
  groups: string[][],
  registry: ReferenceRegistry
): string[][] {
  if (groups.length === 0) {
    return [];
  }

  const merged: string[][] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    if (usedIndices.has(i)) continue;

    const currentGroup = new Set(groups[i]);

    // Try to merge with other groups
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = i + 1; j < groups.length; j++) {
        if (usedIndices.has(j)) continue;

        const otherGroup = groups[j];
        const hasOverlap = otherGroup.some((id) => currentGroup.has(id));

        if (hasOverlap) {
          otherGroup.forEach((id) => currentGroup.add(id));
          usedIndices.add(j);
          changed = true;
        }
      }
    }

    // Only include groups with more than one node (actual cycles)
    if (currentGroup.size > 1) {
      merged.push([...currentGroup]);
    } else if (currentGroup.size === 1) {
      // Self-reference check
      const nodeId = [...currentGroup][0];
      const entry = registry.entries.get(nodeId);
      if (entry && entry.referencesTo.includes(nodeId)) {
        merged.push([nodeId]);
      }
    }

    usedIndices.add(i);
  }

  return merged;
}











/**
 * Match a source item to target hub items using priority strategy
 * Priority: 1) Delivery key (exact), 2) Schema ID + Label
 */
export function matchSourceToTarget(
  sourceItem: Amplience.ContentItemWithDetails,
  targetItems: Amplience.ContentItem[]
): TargetMatchResult {
  const sourceId = sourceItem.id;
  const sourceDeliveryKey = sourceItem.body._meta?.deliveryKey;

  // Strategy 1: Match by delivery key (exact match)
  if (sourceDeliveryKey) {
    const deliveryKeyMatch = targetItems.find(
      (target) => target.body._meta?.deliveryKey === sourceDeliveryKey
    );

    if (deliveryKeyMatch) {
      return {
        sourceId,
        status: 'matched',
        targetItem: deliveryKeyMatch,
        confidence: 'delivery_key',
      };
    }
  }

  // Strategy 2: Match by schema ID + label
  const sourceLabel = sourceItem.label;
  const sourceSchema = sourceItem.body._meta?.schema;

  if (sourceSchema) {
    const schemaLabelMatches = targetItems.filter((target) => {
      const targetSchema = target.body._meta?.schema;
      const targetLabel = target.label;

      // Match schema exactly and label (case-insensitive for fuzzy matching)
      return (
        targetSchema === sourceSchema &&
        targetLabel?.toLowerCase() === sourceLabel?.toLowerCase()
      );
    });

    if (schemaLabelMatches.length === 1) {
      return {
        sourceId,
        status: 'matched',
        targetItem: schemaLabelMatches[0],
        confidence: 'schema_label',
      };
    }

    if (schemaLabelMatches.length > 1) {
      return {
        sourceId,
        status: 'multiple_matches',
        targetItem: schemaLabelMatches[0],
        confidence: 'schema_label',
        alternatives: schemaLabelMatches.slice(1),
      };
    }
  }

  // No match found
  return {
    sourceId,
    status: 'no_match',
    confidence: 'none',
  };
}









/**
 * Record a source-to-target ID mapping after item creation
 */
export function recordMapping(
  registry: ReferenceRegistry,
  sourceId: string,
  targetId: string
): void {
  registry.sourceToTargetIdMap.set(sourceId, targetId);

  // Update the entry's targetId if the entry exists
  const entry = registry.entries.get(sourceId);
  if (entry) {
    entry.targetId = targetId;
  }
}




/**
 * Add a content item to the registry with its references
 */
export function registerItem(
  registry: ReferenceRegistry,
  sourceItem: Amplience.ContentItemWithDetails,
  references: DetectedReference[]
): void {
  const existingEntry = registry.entries.get(sourceItem.id);

  if (existingEntry) {
    // Update existing entry with new references
    existingEntry.references = references;
    existingEntry.referencesTo = [...new Set(references.map((ref) => ref.sourceId))];
  } else {
    // Create new entry
    const entry: ReferenceRegistryEntry = {
      sourceItem,
      references,
      referencesTo: [...new Set(references.map((ref) => ref.sourceId))],
      referencedBy: [],
      processed: false,
    };
    registry.entries.set(sourceItem.id, entry);
  }
}
