/**
 * Content Reference Transformation Service
 *
 * This module provides functions for transforming content item bodies
 * by replacing content reference IDs with target IDs.
 *
 * Supports two-phase creation for circular reference handling:
 * - Phase 1: Nullify circular references (set IDs to null)
 * - Phase 2: Resolve circular references (replace source IDs with target IDs)
 */
import { isContentReference } from './content-reference-discovery';
import { CONTENT_REFERENCE_SCHEMAS } from './types';
import type { BodyTransformOptions, DetectedReference } from './types';

/**
 * Deep clone and transform an object recursively
 * Handles nested objects and arrays
 *
 * @param obj - The object to transform
 * @param transformer - Function to transform reference objects
 * @param currentPath - Current JSON path for tracking
 * @returns Transformed object (new object, original unchanged)
 */
export function deepTransform(
  obj: unknown,
  transformer: (ref: DetectedReference) => { id: string | null } | null,
  currentPath: string = ''
): unknown {
  // Handle null and primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;

      return deepTransform(item, transformer, itemPath);
    });
  }

  // Check if this is a content reference
  const record = obj as Record<string, unknown>;

  if (isContentReference(record)) {
    // Extract reference info
    const ref = record as { id: string; contentType: string; _meta: { schema: string } };
    const schema = ref._meta.schema;

    const detectedRef: DetectedReference = {
      sourceId: ref.id,
      contentType: ref.contentType,
      path: currentPath,
      isArrayElement: /\[\d+\]$/.test(currentPath),
      referenceSchemaType:
        schema === CONTENT_REFERENCE_SCHEMAS.CONTENT_REFERENCE
          ? 'content-reference'
          : 'content-link',
    };

    // Apply transformer
    const transformResult = transformer(detectedRef);

    if (transformResult === null) {
      // Return the reference with nullified ID
      return {
        ...record,
        id: null,
      };
    }

    // Return the reference with transformed ID
    return {
      ...record,
      id: transformResult.id,
    };
  }

  // Recursively transform nested objects
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    // Skip _meta as it's handled separately and we don't want to transform it
    if (key === '_meta') {
      // Preserve _meta as-is (shallow copy is fine, schema should not change)
      result._meta = { ...(value as Record<string, unknown>) };
      continue;
    }

    const valuePath = currentPath ? `${currentPath}.${key}` : key;
    result[key] = deepTransform(value, transformer, valuePath);
  }

  return result;
}

/**
 * Nullify all content references in a body (for phase 1 of circular ref handling)
 * Sets reference IDs to null while preserving structure
 *
 * @param body - Original body from source item
 * @returns New body with all references nullified
 */
export function nullifyReferences(body: Record<string, unknown>): Record<string, unknown> {
  const transformer = (): { id: string | null } | null => {
    // Return null to indicate nullification
    return null;
  };

  return deepTransform(body, transformer, 'body') as Record<string, unknown>;
}

/**
 * Prepare item body for phase 1 creation (with circular refs nullified)
 * Combines reference nullification with existing body preparation
 *
 * @param sourceItem - Source content item
 * @param circularGroupIds - Set of item IDs that are in circular groups
 * @returns Prepared body for phase 1 creation
 */
export function prepareBodyForPhase1Creation(
  sourceItem: Amplience.ContentItemWithDetails,
  circularGroupIds: Set<string>
): Record<string, unknown> {
  // Create transformer that nullifies only circular references
  const transformer = (ref: DetectedReference): { id: string | null } | null => {
    if (circularGroupIds.has(ref.sourceId)) {
      // Nullify circular references
      return null;
    }

    // Keep non-circular references as-is
    return { id: ref.sourceId };
  };

  const transformedBody = deepTransform(
    sourceItem.body as Record<string, unknown>,
    transformer,
    'body'
  ) as Record<string, unknown>;

  // Apply standard body preparation (remove read-only fields)
  return prepareItemBody(transformedBody, sourceItem);
}

/**
 * Prepare item body for phase 2 update (resolve circular refs)
 *
 * @param sourceItem - Source content item
 * @param sourceToTargetIdMap - Map of source ID to target ID
 * @returns Prepared body for phase 2 update
 */
export function prepareBodyForPhase2Update(
  sourceItem: Amplience.ContentItemWithDetails,
  sourceToTargetIdMap: Map<string, string>
): Record<string, unknown> {
  // Create transformer that resolves references using the ID map
  const transformer = (ref: DetectedReference): { id: string | null } | null => {
    const targetId = sourceToTargetIdMap.get(ref.sourceId);
    if (targetId) {
      return { id: targetId };
    }

    // If no mapping exists, keep the original ID
    // This handles external references that weren't copied
    return { id: ref.sourceId };
  };

  const transformedBody = deepTransform(
    sourceItem.body as Record<string, unknown>,
    transformer,
    'body'
  ) as Record<string, unknown>;

  return transformedBody;
}

