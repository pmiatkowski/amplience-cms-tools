import { AmplienceService } from '../amplience-service';

const CONTENT_LINK_REF = 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link';
const CONTENT_REFERENCE_REF =
  'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference';

/**
 * Recursively discovers all embedded content item IDs within a content item's body.
 * Handles Content Links, Content References, and Inline Content Links.
 * Uses a visited Set to prevent infinite loops from circular references.
 *
 * @param sourceService - AmplienceService for fetching referenced items
 * @param items - Array of content items to scan for embedded references
 * @param sourceRepositoryId - Repository ID to scope discovery (items outside this repo are logged as warnings)
 * @example
 * const result = await discoverEmbeddedContent(sourceService, hierarchyItems, sourceRepo.id);
 * console.log(`Found ${result.totalDiscovered} embedded items`);
 * for (const warning of result.warnings) {
 *   console.warn(warning.message);
 * }
 */
export async function discoverEmbeddedContent(
  sourceService: AmplienceService,
  items: Amplience.ContentItemWithDetails[],
  sourceRepositoryId: string
): Promise<EmbeddedContentDiscoveryResult> {
  const visited = new Set<string>();
  const embeddedItemIds = new Set<string>();
  const warnings: DiscoveryWarning[] = [];
  const itemDependencies = new Map<string, Set<string>>();

  // Mark all initial items as visited
  for (const item of items) {
    visited.add(item.id);
  }

  // Process each item's body for embedded references
  for (const item of items) {
    await discoverEmbeddedInItem(
      sourceService,
      item,
      sourceRepositoryId,
      visited,
      embeddedItemIds,
      warnings,
      itemDependencies
    );
  }

  return {
    embeddedItemIds: Array.from(embeddedItemIds),
    warnings,
    itemDependencies,
    totalDiscovered: embeddedItemIds.size,
  };
}

/**
 * Discovers embedded content within a single item's body, recursively following references.
 */
async function discoverEmbeddedInItem(
  sourceService: AmplienceService,
  item: Amplience.ContentItemWithDetails,
  sourceRepositoryId: string,
  visited: Set<string>,
  embeddedItemIds: Set<string>,
  warnings: DiscoveryWarning[],
  itemDependencies: Map<string, Set<string>>
): Promise<void> {
  const referencedIds = extractReferencedIds(item.body);

  if (referencedIds.length === 0) {
    return;
  }

  // Track dependencies for this item
  if (!itemDependencies.has(item.id)) {
    itemDependencies.set(item.id, new Set());
  }

  for (const refId of referencedIds) {
    itemDependencies.get(item.id)!.add(refId);

    // Skip already visited items (circular reference protection)
    if (visited.has(refId)) {
      continue;
    }

    visited.add(refId);

    // Fetch the referenced item
    const referencedItem = await sourceService.getContentItemWithDetails(refId);

    if (!referencedItem) {
      warnings.push({
        type: 'dangling-reference',
        sourceItemId: item.id,
        sourceItemLabel: item.label,
        referencedId: refId,
        message: `Referenced item ${refId} not found (may be deleted or archived). Reference preserved as-is.`,
      });
      continue;
    }

    // Check if the referenced item is in the same repository
    if (referencedItem.contentRepositoryId !== sourceRepositoryId) {
      warnings.push({
        type: 'cross-repository-reference',
        sourceItemId: item.id,
        sourceItemLabel: item.label,
        referencedId: refId,
        message: `Referenced item ${refId} ("${referencedItem.label}") is in a different repository. Reference ID left unchanged.`,
      });
      continue;
    }

    embeddedItemIds.add(refId);

    // Recursively discover embedded content in the referenced item
    await discoverEmbeddedInItem(
      sourceService,
      referencedItem,
      sourceRepositoryId,
      visited,
      embeddedItemIds,
      warnings,
      itemDependencies
    );
  }
}

export type DiscoveryWarning = {
  message: string;
  referencedId: string;
  sourceItemId: string;
  sourceItemLabel: string;
  type: 'dangling-reference' | 'cross-repository-reference';
};

export type EmbeddedContentDiscoveryResult = {
  embeddedItemIds: string[];
  itemDependencies: Map<string, Set<string>>;
  totalDiscovered: number;
  warnings: DiscoveryWarning[];
};

/**
 * Extracts all referenced content item IDs from a content body by traversing
 * the JSON structure looking for Content Link and Content Reference patterns.
 *
 * Detection approach:
 * - Objects with `_meta.schema` matching content-link or content-reference definitions
 *   that also have an `id` property → Content Reference (ID-only reference)
 * - Objects with `_meta.schema` pointing to a content type schema and having
 *   a nested structure (Content Link — full inline object with deliveryId)
 * - Arrays containing any of the above
 *
 * Inline Content (no separate CMS item) is skipped — these objects have `_meta.schema`
 * but no `id` or `deliveryId` at the reference level.
 */
export function extractReferencedIds(body: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  function traverse(value: unknown): void {
    if (value === null || value === undefined || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const element of value) {
        traverse(element);
      }

      return;
    }

    const obj = value as Record<string, unknown>;

    // Check if this object is a Content Reference (has _meta.schema pointing to content-reference def + id)
    if (isContentReference(obj)) {
      const id = obj.id as string;

      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }

      return; // Don't traverse deeper into content references
    }

    // Check if this object is a Content Link (has _meta with deliveryId — the full resolved content)
    if (isContentLink(obj)) {
      const meta = obj._meta as Record<string, unknown>;
      const deliveryId = meta.deliveryId as string | undefined;
      // Content links are resolved inline — we need the original content item ID
      // The deliveryId in _meta corresponds to the content item's deliveryId
      // We need to look for the `id` field if present, or use deliveryId for lookup
      const id = (obj.id as string) || deliveryId;

      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
      // Still traverse deeper — content links may contain nested embedded content
    }

    // Traverse all properties
    for (const key of Object.keys(obj)) {
      if (key === '_meta') continue; // Skip _meta itself to avoid false positives
      traverse(obj[key]);
    }
  }

  // Start traversal from body properties (skip top-level _meta)
  for (const key of Object.keys(body)) {
    if (key === '_meta') continue;
    traverse(body[key]);
  }

  return ids;
}

/**
 * Checks if an object represents a Content Reference
 * (schema = content-reference definition, has `id` field)
 */
function isContentReference(obj: Record<string, unknown>): boolean {
  const meta = obj._meta as Record<string, unknown> | undefined;

  if (!meta?.schema) return false;

  const schema = meta.schema as string;

  return schema === CONTENT_REFERENCE_REF && typeof obj.id === 'string';
}

/**
 * Checks if an object represents a Content Link
 * (has _meta.schema pointing to a content type, has _meta.deliveryId, or has an id field)
 */
function isContentLink(obj: Record<string, unknown>): boolean {
  const meta = obj._meta as Record<string, unknown> | undefined;

  if (!meta?.schema) return false;

  const schema = meta.schema as string;

  // Content links have a schema pointing to a content type (not the core definitions)
  // and typically have a deliveryId in _meta
  if (schema === CONTENT_REFERENCE_REF) return false;
  if (schema === CONTENT_LINK_REF) return false;

  return typeof meta.deliveryId === 'string' || typeof obj.id === 'string';
}
