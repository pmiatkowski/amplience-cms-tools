/**
 * Content Reference Discovery Service
 *
 * This module provides functions for discovering and scanning
 * content references (content-reference and content-link) within content item bodies.
 */
import { AmplienceService } from '../amplience-service';
import { CONTENT_REFERENCE_SCHEMAS } from './types';
import type { DetectedReference, ReferenceScanResult, ReferenceDiscoveryOptions } from './types';

/**
 * Content reference object structure with id, contentType, and _meta.schema
 */
type ContentReferenceObject = {
  id: string;
  contentType: string;
  _meta: {
    schema: string;
  };
};

/**
 * Batch fetch multiple content items in parallel for performance
 *
 * Implements NFR1-3: minimize API calls and parallelize fetches
 *
 * @param sourceService - Amplience service for the source hub
 * @param itemIds - Item IDs to fetch
 * @param batchSize - Number of parallel fetches (default: 10)
 * @returns Map of item ID to content item
 */
export async function batchFetchItems(
  sourceService: AmplienceService,
  itemIds: string[],
  batchSize: number = 10
): Promise<Map<string, Amplience.ContentItemWithDetails>> {
  const results = new Map<string, Amplience.ContentItemWithDetails>();

  if (itemIds.length === 0) {
    return results;
  }

  // Split into batches for parallel processing
  const batches: string[][] = [];
  for (let i = 0; i < itemIds.length; i += batchSize) {
    batches.push(itemIds.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    const fetchPromises = batch.map(async id => {
      const item = await sourceService.getContentItemWithDetails(id);
      if (item !== null) {
        results.set(id, item);
      }
    });

    await Promise.all(fetchPromises);
  }

  return results;
}

/**
 * Recursively scan an object for all content references
 *
 * @param obj - The object to scan
 * @param currentPath - Current JSON path for tracking reference locations
 * @param results - Array to accumulate detected references
 */
function scanObjectForReferences(
  obj: unknown,
  currentPath: string,
  results: DetectedReference[]
): void {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  const record = obj as Record<string, unknown>;

  // Check if this is a content reference
  if (isContentReference(record)) {
    const ref = record as ContentReferenceObject;
    const schema = ref._meta.schema;

    results.push({
      sourceId: ref.id,
      contentType: ref.contentType,
      path: currentPath,
      isArrayElement: /\[\d+\]$/.test(currentPath),
      referenceSchemaType:
        schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE
          ? 'content-reference'
          : 'content-link',
    });

    return; // Don't recurse into reference objects
  }

  // Recursively scan nested objects
  for (const [key, value] of Object.entries(record)) {
    // Skip _meta as it's already processed
    if (key === '_meta') {
      continue;
    }

    if (Array.isArray(value)) {
      // Process array elements - include the key name in the path
      value.forEach((item, index) => {
        scanObjectForReferences(item, `${currentPath}.${key}[${index}]`, results);
      });
    } else {
      scanObjectForReferences(value, `${currentPath}.${key}`, results);
    }
  }
}

/**
 * Recursively discover all content items referenced by the initial set
 *
 * @param sourceService - Amplience service for the source hub
 * @param initialItemIds - Starting item IDs to scan
 * @param _options - Discovery options (currently unused, reserved for future extensions)
 * @returns Map of item ID to scan result for all discovered items
 */
export async function discoverAllReferences(
  sourceService: AmplienceService,
  initialItemIds: string[],
  _options: ReferenceDiscoveryOptions
): Promise<Map<string, ReferenceScanResult>> {
  const discovered = new Map<string, ReferenceScanResult>();
  const processedIds = new Set<string>();
  const queue = [...initialItemIds];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    // Skip if already processed (handles circular references)
    if (processedIds.has(currentId)) {
      continue;
    }

    processedIds.add(currentId);

    // Fetch the current item
    const item = await sourceService.getContentItemWithDetails(currentId);

    if (item === null) {
      // Item not found - skip but mark as processed to avoid infinite loop
      continue;
    }

    // Scan the item for references
    const scanResult = scanContentItem(item);
    discovered.set(currentId, scanResult);

    // Add new references to queue for discovery
    for (const refId of scanResult.referencedItemIds) {
      if (!discovered.has(refId)) {
        queue.push(refId);
      }
    }
  }

  return discovered;
}

/**
 * Get the set of item IDs that are referenced but not in the discovered set
 *
 * Used to identify items that need to be fetched from the repository
 *
 * @param discovered - Map of discovered items with their references
 * @param repositoryItemIds - Set of item IDs in the repository
 * @returns Set of item IDs not in discovered or repository
 */
export function getMissingReferenceIds(
  discovered: Map<string, ReferenceScanResult>,
  repositoryItemIds: Set<string>
): Set<string> {
  const missingIds = new Set<string>();

  // Get all referenced IDs from discovered items
  for (const scanResult of discovered.values()) {
    for (const refId of scanResult.referencedItemIds) {
      // If the referenced item is not in discovered set and not in repository
      if (!discovered.has(refId) && !repositoryItemIds.has(refId)) {
        missingIds.add(refId);
      }
    }
  }

  return missingIds;
}

/**
 * Check if an object is a content reference or content link
 *
 * A reference is identified by:
 * 1. Having an `id` field (UUID string)
 * 2. Having a `contentType` field (schema URI)
 * 3. Having `_meta.schema` that matches content-reference or content-link
 *
 * @param obj - The object to check
 * @returns Type guard result - true if obj is a content reference
 */
export function isContentReference(obj: unknown): obj is ContentReferenceObject {
  // Check if obj is null or not an object
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // Check for required fields
  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.contentType !== 'string') {
    return false;
  }

  // Check for _meta.schema
  const meta = record._meta;
  if (!meta || typeof meta !== 'object') {
    return false;
  }

  const schema = (meta as Record<string, unknown>).schema;
  if (typeof schema !== 'string') {
    return false;
  }

  // Check if schema contains content-reference or content-link
  const schemaStr = schema as string;

  return (
    schemaStr === CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE ||
    schemaStr === CONTENT_REFERENCE_SCHEMAS.CONTENT_LINK
  );
}

/**
 * Scan a content item body recursively for all content references
 *
 * @param body - The content item body to scan
 * @param basePath - Current JSON path for tracking reference locations (e.g., "body.component[0].image")
 * @returns Array of detected references
 */
export function scanBodyForReferences(
  body: Record<string, unknown>,
  basePath: string = 'body'
): DetectedReference[] {
  const references: DetectedReference[] = [];
  scanObjectForReferences(body, basePath, references);

  return references;
}

/**
 * Scan a single content item and return all references found
 *
 * @param item - The content item to scan
 * @returns Scan result with all references and referenced item IDs
 */
export function scanContentItem(
  item: Amplience.ContentItem | Amplience.ContentItemWithDetails
): ReferenceScanResult {
  const references = scanBodyForReferences(item.body as Record<string, unknown>, 'body');
  const referencedItemIds = [...new Set(references.map(ref => ref.sourceId))];

  return {
    sourceItemId: item.id,
    references,
    referencedItemIds,
  };
}