/**
 * Prepare item body for creation by removing read-only properties
 * Similar to prepareItemBodyForCreation in recreate-content-items.ts
 */
function prepareItemBody(
  body: Record<string, unknown>,
  _sourceItem: Amplience.ContentItemWithDetails
): Record<string, unknown> {
  const prepared = { ...body };

  // Ensure _meta exists and preserve the schema
  if (prepared._meta) {
    prepared._meta = { ...(prepared._meta as Record<string, unknown>) };

    // Remove hierarchy info for child items - relationships established separately
    const meta = prepared._meta as Record<string, unknown>;
    if (meta.hierarchy && !(meta.hierarchy as Record<string, unknown>).root) {
      delete meta.hierarchy;
    }
  }

  return prepared;
}

/**
 * Resolve references in a body using the source-to-target ID map (phase 2)
 *
 * @param body - Body with source IDs
 * @param sourceToTargetIdMap - Map of source ID to target ID
 * @returns New body with target IDs
 */
export function resolveReferences(
  body: Record<string, unknown>,
  sourceToTargetIdMap: Map<string, string>
): Record<string, unknown> {
  // Create transformer that resolves references using the ID map
  const transformer = (ref: DetectedReference): { id: string | null } | null => {
    const targetId = sourceToTargetIdMap.get(ref.sourceId);
    if (targetId) {
      return { id: targetId };
    }

    // If no mapping exists, keep the original ID
    // This handles external references that weren't copied
    return { id: ref.sourceId };
  };

  return deepTransform(body, transformer, 'body') as Record<string, unknown>;
}

/**
 * Transform a content item body by replacing content references with target IDs
 *
 * @param body - Original body from source item
 * @param options - Transform options including phase and ID map
 * @returns Transformed body with updated references
 */
export function transformBodyReferences(
  body: Record<string, unknown>,
  options: BodyTransformOptions
): Record<string, unknown> {
  const { phase, sourceToTargetIdMap, preserveUnmapped } = options;

  // Create transformer based on phase
  const transformer = (ref: DetectedReference): { id: string | null } | null => {
    const targetId = sourceToTargetIdMap.get(ref.sourceId);

    if (phase === 1) {
      // Phase 1: Nullify all references
      return null;
    }

    // Phase 2: Resolve references
    if (targetId) {
      return { id: targetId };
    }

    // Handle unmapped references
    if (preserveUnmapped) {
      return { id: ref.sourceId };
    }

    // Nullify unmapped references
    return null;
  };

  return deepTransform(body, transformer, 'body') as Record<string, unknown>;
}

/**
 * Transform a single reference object
 *
 * @param ref - Reference object to transform
 * @param options - Transform options
 * @returns Transformed reference or null if should be nullified
 */
export function transformReference(
  ref: { id: string; contentType: string; _meta: { schema: string } },
  options: BodyTransformOptions
): { id: string | null; contentType: string; _meta: { schema: string } } | null {
  const { phase, sourceToTargetIdMap, preserveUnmapped } = options;

  if (phase === 1) {
    // Phase 1: Nullify
    return {
      id: null,
      contentType: ref.contentType,
      _meta: { ...ref._meta },
    };
  }

  // Phase 2: Resolve
  const targetId = sourceToTargetIdMap.get(ref.id);

  if (targetId) {
    return {
      id: targetId,
      contentType: ref.contentType,
      _meta: { ...ref._meta },
    };
  }

  if (preserveUnmapped) {
    return {
      id: ref.id,
      contentType: ref.contentType,
      _meta: { ...ref._meta },
    };
  }

  // Nullify unmapped
  return {
    id: null,
    contentType: ref.contentType,
    _meta: { ...ref._meta },
  };
}

/**
 * Validate that all references in a body have valid target IDs
 *
 * @param body - Body to validate
 * @param sourceToTargetIdMap - Map of source ID to target ID
 * @returns Array of unresolved reference IDs
 */
export function validateResolvedReferences(
  body: Record<string, unknown>,
  sourceToTargetIdMap: Map<string, string>
): string[] {
  const unresolvedIds: string[] = [];

  function scanForUnresolved(obj: unknown): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => scanForUnresolved(item));

      return;
    }

    const record = obj as Record<string, unknown>;

    if (isContentReference(record)) {
      const ref = record as { id: string };
      if (!sourceToTargetIdMap.has(ref.id)) {
        unresolvedIds.push(ref.id);
      }

      return;
    }

    for (const [key, value] of Object.entries(record)) {
      if (key !== '_meta') {
        scanForUnresolved(value);
      }
    }
  }

  scanForUnresolved(body);

  return [...new Set(unresolvedIds)]; // Deduplicate
}
