# Implementation Plan: Full Hierarchy Copy with Embedded Content

> **Status**: Planning **Created**: 2026-03-11 **PRD Version**: 2026-03-11

---

## Summary

**Total Phases**: 4 **Estimated Scope**: Large

---

## Phase 1: Embedded Content Discovery & Circular Reference Detection

**Goal**: Build the core engine that recursively discovers all embedded content
items (Content Links, Content References, Inline Content Links) within content
item bodies, with circular reference protection.

### Files to Create/Modify

```
src/services/actions/embedded-content-discovery.test.ts     # New - Discovery tests (write first — TDD)
src/services/actions/embedded-content-discovery.ts          # New - Core discovery engine
```

### Implementation

> **TDD Note**: Write the test file first (`embedded-content-discovery.test.ts`,
> §1.2), confirm all tests fail, then implement `embedded-content-discovery.ts`
> (§1.1) to make them pass.

#### 1.1: Create Embedded Content Discovery Service

**File**: `src/services/actions/embedded-content-discovery.ts`

```typescript
import { AmplienceService } from '../amplience-service';

const CONTENT_LINK_REF =
  'http://bigcontent.io/cms/schema/v1/core#/definitions/content-link';
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

  // If it has _meta.deliveryId or an id, it's likely a resolved content link
  return typeof meta.deliveryId === 'string' || typeof obj.id === 'string';
}

// --- Types ---

export type EmbeddedContentDiscoveryResult = {
  embeddedItemIds: string[];
  itemDependencies: Map<string, Set<string>>;
  totalDiscovered: number;
  warnings: DiscoveryWarning[];
};

export type DiscoveryWarning = {
  message: string;
  referencedId: string;
  sourceItemId: string;
  sourceItemLabel: string;
  type: 'dangling-reference' | 'cross-repository-reference';
};
```

**Key Points:**

- Uses `Set<string>` for visited IDs — prevents infinite loops on circular
  references (FR-2)
- Detects Content References by `_meta.schema === content-reference` + `id`
  field
- Detects Content Links by `_meta.deliveryId` presence on objects with content
  type schemas
- Skips Inline Content (objects with `_meta.schema` but no `id`/`deliveryId`)
- Tracks per-item dependencies for topological sorting in Phase 3
- Warns on dangling references (deleted/archived source items) and
  cross-repository references

#### 1.2: Tests for Embedded Content Discovery

**File**: `src/services/actions/embedded-content-discovery.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  discoverEmbeddedContent,
  extractReferencedIds,
} from './embedded-content-discovery';
import type { AmplienceService } from '../amplience-service';

describe('extractReferencedIds', () => {
  it('should extract content reference IDs from body', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      relatedArticle: {
        _meta: {
          schema:
            'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        contentType: 'https://example.com/article',
        id: 'ref-item-123',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['ref-item-123']);
  });

  it('should extract content link IDs from body', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      heroImage: {
        _meta: {
          schema: 'https://example.com/media',
          deliveryId: 'link-item-456',
        },
        image: { url: 'https://cdn.example.com/img.jpg' },
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['link-item-456']);
  });

  it('should extract IDs from arrays of content links', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      components: [
        {
          _meta: {
            schema: 'https://example.com/banner',
            deliveryId: 'comp-1',
          },
          title: 'Banner 1',
        },
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'comp-2',
          },
          title: 'Card 1',
        },
      ],
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['comp-1', 'comp-2']);
  });

  it('should handle nested embedded content', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      section: {
        _meta: {
          schema: 'https://example.com/section',
          deliveryId: 'section-1',
        },
        innerContent: {
          _meta: {
            schema: 'https://example.com/widget',
            deliveryId: 'widget-1',
          },
          text: 'Hello',
        },
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toContain('section-1');
    expect(ids).toContain('widget-1');
  });

  it('should skip inline content without id or deliveryId', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      inlineBlock: {
        _meta: {
          schema: 'https://example.com/block',
        },
        text: 'Inline only — no separate CMS item',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual([]);
  });

  it('should deduplicate IDs', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      ref1: {
        _meta: {
          schema:
            'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'same-id',
      },
      ref2: {
        _meta: {
          schema:
            'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'same-id',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['same-id']);
  });

  it('should return empty array for body with no references', () => {
    const body = {
      _meta: { schema: 'https://example.com/article' },
      title: 'Simple article',
      text: 'No embedded content here',
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual([]);
  });
});

describe('discoverEmbeddedContent', () => {
  let mockService: AmplienceService;

  beforeEach(() => {
    mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
  });

  it('should discover directly referenced items', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'media-1',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('media-1', 'repo-1', {
        _meta: { schema: 'https://example.com/media' },
        url: 'https://cdn.example.com/img.jpg',
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual(['media-1']);
    expect(result.totalDiscovered).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it('should handle circular references without infinite loops', async () => {
    const items = [
      createMockItem('item-a', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        related: {
          _meta: {
            schema:
              'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
          id: 'item-b',
        },
      }),
    ];

    // item-b references back to item-a
    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('item-b', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        related: {
          _meta: {
            schema:
              'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
          id: 'item-a', // circular reference back to initial item
        },
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual(['item-b']);
    // item-a was in visited set from the start, so not re-discovered
    expect(mockService.getContentItemWithDetails).toHaveBeenCalledTimes(1);
  });

  it('should warn on cross-repository references', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'media-other-repo',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('media-other-repo', 'repo-2', {
        _meta: { schema: 'https://example.com/media' },
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('cross-repository-reference');
  });

  it('should warn on dangling references', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'deleted-item',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      null
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('dangling-reference');
  });
});

function createMockItem(
  id: string,
  repoId: string,
  body: Record<string, unknown>
): Amplience.ContentItemWithDetails {
  return {
    id,
    contentRepositoryId: repoId,
    label: `Mock ${id}`,
    locale: 'en-GB',
    schemaId: (body._meta as Record<string, unknown>)?.schema as string,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    version: 1,
    deliveryId: id,
    validationState: 'VALID',
    body: body as Amplience.Body,
  } as Amplience.ContentItemWithDetails;
}
```

### Deliverables

- `extractReferencedIds()` can scan any content body and return all embedded
  content item IDs
- `discoverEmbeddedContent()` recursively follows references, fetching each from
  the API
- Circular references detected and short-circuited via visited Set (FR-2)
- Cross-repository references logged as warnings with IDs preserved (FR-5)
- Dangling references to deleted/archived items logged as warnings (FR-1)
- Full test coverage for all detection patterns and edge cases

### Dependencies

- None — this is a standalone utility module

---

## Phase 2: Pre-Operation Validation & Schema Comparison

**Goal**: Implement deep schema validation (identical schema bodies) and content
type existence checks between source and target hubs, and build the duplicate
detection + handling strategy system.

### Files to Create/Modify

```
src/services/actions/full-hierarchy-validation.test.ts      # New - Validation tests (write first — TDD)
src/services/actions/full-hierarchy-validation.ts           # New - Validation logic
src/services/actions/duplicate-handler.test.ts              # New - Duplicate handler tests (write first — TDD)
src/services/actions/duplicate-handler.ts                   # New - Duplicate detection/handling
```

### Implementation

> **TDD Note**: Write test files first (§2.3 validation tests, §2.4 duplicate
> handler tests), confirm all tests fail, then implement §2.1 and §2.2 to make
> them pass.

#### 2.1: Create Pre-Operation Validation

**File**: `src/services/actions/full-hierarchy-validation.ts`

```typescript
import { AmplienceService } from '../amplience-service';

const CMS_METADATA_FIELDS = [
  'id',
  'version',
  'createdBy',
  'createdDate',
  'lastModifiedBy',
  'lastModifiedDate',
] as const;

/**
 * Validates that all schemas and content types required by the items to be copied
 * exist in both source and target hubs, are not archived, and have identical schema bodies.
 *
 * @param sourceService - AmplienceService for the source hub
 * @param targetService - AmplienceService for the target hub
 * @param schemaIds - Array of unique schema IDs used by items to be copied
 * @example
 * const schemaIds = [...new Set(items.map(item => item.schemaId))];
 * const validation = await validateHubCompatibility(sourceService, targetService, schemaIds);
 * if (!validation.valid) {
 *   validation.errors.forEach(e => console.error(`[${e.type}] ${e.message}`));
 * }
 */
export async function validateHubCompatibility(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  schemaIds: string[]
): Promise<HubValidationResult> {
  const errors: ValidationError[] = [];

  // Step 1: Fetch all schemas from both hubs
  const [sourceSchemas, targetSchemas] = await Promise.all([
    sourceService.getAllSchemas(),
    targetService.getAllSchemas(),
  ]);

  const sourceSchemaMap = new Map(sourceSchemas.map(s => [s.schemaId, s]));
  const targetSchemaMap = new Map(targetSchemas.map(s => [s.schemaId, s]));

  // Step 2: Fetch all content types from both hubs
  const [sourceContentTypes, targetContentTypes] = await Promise.all([
    sourceService.getAllContentTypes(),
    targetService.getAllContentTypes(),
  ]);

  const sourceContentTypeMap = new Map(
    sourceContentTypes.map(ct => [ct.contentTypeUri, ct])
  );
  const targetContentTypeMap = new Map(
    targetContentTypes.map(ct => [ct.contentTypeUri, ct])
  );

  for (const schemaId of schemaIds) {
    // Check schema exists in source
    const sourceSchema = sourceSchemaMap.get(schemaId);
    if (!sourceSchema) {
      errors.push({
        type: 'missing-schema',
        hub: 'source',
        schemaId,
        message: `Schema "${schemaId}" not found in source hub`,
      });
      continue;
    }

    if (sourceSchema.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-schema',
        hub: 'source',
        schemaId,
        message: `Schema "${schemaId}" is archived in source hub`,
      });
      continue;
    }

    // Check schema exists in target
    const targetSchema = targetSchemaMap.get(schemaId);
    if (!targetSchema) {
      errors.push({
        type: 'missing-schema',
        hub: 'target',
        schemaId,
        message: `Schema "${schemaId}" not found in target hub`,
      });
      continue;
    }

    if (targetSchema.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-schema',
        hub: 'target',
        schemaId,
        message: `Schema "${schemaId}" is archived in target hub`,
      });
      continue;
    }

    // Check schema bodies are identical (deep equality after normalization)
    if (!areSchemaBodiesEqual(sourceSchema.body, targetSchema.body)) {
      errors.push({
        type: 'schema-mismatch',
        hub: 'both',
        schemaId,
        message: `Schema "${schemaId}" body differs between source and target hubs`,
      });
    }

    // Check content type exists in source
    const sourceContentType = sourceContentTypeMap.get(schemaId);
    if (!sourceContentType) {
      errors.push({
        type: 'missing-content-type',
        hub: 'source',
        schemaId,
        message: `Content type for schema "${schemaId}" not found in source hub`,
      });
      continue;
    }

    if (sourceContentType.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-content-type',
        hub: 'source',
        schemaId,
        message: `Content type for schema "${schemaId}" is archived in source hub`,
      });
    }

    // Check content type exists in target
    const targetContentType = targetContentTypeMap.get(schemaId);
    if (!targetContentType) {
      errors.push({
        type: 'missing-content-type',
        hub: 'target',
        schemaId,
        message: `Content type for schema "${schemaId}" not found in target hub`,
      });
      continue;
    }

    if (targetContentType.status === 'ARCHIVED') {
      errors.push({
        type: 'archived-content-type',
        hub: 'target',
        schemaId,
        message: `Content type for schema "${schemaId}" is archived in target hub`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    schemasChecked: schemaIds.length,
  };
}

/**
 * Normalizes a schema body for comparison by sorting object keys alphabetically
 * and stripping hub-specific CMS metadata fields.
 */
export function normalizeSchemaBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  return sortAndStrip(structuredClone(body));
}

function sortAndStrip(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortAndStrip);
  }

  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (
      CMS_METADATA_FIELDS.includes(key as (typeof CMS_METADATA_FIELDS)[number])
    ) {
      continue; // Strip CMS metadata
    }
    sorted[key] = sortAndStrip(obj[key]);
  }

  return sorted;
}

/**
 * Compares two schema bodies for deep equality after normalization.
 */
export function areSchemaBodiesEqual(
  sourceBody: Record<string, unknown>,
  targetBody: Record<string, unknown>
): boolean {
  const normalizedSource = normalizeSchemaBody(sourceBody);
  const normalizedTarget = normalizeSchemaBody(targetBody);

  return JSON.stringify(normalizedSource) === JSON.stringify(normalizedTarget);
}

// --- Types ---

export type HubValidationResult = {
  errors: ValidationError[];
  schemasChecked: number;
  valid: boolean;
};

export type ValidationError = {
  hub: 'source' | 'target' | 'both';
  message: string;
  schemaId: string;
  type:
    | 'missing-schema'
    | 'archived-schema'
    | 'schema-mismatch'
    | 'missing-content-type'
    | 'archived-content-type';
};
```

**Key Points:**

- Fetches schemas and content types from both hubs in parallel for efficiency
- Normalizes schema bodies: sorts keys alphabetically, strips CMS metadata
  (`id`, `version`, `createdBy`, etc.)
- Uses `structuredClone()` (Node 22+) to avoid mutating original data
- Fails fast with a complete list of all mismatches before aborting

#### 2.2: Create Duplicate Handler

**File**: `src/services/actions/duplicate-handler.ts`

```typescript
import { AmplienceService } from '../amplience-service';

/**
 * Checks if a content item with the given label already exists in the target folder
 * and applies the selected duplicate handling strategy.
 *
 * @param targetService - AmplienceService for the target hub
 * @param targetRepositoryId - Target repository ID
 * @param targetFolderId - Target folder ID (empty string for repository root)
 * @param sourceItem - The source content item being copied
 * @param strategy - User-selected duplicate handling strategy
 */
export async function resolveDuplicate(
  targetService: AmplienceService,
  targetRepositoryId: string,
  targetFolderId: string,
  sourceItem: Amplience.ContentItemWithDetails,
  strategy: DuplicateStrategy
): Promise<DuplicateResolution> {
  // Find existing items with the same label in the target folder
  const existingItems = await targetService.getAllContentItems(
    targetRepositoryId,
    () => {},
    targetFolderId ? { folderId: targetFolderId } : undefined
  );

  const duplicates = existingItems.filter(
    item => item.label === sourceItem.label
  );

  if (duplicates.length === 0) {
    return { action: 'create', label: sourceItem.label };
  }

  switch (strategy) {
    case 'skip': {
      const existing = duplicates[0];
      return {
        action: 'skip',
        existingItemId: existing.id,
        label: existing.label,
      };
    }

    case 'update': {
      const existing = duplicates[0];
      return {
        action: 'update',
        existingItemId: existing.id,
        existingVersion: existing.version,
        label: existing.label,
      };
    }

    case 'rename': {
      const newLabel = generateUniqueLabel(
        sourceItem.label,
        existingItems.map(i => i.label)
      );
      return { action: 'create', label: newLabel };
    }
  }
}

/**
 * Generates a unique label by appending a numeric suffix.
 * E.g., "My Item" → "My Item (1)", "My Item (1)" → "My Item (2)"
 */
export function generateUniqueLabel(
  baseLabel: string,
  existingLabels: string[]
): string {
  const existingSet = new Set(existingLabels);

  // Strip existing suffix if present
  const baseName = baseLabel.replace(/\s*\(\d+\)$/, '');
  let counter = 1;
  let candidate = `${baseName} (${counter})`;

  while (existingSet.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})`;
  }

  return candidate;
}

/**
 * Generates a unique delivery key by appending a numeric suffix.
 * E.g., "my-key" → "my-key-1", "my-key-1" → "my-key-2"
 */
export function generateUniqueDeliveryKey(
  baseKey: string,
  existingKeys: string[]
): string {
  const existingSet = new Set(existingKeys);

  // Strip existing suffix
  const baseName = baseKey.replace(/-\d+$/, '');
  let counter = 1;
  let candidate = `${baseName}-${counter}`;

  while (existingSet.has(candidate)) {
    counter++;
    candidate = `${baseName}-${counter}`;
  }

  return candidate;
}

// --- Types ---

export type DuplicateStrategy = 'skip' | 'update' | 'rename';

export type DuplicateResolution =
  | { action: 'create'; label: string }
  | { action: 'skip'; existingItemId: string; label: string }
  | {
      action: 'update';
      existingItemId: string;
      existingVersion: number;
      label: string;
    };
```

#### 2.3: Tests for Validation

**File**: `src/services/actions/full-hierarchy-validation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  areSchemaBodiesEqual,
  normalizeSchemaBody,
  validateHubCompatibility,
} from './full-hierarchy-validation';
import type { AmplienceService } from '../amplience-service';

describe('normalizeSchemaBody', () => {
  it('should sort object keys alphabetically', () => {
    const body = { z: 1, a: 2, m: 3 };
    const normalized = normalizeSchemaBody(body);
    expect(Object.keys(normalized)).toEqual(['a', 'm', 'z']);
  });

  it('should strip CMS metadata fields', () => {
    const body = {
      id: 'some-id',
      version: 5,
      createdBy: 'user-1',
      createdDate: '2026-01-01',
      lastModifiedBy: 'user-2',
      lastModifiedDate: '2026-02-01',
      title: 'My Schema',
      type: 'object',
    };
    const normalized = normalizeSchemaBody(body);
    expect(normalized).toEqual({ title: 'My Schema', type: 'object' });
  });

  it('should recursively normalize nested objects', () => {
    const body = {
      properties: {
        name: { type: 'string', description: 'Name' },
        age: { description: 'Age', type: 'number' },
      },
    };
    const normalized = normalizeSchemaBody(body) as Record<string, unknown>;
    const props = normalized.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(Object.keys(props.age)).toEqual(['description', 'type']);
  });
});

describe('areSchemaBodiesEqual', () => {
  it('should return true for identical schemas with different key order', () => {
    const source = {
      type: 'object',
      title: 'Test',
      properties: { a: { type: 'string' } },
    };
    const target = {
      properties: { a: { type: 'string' } },
      title: 'Test',
      type: 'object',
    };
    expect(areSchemaBodiesEqual(source, target)).toBe(true);
  });

  it('should return true when only CMS metadata differs', () => {
    const source = { id: 'src-id', version: 1, title: 'Test' };
    const target = { id: 'tgt-id', version: 3, title: 'Test' };
    expect(areSchemaBodiesEqual(source, target)).toBe(true);
  });

  it('should return false for differing schema bodies', () => {
    const source = { title: 'Test', type: 'object' };
    const target = { title: 'Test', type: 'array' };
    expect(areSchemaBodiesEqual(source, target)).toBe(false);
  });
});

describe('validateHubCompatibility', () => {
  let mockSource: AmplienceService;
  let mockTarget: AmplienceService;

  beforeEach(() => {
    mockSource = {
      getAllSchemas: vi.fn(),
      getAllContentTypes: vi.fn(),
    } as unknown as AmplienceService;

    mockTarget = {
      getAllSchemas: vi.fn(),
      getAllContentTypes: vi.fn(),
    } as unknown as AmplienceService;
  });

  it('should pass when all schemas and content types match', async () => {
    const schemaBody = { title: 'Test', type: 'object' };
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: schemaBody,
        status: 'ACTIVE',
      },
    ] as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: schemaBody,
        status: 'ACTIVE',
      },
    ] as Amplience.ContentTypeSchema[]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as Amplience.ContentType[]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as Amplience.ContentType[]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when schema is missing in target hub', async () => {
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      { schemaId: 'https://example.com/test', body: {}, status: 'ACTIVE' },
    ] as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('missing-schema');
    expect(result.errors[0].hub).toBe('target');
  });

  it('should fail when schema bodies differ between hubs', async () => {
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: { type: 'object' },
        status: 'ACTIVE',
      },
    ] as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: { type: 'array' },
        status: 'ACTIVE',
      },
    ] as Amplience.ContentTypeSchema[]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as Amplience.ContentType[]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as Amplience.ContentType[]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === 'schema-mismatch')).toBe(true);
  });
});
```

#### 2.4: Tests for Duplicate Handler

**File**: `src/services/actions/duplicate-handler.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateUniqueLabel,
  generateUniqueDeliveryKey,
} from './duplicate-handler';

describe('generateUniqueLabel', () => {
  it('should append (1) when base label exists', () => {
    const result = generateUniqueLabel('My Item', ['My Item']);
    expect(result).toBe('My Item (1)');
  });

  it('should increment suffix when (1) already exists', () => {
    const result = generateUniqueLabel('My Item', ['My Item', 'My Item (1)']);
    expect(result).toBe('My Item (2)');
  });

  it('should strip existing suffix and re-count', () => {
    const result = generateUniqueLabel('My Item (1)', [
      'My Item',
      'My Item (1)',
    ]);
    expect(result).toBe('My Item (2)');
  });
});

describe('generateUniqueDeliveryKey', () => {
  it('should append -1 when base key exists', () => {
    const result = generateUniqueDeliveryKey('my-key', ['my-key']);
    expect(result).toBe('my-key-1');
  });

  it('should increment suffix when -1 already exists', () => {
    const result = generateUniqueDeliveryKey('my-key', ['my-key', 'my-key-1']);
    expect(result).toBe('my-key-2');
  });
});
```

### Deliverables

- Deep schema comparison between hubs with normalized body equality (FR-3)
- Schema and content type existence checks for both hubs (FR-3)
- Duplicate detection by label within folder path (FR-4)
- Three duplicate strategies: skip, update, rename (FR-4)
- Unique label and delivery key generation with numeric suffix (FR-4, FR-13)
- Comprehensive test coverage for validation and duplicate handling

### Dependencies

- Phase 1 complete (embedded content discovery provides schema IDs to validate)

---

## Phase 3: Core Copy Engine with Dependency-Ordered Creation

**Goal**: Implement the main copy action that creates items in dependency order
(leaves first), updates reference IDs, mirrors folder structure, handles retries
with exponential backoff, publishes items, and generates the operation report.

### Files to Create/Modify

```
src/services/actions/full-hierarchy-copy.test.ts            # New - Copy engine tests (write first — TDD)
src/services/actions/full-hierarchy-copy.ts                 # New - Core copy engine
src/services/actions/index.ts                               # Modify - Add barrel export
```

### Implementation

> **TDD Note**: Write the test file first (`full-hierarchy-copy.test.ts`, §3.2),
> confirm all tests fail, then implement `full-hierarchy-copy.ts` (§3.1) to make
> them pass.

#### 3.1: Create the Full Hierarchy Copy Action

**File**: `src/services/actions/full-hierarchy-copy.ts`

```typescript
import cliProgress from 'cli-progress';
import { AmplienceService } from '../amplience-service';
import {
  discoverEmbeddedContent,
  type DiscoveryWarning,
} from './embedded-content-discovery';
import { resolveDuplicate, type DuplicateStrategy } from './duplicate-handler';
import {
  validateHubCompatibility,
  type HubValidationResult,
} from './full-hierarchy-validation';
import { createProgressBar } from '~/utils';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Performs a full hierarchy copy including all embedded content items.
 *
 * Phases:
 *  1. Discovery — recursively discovers all hierarchy children + embedded content
 *  2. Validation — checks schemas/content types match between hubs
 *  3. Folder creation — mirrors source folder structure in target
 *  4. Item creation — creates items in dependency order (leaves first)
 *  5. Hierarchy establishment — sets parent-child relationships
 *  6. Publishing — publishes items that were published in source
 *
 * @param options - Full configuration for the copy operation
 * @example
 * const result = await executeFullHierarchyCopy({
 *   sourceService, targetService,
 *   sourceRepositoryId, targetRepositoryId,
 *   hierarchyItems: ['item-id-1', 'item-id-2'],
 *   folderMapping: new Map(),
 *   duplicateStrategy: 'skip',
 *   isDryRun: false,
 * });
 * console.log(`Created: ${result.itemsCreated.length}`);
 */
export async function executeFullHierarchyCopy(
  options: FullHierarchyCopyOptions
): Promise<FullHierarchyCopyResult> {
  const startTime = Date.now();
  const {
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    hierarchyItems,
    folderMapping,
    duplicateStrategy,
    isDryRun,
    targetLocale,
  } = options;

  const result: FullHierarchyCopyResult = {
    itemsCreated: [],
    itemsSkipped: [],
    itemsFailed: [],
    itemsPublished: [],
    folderMappings: new Map(folderMapping),
    discoveryWarnings: [],
    validationResult: null,
    duration: 0,
  };

  // --- Phase 1: Discovery ---
  console.log(
    '\n🔍 Phase 1: Discovering all content items and embedded dependencies...'
  );

  // Fetch detailed info for all hierarchy items
  const detailedItems: Amplience.ContentItemWithDetails[] = [];
  for (const itemId of hierarchyItems) {
    const details = await sourceService.getContentItemWithDetails(itemId);
    if (details) {
      detailedItems.push(details);
    }
  }

  // Discover all embedded content recursively
  const discovery = await discoverEmbeddedContent(
    sourceService,
    detailedItems,
    sourceRepositoryId
  );

  result.discoveryWarnings = discovery.warnings;
  console.log(
    `  ✅ Discovered ${discovery.totalDiscovered} embedded content items`
  );
  if (discovery.warnings.length > 0) {
    console.log(
      `  ⚠️  ${discovery.warnings.length} warnings (see report for details)`
    );
  }

  // Fetch detailed info for discovered embedded items
  const embeddedDetailedItems: Amplience.ContentItemWithDetails[] = [];
  for (const embedId of discovery.embeddedItemIds) {
    const details = await sourceService.getContentItemWithDetails(embedId);
    if (details) {
      embeddedDetailedItems.push(details);
    }
  }

  const allItems = [...detailedItems, ...embeddedDetailedItems];

  // --- Phase 2: Validation ---
  console.log(
    '\n🔎 Phase 2: Validating schema and content type compatibility...'
  );

  const allSchemaIds = [...new Set(allItems.map(item => item.schemaId))];
  const validationResult = await validateHubCompatibility(
    sourceService,
    targetService,
    allSchemaIds
  );

  result.validationResult = validationResult;

  if (!validationResult.valid) {
    console.error('\n❌ Validation failed! Mismatches found:');
    for (const error of validationResult.errors) {
      console.error(`  • [${error.type}] ${error.message}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }

  console.log(
    `  ✅ All ${validationResult.schemasChecked} schemas validated successfully`
  );

  if (isDryRun) {
    console.log('\n🔍 DRY RUN — Validation passed. No changes will be made.');
    result.duration = Date.now() - startTime;
    return result;
  }

  // --- Phase 3: Mirror folder structure ---
  console.log('\n📁 Phase 3: Mirroring folder structure in target...');

  await mirrorFolderStructure(
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    allItems,
    result.folderMappings
  );

  // --- Phase 4: Create items in dependency order ---
  console.log('\n🏗️  Phase 4: Creating content items in dependency order...');

  const sortedItems = topologicalSort(allItems, discovery.itemDependencies);
  const idMapping = new Map<string, string>(); // source ID → target ID

  const progressBar = createProgressBar(sortedItems.length, 'Creating items');

  for (const item of sortedItems) {
    const targetFolderId =
      result.folderMappings.get(item.folderId || '') || undefined;

    // Check for duplicates
    const resolution = await resolveDuplicate(
      targetService,
      targetRepositoryId,
      targetFolderId || '',
      item,
      duplicateStrategy
    );

    if (resolution.action === 'skip') {
      idMapping.set(item.id, resolution.existingItemId);
      result.itemsSkipped.push({
        sourceId: item.id,
        targetId: resolution.existingItemId,
        label: item.label,
        reason: 'duplicate-skipped',
      });
      progressBar.increment();
      continue;
    }

    // Prepare body with updated reference IDs
    const preparedBody = replaceReferenceIdsInBody(item.body, idMapping);

    if (resolution.action === 'update') {
      const updateSuccess = await retryOperation(() =>
        updateExistingItem(
          targetService,
          resolution.existingItemId,
          resolution.existingVersion,
          preparedBody,
          item.label
        )
      );
      if (updateSuccess) {
        idMapping.set(item.id, resolution.existingItemId);
        result.itemsCreated.push({
          sourceId: item.id,
          targetId: resolution.existingItemId,
          label: item.label,
          action: 'updated',
        });
      } else {
        result.itemsFailed.push({
          sourceId: item.id,
          label: item.label,
          error: 'Update failed after retries',
        });
      }
      progressBar.increment();
      continue;
    }

    // Create new item
    const locale = targetLocale || item.locale;
    const newItem = await retryOperation(() =>
      createItemInTarget(
        targetService,
        targetRepositoryId,
        preparedBody,
        resolution.label,
        targetFolderId,
        locale
      )
    );

    if (newItem) {
      idMapping.set(item.id, newItem.id);
      result.itemsCreated.push({
        sourceId: item.id,
        targetId: newItem.id,
        label: resolution.label,
        action: 'created',
      });

      // Handle delivery key
      const deliveryKey = item.body._meta?.deliveryKey;
      if (deliveryKey) {
        await targetService.assignDeliveryKey(newItem.id, deliveryKey);
      }
    } else {
      result.itemsFailed.push({
        sourceId: item.id,
        label: item.label,
        error: 'Creation failed after retries',
      });
    }

    progressBar.increment();
  }

  progressBar.stop();

  // --- Phase 5: Establish hierarchy relationships ---
  console.log('\n🔗 Phase 5: Establishing hierarchy relationships...');

  const hierarchyDetailedItems = detailedItems.filter(item => item.hierarchy);
  const rootItems = hierarchyDetailedItems.filter(item => item.hierarchy?.root);
  const childItems = hierarchyDetailedItems.filter(
    item => item.hierarchy && !item.hierarchy.root && item.hierarchy.parentId
  );

  // Establish roots first
  for (const root of rootItems) {
    const targetId = idMapping.get(root.id);
    if (!targetId) continue;

    const targetItem = await targetService.getContentItemWithDetails(targetId);
    if (targetItem && !targetItem.body._meta?.hierarchy?.root) {
      await targetService.updateContentItem(targetId, {
        body: {
          ...targetItem.body,
          _meta: {
            ...targetItem.body._meta,
            hierarchy: { root: true, parentId: null },
          },
        },
        label: targetItem.label,
        version: targetItem.version,
        ...(targetItem.folderId && { folderId: targetItem.folderId }),
        ...(targetItem.locale && { locale: targetItem.locale }),
      });
    }

    // Publish root to establish as valid hierarchy node
    if (shouldPublishItem(root)) {
      await publishWithRetry(targetService, targetId);
      await delay(200);
    }
  }

  // Establish child relationships
  for (const child of childItems) {
    const targetChildId = idMapping.get(child.id);
    const targetParentId = idMapping.get(child.hierarchy!.parentId!);
    if (!targetChildId || !targetParentId) continue;

    await retryOperation(() =>
      targetService
        .createHierarchyNode(targetRepositoryId, targetChildId, targetParentId)
        .then(success =>
          success ? ({} as Amplience.ContentItemWithDetails) : null
        )
    );
  }

  // --- Phase 6: Publish ---
  console.log('\n📤 Phase 6: Publishing items...');

  // Publish hierarchy parent-first (roots already published above)
  for (const child of childItems) {
    const targetId = idMapping.get(child.id);
    if (!targetId || !shouldPublishItem(child)) continue;

    const published = await publishWithRetry(targetService, targetId);
    if (published) {
      result.itemsPublished.push({ sourceId: child.id, targetId });
    }
    await delay(100);
  }

  // Publish embedded items
  for (const embItem of embeddedDetailedItems) {
    const targetId = idMapping.get(embItem.id);
    if (!targetId || !shouldPublishItem(embItem)) continue;

    const published = await publishWithRetry(targetService, targetId);
    if (published) {
      result.itemsPublished.push({ sourceId: embItem.id, targetId });
    }
  }

  result.duration = Date.now() - startTime;

  // Final summary
  console.log('\n📊 Operation Summary:');
  console.log(`  ✅ Created/Updated: ${result.itemsCreated.length}`);
  console.log(`  ⏩ Skipped: ${result.itemsSkipped.length}`);
  console.log(`  ❌ Failed: ${result.itemsFailed.length}`);
  console.log(`  📤 Published: ${result.itemsPublished.length}`);
  console.log(`  ⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`);

  return result;
}

// --- Helper Functions ---

/**
 * Replaces source content item IDs with target IDs in a content body.
 * Traverses the body recursively, updating `id` and `deliveryId` fields
 * within Content Link and Content Reference objects.
 */
export function replaceReferenceIdsInBody(
  body: Amplience.Body,
  idMapping: Map<string, string>
): Amplience.Body {
  const cloned = JSON.parse(JSON.stringify(body)) as Amplience.Body;

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

    // Replace `id` field if it maps to a target ID
    if (typeof obj.id === 'string' && idMapping.has(obj.id)) {
      obj.id = idMapping.get(obj.id)!;
    }

    // Replace deliveryId in _meta if it maps
    if (obj._meta && typeof obj._meta === 'object') {
      const meta = obj._meta as Record<string, unknown>;
      if (
        typeof meta.deliveryId === 'string' &&
        idMapping.has(meta.deliveryId)
      ) {
        meta.deliveryId = idMapping.get(meta.deliveryId)!;
      }
    }

    for (const key of Object.keys(obj)) {
      traverse(obj[key]);
    }
  }

  traverse(cloned);
  return cloned;
}

/**
 * Topologically sorts items so dependencies (embedded items) are created before
 * the items that reference them. Uses Kahn's algorithm.
 */
function topologicalSort(
  allItems: Amplience.ContentItemWithDetails[],
  dependencies: Map<string, Set<string>>
): Amplience.ContentItemWithDetails[] {
  const itemMap = new Map(allItems.map(item => [item.id, item]));
  const itemIds = new Set(allItems.map(item => item.id));

  // Build in-degree map
  const inDegree = new Map<string, number>();
  const reverseDeps = new Map<string, Set<string>>();

  for (const id of itemIds) {
    inDegree.set(id, 0);
    reverseDeps.set(id, new Set());
  }

  // For each item, count how many of its dependencies are in our set
  for (const [itemId, deps] of dependencies) {
    if (!itemIds.has(itemId)) continue;
    for (const depId of deps) {
      if (itemIds.has(depId)) {
        inDegree.set(itemId, (inDegree.get(itemId) || 0) + 1);
        reverseDeps.get(depId)!.add(itemId);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: Amplience.ContentItemWithDetails[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const item = itemMap.get(current);
    if (item) sorted.push(item);

    for (const dependent of reverseDeps.get(current) || []) {
      const newDegree = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // Add any remaining items (circular deps that Kahn's can't resolve)
  for (const item of allItems) {
    if (!sorted.includes(item)) {
      sorted.push(item);
    }
  }

  return sorted;
}

/**
 * Mirrors the source folder structure in the target repository.
 * Creates any folders that don't already exist.
 */
async function mirrorFolderStructure(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  sourceRepositoryId: string,
  targetRepositoryId: string,
  items: Amplience.ContentItemWithDetails[],
  folderMapping: Map<string, string>
): Promise<void> {
  // Collect unique source folder IDs
  const sourceFolderIds = new Set<string>();
  for (const item of items) {
    if (item.folderId) {
      sourceFolderIds.add(item.folderId);
    }
  }

  if (sourceFolderIds.size === 0) {
    console.log(
      '  ℹ️  All items are in repository root, no folder mirroring needed.'
    );
    return;
  }

  // Build source folder path map
  const sourceFolders = await sourceService.getAllFolders(sourceRepositoryId);
  const targetFolders = await targetService.getAllFolders(targetRepositoryId);

  // Build path-to-folder maps
  const sourceFolderById = new Map(sourceFolders.map(f => [f.id, f]));
  const targetFolderByName = new Map(targetFolders.map(f => [f.name, f]));

  for (const folderId of sourceFolderIds) {
    if (folderMapping.has(folderId)) continue; // Already mapped

    const sourceFolder = sourceFolderById.get(folderId);
    if (!sourceFolder) continue;

    // Check if a folder with the same name exists in target
    const existingTarget = targetFolderByName.get(sourceFolder.name);
    if (existingTarget) {
      folderMapping.set(folderId, existingTarget.id);
      console.log(
        `  📁 Mapped existing folder: ${sourceFolder.name} → ${existingTarget.id}`
      );
    } else {
      // Create the folder in target
      const createResult = await targetService.createFolder(
        targetRepositoryId,
        {
          name: sourceFolder.name,
        }
      );
      if (createResult.success && createResult.updatedItem) {
        folderMapping.set(folderId, createResult.updatedItem.id);
        console.log(
          `  📁 Created folder: ${sourceFolder.name} → ${createResult.updatedItem.id}`
        );
      } else {
        console.warn(
          `  ⚠️  Failed to create folder "${sourceFolder.name}": ${createResult.error}`
        );
      }
    }
  }
}

/**
 * Retries an operation up to MAX_RETRIES times with exponential backoff.
 * For 409 Conflict errors, re-fetches the item to get the current version.
 */
async function retryOperation<T>(
  operation: () => Promise<T | null>,
  attempt: number = 1
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      console.error(`  ❌ Operation failed after ${MAX_RETRIES} retries`);
      return null;
    }

    const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    console.warn(`  ⚠️  Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms...`);
    await delay(backoff);

    return retryOperation(operation, attempt + 1);
  }
}

async function createItemInTarget(
  service: AmplienceService,
  repositoryId: string,
  body: Amplience.Body,
  label: string,
  folderId?: string,
  locale?: string | null
): Promise<Amplience.ContentItemWithDetails | null> {
  const request: Amplience.CreateContentItemRequest = {
    body,
    label,
    ...(folderId && { folderId }),
    ...(locale && { locale }),
  };

  const result = await service.createContentItem(repositoryId, request);
  if (result.success && result.updatedItem) {
    return result.updatedItem;
  }
  return null;
}

async function updateExistingItem(
  service: AmplienceService,
  itemId: string,
  version: number,
  body: Amplience.Body,
  label: string
): Promise<Amplience.ContentItemWithDetails | null> {
  const result = await service.updateContentItem(itemId, {
    body,
    label,
    version,
  });

  if (result.success && result.updatedItem) {
    return result.updatedItem;
  }

  // Handle 409 version conflict
  if (result.error?.includes('409')) {
    const current = await service.getContentItemWithDetails(itemId);
    if (current) {
      const retryResult = await service.updateContentItem(itemId, {
        body,
        label,
        version: current.version,
      });
      if (retryResult.success && retryResult.updatedItem) {
        return retryResult.updatedItem;
      }
    }
  }

  return null;
}

async function publishWithRetry(
  service: AmplienceService,
  itemId: string
): Promise<boolean> {
  const result = await service.publishContentItem(itemId);
  return result.success;
}

function shouldPublishItem(item: Amplience.ContentItemWithDetails): boolean {
  return (
    item.status === 'ACTIVE' &&
    (item.publishingStatus === 'EARLY' || item.publishingStatus === 'LATEST')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Types ---

export type FullHierarchyCopyOptions = {
  duplicateStrategy: DuplicateStrategy;
  folderMapping: Map<string, string>;
  hierarchyItems: string[];
  isDryRun: boolean;
  sourceRepositoryId: string;
  sourceService: AmplienceService;
  targetLocale?: string | null;
  targetRepositoryId: string;
  targetService: AmplienceService;
};

export type FullHierarchyCopyResult = {
  discoveryWarnings: DiscoveryWarning[];
  duration: number;
  folderMappings: Map<string, string>;
  itemsCreated: CreatedItemRecord[];
  itemsFailed: FailedItemRecord[];
  itemsPublished: PublishedItemRecord[];
  itemsSkipped: SkippedItemRecord[];
  validationResult: HubValidationResult | null;
};

export type CreatedItemRecord = {
  action: 'created' | 'updated';
  label: string;
  sourceId: string;
  targetId: string;
};

export type SkippedItemRecord = {
  label: string;
  reason: string;
  sourceId: string;
  targetId: string;
};

export type FailedItemRecord = {
  error: string;
  label: string;
  sourceId: string;
};

export type PublishedItemRecord = {
  sourceId: string;
  targetId: string;
};
```

**Key Points:**

- Six distinct phases with clear console output for each
- Topological sort (Kahn's algorithm) ensures leaves are created before parents
  (FR-6)
- `replaceReferenceIdsInBody()` updates all source IDs → target IDs in content
  bodies (FR-6)
- Retry with exponential backoff up to 3 times; 409 conflicts handled by
  re-fetching version (FR-7)
- Progress bar shows deterministic progress based on total discovered items
  (FR-8)
- Publication follows parent-first ordering with delays between publishes
  (FR-11)
- Mirror folder structure creates missing folders in target (FR-5)
- Dry-run mode: `isDryRun: true` skips phases 3–6 and returns after validation
  (`tech-stack.md` §4.6)
- Dry-run mode returns early after validation without making any changes
  (`tech-stack.md` §4.6)

#### 3.2: Tests for the Copy Engine

**File**: `src/services/actions/full-hierarchy-copy.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { replaceReferenceIdsInBody } from './full-hierarchy-copy';

describe('replaceReferenceIdsInBody', () => {
  it('should replace content reference IDs', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      related: {
        _meta: {
          schema:
            'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'source-id-1',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-id-1', 'target-id-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const related = result.related as Record<string, unknown>;
    expect(related.id).toBe('target-id-1');
  });

  it('should replace content link deliveryIds in _meta', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      hero: {
        _meta: {
          schema: 'https://example.com/media',
          deliveryId: 'source-delivery-1',
        },
        image: {},
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-delivery-1', 'target-delivery-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const hero = result.hero as Record<string, unknown>;
    const meta = hero._meta as Record<string, unknown>;
    expect(meta.deliveryId).toBe('target-delivery-1');
  });

  it('should handle nested references in arrays', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      components: [
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-1',
          },
        },
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-2',
          },
        },
      ],
    } as unknown as Amplience.Body;

    const mapping = new Map([
      ['src-1', 'tgt-1'],
      ['src-2', 'tgt-2'],
    ]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const components = result.components as Array<Record<string, unknown>>;
    expect((components[0]._meta as Record<string, unknown>).deliveryId).toBe(
      'tgt-1'
    );
    expect((components[1]._meta as Record<string, unknown>).deliveryId).toBe(
      'tgt-2'
    );
  });

  it('should not modify IDs that are not in the mapping', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      ref: {
        _meta: {
          schema:
            'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'unknown-id',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map<string, string>();
    const result = replaceReferenceIdsInBody(body, mapping);

    const ref = result.ref as Record<string, unknown>;
    expect(ref.id).toBe('unknown-id');
  });
});
```

#### 3.3: Update Actions Barrel Export

**File**: `src/services/actions/index.ts` — add at end of exports:

```typescript
export * from './embedded-content-discovery';
export * from './duplicate-handler';
export * from './full-hierarchy-validation';
export * from './full-hierarchy-copy';
```

### Deliverables

- Full copy engine that orchestrates discovery → validation → folder creation →
  item creation → hierarchy → publishing
- Dependency-ordered creation via topological sort (FR-6)
- Reference ID replacement mapping source → target IDs in all content bodies
  (FR-6)
- Retry with exponential backoff; 409 conflict handling (FR-7)
- Two-phase progress: spinner during discovery, progress bar during execution
  (FR-8)
- Folder structure mirroring (FR-5)
- Publishing mirrors source state, parent-first ordering (FR-11)
- Dry-run mode: `isDryRun: true` aborts after validation with no writes
  (`tech-stack.md` §4.6)

### Dependencies

- Phase 1 complete (embedded content discovery)
- Phase 2 complete (validation and duplicate handling)

---

## Phase 4: Command UI, Prompts, and Report Generation

**Goal**: Create the user-facing command that orchestrates the full workflow
(prompts, confirmation, execution, report), register it in the application, and
add documentation.

### Files to Create/Modify

```
src/commands/full-hierarchy-copy/prompts/prompt-for-duplicate-strategy.test.ts # New - Tests (write first — TDD)
src/commands/full-hierarchy-copy/prompts/prompt-for-duplicate-strategy.ts # New - Strategy picker
src/commands/full-hierarchy-copy/prompts/index.ts                       # New - Prompt barrel export
src/commands/full-hierarchy-copy/report.test.ts                         # New - Report tests (write first — TDD)
src/commands/full-hierarchy-copy/report.ts                              # New - Report generator
src/commands/full-hierarchy-copy/full-hierarchy-copy.ts                 # New - Main command
src/commands/full-hierarchy-copy/index.ts                               # New - Barrel export
src/commands/index.ts                                                   # Modify - Add export
src/services/actions/index.ts                                           # Modify - Update exports
src/index.ts                                                            # Modify - Register command
README.md                                                               # Modify - Add command entry
docs/full-hierarchy-copy.md                                             # New - Documentation
```

### Implementation

> **TDD Note**: Write test files first (§4.7 report tests, §4.8 prompt tests),
> confirm all tests fail, then implement §4.1–§4.6 and §4.9 to make them pass.

#### 4.1: Create Duplicate Strategy Prompt

**File**:
`src/commands/full-hierarchy-copy/prompts/prompt-for-duplicate-strategy.ts`

```typescript
import { select } from '@inquirer/prompts';
import type { DuplicateStrategy } from '~/services/actions/duplicate-handler';

/**
 * Prompts the user to select how duplicate content items should be handled
 * when they already exist in the target repository.
 */
export async function promptForDuplicateStrategy(): Promise<DuplicateStrategy> {
  const strategy = await select<DuplicateStrategy>({
    message: 'How should duplicate items be handled?',
    choices: [
      {
        name: 'Skip existing — do not modify, use existing target item for linking',
        value: 'skip',
      },
      {
        name: 'Update existing — overwrite target item body with source item body',
        value: 'update',
      },
      {
        name: 'Rename duplicates — create new item with numeric suffix (e.g., "My Item (1)")',
        value: 'rename',
      },
    ],
    default: 'skip',
  });

  return strategy;
}
```

#### 4.2: Prompt Barrel Export

**File**: `src/commands/full-hierarchy-copy/prompts/index.ts`

```typescript
export { promptForDuplicateStrategy } from './prompt-for-duplicate-strategy';
```

#### 4.3: Create Report Generator

**File**: `src/commands/full-hierarchy-copy/report.ts`

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type { FullHierarchyCopyResult } from '~/services/actions/full-hierarchy-copy';
import type { DuplicateStrategy } from '~/services/actions/duplicate-handler';

/**
 * Generates a Markdown report for the full hierarchy copy operation
 * and saves it to the reports/ directory.
 *
 * @param result - The operation result
 * @param context - Additional context for the report header
 */
export function generateFullHierarchyCopyReport(
  result: FullHierarchyCopyResult,
  context: ReportContext
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `full-hierarchy-copy-${timestamp}.md`;
  const reportPath = path.join('reports', filename);

  const content = buildReportContent(result, context);

  // Ensure reports directory exists
  if (!fs.existsSync('reports')) {
    fs.mkdirSync('reports', { recursive: true });
  }

  fs.writeFileSync(reportPath, content, 'utf-8');
  console.log(`\n📄 Report saved: ${reportPath}`);

  return reportPath;
}

function buildReportContent(
  result: FullHierarchyCopyResult,
  context: ReportContext
): string {
  const lines: string[] = [];

  lines.push(`# Full Hierarchy Copy Report`);
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Operation Summary');
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Source Hub | ${context.sourceHubName} |`);
  lines.push(`| Target Hub | ${context.targetHubName} |`);
  lines.push(`| Source Repository | ${context.sourceRepositoryName} |`);
  lines.push(`| Target Repository | ${context.targetRepositoryName} |`);
  lines.push(`| Duplicate Strategy | ${context.duplicateStrategy} |`);
  lines.push(`| Target Locale | ${context.targetLocale || 'Keep source'} |`);
  lines.push(`| Duration | ${(result.duration / 1000).toFixed(1)}s |`);
  lines.push(`| Items Created/Updated | ${result.itemsCreated.length} |`);
  lines.push(`| Items Skipped | ${result.itemsSkipped.length} |`);
  lines.push(`| Items Failed | ${result.itemsFailed.length} |`);
  lines.push(`| Items Published | ${result.itemsPublished.length} |`);
  lines.push('');

  // Validation
  if (result.validationResult) {
    lines.push('## Validation');
    lines.push('');
    if (result.validationResult.valid) {
      lines.push(
        `✅ All ${result.validationResult.schemasChecked} schemas validated successfully.`
      );
    } else {
      lines.push(
        `❌ Validation failed with ${result.validationResult.errors.length} errors:`
      );
      lines.push('');
      for (const error of result.validationResult.errors) {
        lines.push(`- **[${error.type}]** ${error.message}`);
      }
    }
    lines.push('');
  }

  // Created items
  if (result.itemsCreated.length > 0) {
    lines.push('## Items Created/Updated');
    lines.push('');
    lines.push('| Source ID | Target ID | Label | Action |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of result.itemsCreated) {
      lines.push(
        `| ${item.sourceId} | ${item.targetId} | ${item.label} | ${item.action} |`
      );
    }
    lines.push('');
  }

  // Skipped items
  if (result.itemsSkipped.length > 0) {
    lines.push('## Items Skipped');
    lines.push('');
    lines.push('| Source ID | Target ID | Label | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of result.itemsSkipped) {
      lines.push(
        `| ${item.sourceId} | ${item.targetId} | ${item.label} | ${item.reason} |`
      );
    }
    lines.push('');
  }

  // Failed items
  if (result.itemsFailed.length > 0) {
    lines.push('## Items Failed');
    lines.push('');
    lines.push('| Source ID | Label | Error |');
    lines.push('| --- | --- | --- |');
    for (const item of result.itemsFailed) {
      lines.push(`| ${item.sourceId} | ${item.label} | ${item.error} |`);
    }
    lines.push('');
  }

  // Folder mappings
  if (result.folderMappings.size > 0) {
    lines.push('## Folder Mappings');
    lines.push('');
    lines.push('| Source Folder ID | Target Folder ID |');
    lines.push('| --- | --- |');
    for (const [source, target] of result.folderMappings) {
      lines.push(`| ${source || '(repository root)'} | ${target} |`);
    }
    lines.push('');
  }

  // Discovery warnings
  if (result.discoveryWarnings.length > 0) {
    lines.push('## Discovery Warnings');
    lines.push('');
    for (const warning of result.discoveryWarnings) {
      lines.push(
        `- **[${warning.type}]** Item "${warning.sourceItemLabel}" (${warning.sourceItemId}): ${warning.message}`
      );
    }
    lines.push('');
  }

  // Published items
  if (result.itemsPublished.length > 0) {
    lines.push('## Published Items');
    lines.push('');
    lines.push('| Source ID | Target ID |');
    lines.push('| --- | --- |');
    for (const item of result.itemsPublished) {
      lines.push(`| ${item.sourceId} | ${item.targetId} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Types ---

export type ReportContext = {
  duplicateStrategy: DuplicateStrategy;
  sourceHubName: string;
  sourceRepositoryName: string;
  targetHubName: string;
  targetLocale?: string | null;
  targetRepositoryName: string;
};
```

#### 4.4: Create the Main Command

**File**: `src/commands/full-hierarchy-copy/full-hierarchy-copy.ts`

```typescript
import { getHubConfigs } from '~/app-config';
import { promptForConfirmation, promptForDryRun } from '~/prompts';
import { executeFullHierarchyCopy } from '~/services/actions/full-hierarchy-copy';
import { findAllDescendants } from '~/utils/folder-tree';
import {
  selectSourceLocation,
  selectTargetLocation,
} from '../shared/location-selection';
import {
  promptForRecreationFilters,
  promptForItemsToRecreate,
  promptForTargetLocale,
} from '../recreate-content-items/prompts';
import { applyFilters } from '../recreate-content-items/utils';
import { promptForDuplicateStrategy } from './prompts';
import { generateFullHierarchyCopyReport } from './report';

/**
 * Full Hierarchy Copy command — copies hierarchy trees including all embedded
 * content items (Content Links, Content References, Inline Content Links)
 * between Amplience hubs.
 *
 * Follows the recreate-content-items user flow:
 * Source hub → items → target hub → locale → duplicate strategy → validate → confirm → execute → report
 */
export async function runFullHierarchyCopy(): Promise<void> {
  console.log('\n=== Full Hierarchy Copy (with Embedded Content) ===\n');

  try {
    const hubs = getHubConfigs();

    // Step 1: Source Selection
    console.log('📁 Select source location:');
    const source = await selectSourceLocation(
      hubs,
      'Select source folder (or repository root):',
      true
    );

    // Step 2: Filter and Select Items
    console.log('\n🔍 Configure content item filters:');
    const filters = await promptForRecreationFilters();

    console.log('\n📋 Fetching content items...');
    const allItems = await source.service.getAllContentItems(
      source.repository.id,
      () => {},
      source.folder ? { folderId: source.folder.id } : undefined
    );

    const filteredItems = applyFilters(allItems, filters);

    if (filteredItems.length === 0) {
      console.log('❌ No content items found matching your criteria.');
      return;
    }

    const selectedItems = await promptForItemsToRecreate(filteredItems);

    if (selectedItems.length === 0) {
      console.log('ℹ️  No items selected. Operation cancelled.');
      return;
    }

    // Step 3: Discover hierarchy children
    console.log('\n🌳 Discovering hierarchy children...');
    const selectedDetails: Amplience.ContentItemWithDetails[] = [];
    for (const item of selectedItems) {
      const details = await source.service.getContentItemWithDetails(item.id);
      if (details) selectedDetails.push(details);
    }

    const hierarchyRoots = selectedDetails.filter(item => item.hierarchy?.root);
    let allItemIds = selectedItems.map(item => item.id);

    if (hierarchyRoots.length > 0) {
      console.log(
        `  🌲 Found ${hierarchyRoots.length} hierarchy roots, discovering children...`
      );
      const repoItems = await source.service.getAllContentItems(
        source.repository.id,
        () => {},
        { size: 100 }
      );

      const descendants = new Set<string>();
      for (const root of hierarchyRoots) {
        const rootDescendants = findAllDescendants(root.id, repoItems);
        rootDescendants.forEach(id => descendants.add(id));
      }

      allItemIds = [...new Set([...allItemIds, ...descendants])];
      console.log(
        `  📊 Total items (including hierarchy children): ${allItemIds.length}`
      );
    }

    // Step 4: Target Selection
    console.log('\n🎯 Select target location:');
    const target = await selectTargetLocation(
      hubs,
      'Select target folder (optional):',
      true
    );

    // Step 5: Target Locale Selection
    console.log('\n🌐 Select target locale:');
    const targetLocale = await promptForTargetLocale(
      target.service,
      target.repository.id,
      selectedItems
    );

    // Step 6: Duplicate Strategy
    console.log('\n🔄 Configure duplicate handling:');
    const duplicateStrategy = await promptForDuplicateStrategy();

    // Step 6b: Dry Run Mode
    const isDryRun = await promptForDryRun();
    if (isDryRun) {
      console.log('🔍 Running in DRY-RUN mode - no changes will be made\n');
    }

    // Step 7: Confirmation
    console.log('\n📋 Operation Summary:');
    console.log(`  Source Hub: ${source.hub.name}`);
    console.log(`  Source Repository: ${source.repository.name}`);
    console.log(`  Source Folder: ${source.folder?.name || 'Repository Root'}`);
    console.log(`  Items to process: ${allItemIds.length}`);
    console.log(`  Target Hub: ${target.hub.name}`);
    console.log(`  Target Repository: ${target.repository.name}`);
    console.log(`  Target Folder: ${target.folder?.name || 'Repository Root'}`);
    console.log(`  Target Locale: ${targetLocale || 'Keep source locale'}`);
    console.log(`  Duplicate Strategy: ${duplicateStrategy}`);
    console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log('');
    console.log(
      '  ⚠️  This operation will discover all embedded content (Content Links, Content References)'
    );
    console.log(
      '  and recreate them along with the hierarchy in the target hub.'
    );

    const confirmed = await promptForConfirmation(
      'Proceed with full hierarchy copy?'
    );

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');
      return;
    }

    // Step 8: Build folder mapping
    const folderMapping = new Map<string, string>();
    if (source.folder && target.folder) {
      folderMapping.set(source.folder.id, target.folder.id);
    }
    if (target.folder) {
      folderMapping.set('', target.folder.id);
    }

    // Step 9: Execute
    console.log('\n🚀 Starting full hierarchy copy...');

    const result = await executeFullHierarchyCopy({
      sourceService: source.service,
      targetService: target.service,
      sourceRepositoryId: source.repository.id,
      targetRepositoryId: target.repository.id,
      hierarchyItems: allItemIds,
      folderMapping,
      duplicateStrategy,
      isDryRun,
      targetLocale,
    });

    // Step 10: Generate Report
    const reportPath = generateFullHierarchyCopyReport(result, {
      sourceHubName: source.hub.name,
      targetHubName: target.hub.name,
      sourceRepositoryName: source.repository.name,
      targetRepositoryName: target.repository.name,
      duplicateStrategy,
      targetLocale,
    });

    // Final output
    if (result.validationResult && !result.validationResult.valid) {
      console.log('\n❌ Operation aborted due to validation failures.');
      console.log(`📄 See report for details: ${reportPath}`);
    } else {
      console.log('\n✅ Full hierarchy copy completed!');
      console.log(`📄 Report: ${reportPath}`);
    }
  } catch (error) {
    console.error('\n❌ Error during full hierarchy copy:', error);
    throw error;
  }
}
```

**Key Points:**

- Follows the exact `recreate-content-items` user flow (FR-10)
- Reuses existing prompts for item selection, filters, and locale (no
  duplication)
- Adds new prompt for duplicate strategy (FR-4)
- Displays comprehensive operation summary before confirmation
- Generates detailed Markdown report (FR-9)
- Dry-run mode via `promptForDryRun()` — shows validation result with no changes
  applied (`tech-stack.md` §4.6)

#### 4.5: Command Barrel Export

**File**: `src/commands/full-hierarchy-copy/index.ts`

```typescript
export { runFullHierarchyCopy } from './full-hierarchy-copy';
```

#### 4.6: Register Command in Application

**File**: `src/commands/index.ts` — add export:

```typescript
export * from './full-hierarchy-copy';
```

**File**: `src/index.ts` — add import and switch case:

```typescript
// Import
import { runFullHierarchyCopy } from './commands/full-hierarchy-copy';

// Switch case
case 'full-hierarchy-copy':
  await runFullHierarchyCopy();
  break;
```

The command must also be added to the command selection prompt (the Inquirer.js
`select()` call in `src/index.ts`).

**File**: `README.md` — add an entry for `full-hierarchy-copy` to the commands
list with a brief description and a link to `docs/full-hierarchy-copy.md`.

#### 4.7: Report Generator Tests

**File**: `src/commands/full-hierarchy-copy/report.test.ts`

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { generateFullHierarchyCopyReport } from './report';
import type { FullHierarchyCopyResult } from '~/services/actions/full-hierarchy-copy';

vi.mock('node:fs');

describe('generateFullHierarchyCopyReport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate report with all sections', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    const result: FullHierarchyCopyResult = {
      itemsCreated: [
        { sourceId: 's1', targetId: 't1', label: 'Item 1', action: 'created' },
      ],
      itemsSkipped: [
        {
          sourceId: 's2',
          targetId: 't2',
          label: 'Item 2',
          reason: 'duplicate-skipped',
        },
      ],
      itemsFailed: [
        { sourceId: 's3', label: 'Item 3', error: 'Content type missing' },
      ],
      itemsPublished: [{ sourceId: 's1', targetId: 't1' }],
      folderMappings: new Map([['folder-1', 'folder-2']]),
      discoveryWarnings: [
        {
          type: 'dangling-reference',
          sourceItemId: 's1',
          sourceItemLabel: 'Item 1',
          referencedId: 'deleted-id',
          message: 'Referenced item not found',
        },
      ],
      validationResult: { valid: true, errors: [], schemasChecked: 3 },
      duration: 5000,
    };

    const reportPath = generateFullHierarchyCopyReport(result, {
      sourceHubName: 'DEV',
      targetHubName: 'PROD',
      sourceRepositoryName: 'Content',
      targetRepositoryName: 'Content',
      duplicateStrategy: 'skip',
      targetLocale: 'en-GB',
    });

    expect(reportPath).toMatch(/reports\/full-hierarchy-copy-.*\.md/);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const writtenContent = vi.mocked(fs.writeFileSync).mock
      .calls[0][1] as string;
    expect(writtenContent).toContain('Full Hierarchy Copy Report');
    expect(writtenContent).toContain('DEV');
    expect(writtenContent).toContain('Items Created/Updated');
    expect(writtenContent).toContain('Items Skipped');
    expect(writtenContent).toContain('Items Failed');
    expect(writtenContent).toContain('Discovery Warnings');
  });
});
```

#### 4.8: Duplicate Strategy Prompt Tests

**File**:
`src/commands/full-hierarchy-copy/prompts/prompt-for-duplicate-strategy.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

import { select } from '@inquirer/prompts';
import { promptForDuplicateStrategy } from './prompt-for-duplicate-strategy';

describe('promptForDuplicateStrategy', () => {
  it('should return selected strategy', async () => {
    vi.mocked(select).mockResolvedValue('update');

    const result = await promptForDuplicateStrategy();
    expect(result).toBe('update');
  });

  it('should present three strategy options', async () => {
    vi.mocked(select).mockResolvedValue('skip');

    await promptForDuplicateStrategy();

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'skip' }),
          expect.objectContaining({ value: 'update' }),
          expect.objectContaining({ value: 'rename' }),
        ]),
      })
    );
  });
});
```

#### 4.9: Documentation

**File**: `docs/full-hierarchy-copy.md`

```markdown
# Full Hierarchy Copy

Copy entire hierarchy trees including all embedded content items (Content Links,
Content References, Inline Content Links) between Amplience hubs, preserving
folder structure and content relationships.

## Overview

This command extends the standard content recreation by automatically
discovering and copying all embedded content referenced within hierarchy items.
It replaces manual re-linking of content dependencies when copying between hubs.

## Usage

1. Run the CLI application with `npm start`
2. Select "Full Hierarchy Copy" from the command menu
3. Follow the interactive prompts

## Workflow

1. **Select source** — Choose source hub, repository, and folder
2. **Filter items** — Apply schema, status, and publishing filters
3. **Select items** — Choose which hierarchy root items to copy
4. **Select target** — Choose target hub, repository, and folder
5. **Select locale** — Choose target locale for all items
6. **Choose duplicate strategy** — Skip, update, or rename duplicates
7. **Validation** — Automatic schema/content type compatibility check
8. **Confirmation** — Review operation summary
9. **Execution** — Copy with progress tracking
10. **Report** — Detailed Markdown report generated

## Duplicate Handling Strategies

| Strategy              | Behavior                                  |
| --------------------- | ----------------------------------------- |
| **Skip existing**     | Use existing target item's ID for linking |
| **Update existing**   | Overwrite target item's body with source  |
| **Rename duplicates** | Create new item with suffix: "Item (1)"   |

## Pre-Operation Validation

Before copying begins, the tool validates:

- All content-type schemas exist in both hubs (not archived)
- All content types exist in both hubs (not archived)
- Schema bodies are identical (deep equality after normalization)

The operation aborts if validation fails.

## Embedded Content Types

| Type              | Detected By                                    | Action                   |
| ----------------- | ---------------------------------------------- | ------------------------ |
| Content Link      | `_meta.deliveryId` in body                     | Copied and re-linked     |
| Content Reference | `_meta.schema = content-reference`, `id` field | Copied and re-linked     |
| Inline Content    | `_meta.schema` only (no id/deliveryId)         | Skipped (part of parent) |

## Reports

Reports are saved to `reports/full-hierarchy-copy-{timestamp}.md` with:

- Operation summary and timing
- Validation results
- Items created, skipped, and failed
- Folder mappings
- Discovery warnings
- Published items list
```

### Deliverables

- Complete user-facing command following recreate-content-items flow (FR-10)
- Duplicate strategy prompt with three options (FR-4)
- Detailed Markdown report generation (FR-9)
- Command registered in application menu and switch statement
- User documentation in `docs/`
- Dry-run mode via `promptForDryRun()` for safe preview before live execution
- Full test coverage for prompts and report generator
- README.md updated with command entry

### Dependencies

- Phase 1 complete (embedded content discovery)
- Phase 2 complete (validation and duplicate handling)
- Phase 3 complete (core copy engine)

---

## Notes

### Integration Points

- **AmplienceService** (`src/services/amplience-service.ts`): All API calls use
  existing methods — no new API endpoints needed
- **HierarchyService** (`src/services/hierarchy-service.ts`):
  `buildHierarchyTreeFromItems()` pattern reused for tree traversal
- **ContentTypeService** (`src/services/content-type-service.ts`):
  `validateSchemas()` pattern extended with deep body comparison
- **Folder utilities** (`src/utils/folder-tree.ts`): `findAllDescendants()`
  reused for hierarchy child discovery
- **Location selection** (`src/commands/shared/location-selection.ts`):
  `selectSourceLocation()` and `selectTargetLocation()` reused as-is
- **Progress bars** (`src/utils/create-progress-bar.ts`): Reused for execution
  phase progress
- **Existing prompts**: Reuses `promptForRecreationFilters`,
  `promptForItemsToRecreate`, `promptForTargetLocale` from
  recreate-content-items

### Risk Considerations

- **API rate limiting**: Deep hierarchies with many embedded items may hit
  Amplience API rate limits. The exponential backoff helps, but very large
  operations may need throttling.
- **Content Link detection**: The body-scanning approach relies on
  `_meta.deliveryId` and `_meta.schema` patterns. Unusual schema configurations
  may not be detected.
- **Folder name collisions**: Folder mirroring uses name-based matching. If
  multiple source folders have the same name at different levels, flattened
  matching may create incorrect mappings. Phase 3 implementation should be
  enhanced with path-based matching if this becomes an issue.

### Coding Standards References

- **TypeScript strict mode**: All new code uses explicit types, no `any` (see
  `tech-stack.md`)
- **Kebab-case file naming**: All files follow `kebab-case.ts` convention (see
  `CLAUDE.md`)
- **Named exports only**: No default exports (see `coding-rules/index.md`)
- **Co-located tests**: All test files placed next to source files as
  `*.test.ts` (see `coding-rules/testing/index.md`)
- **One file, one function**: Actions and utilities follow single-responsibility
  per file (see `coding-rules/index.md`)
- **Barrel exports**: All directories use `index.ts` for clean imports (see
  `CLAUDE.md`)
- **Command-Action pattern**: Command handles UI/prompts, action contains
  reusable business logic (see `tech-stack.md` §4)
- **Dry-run support**: Both command and action support dry-run mode per
  `tech-stack.md` §4.6 — use `promptForDryRun()` in command, `isDryRun` option
  in action

### FR → Phase Traceability

| Requirement                                | Phase   | Implementation                                      |
| ------------------------------------------ | ------- | --------------------------------------------------- |
| FR-1: Recursive embedded content discovery | Phase 1 | `discoverEmbeddedContent()`                         |
| FR-2: Circular reference detection         | Phase 1 | `visited` Set in discovery engine                   |
| FR-3: Pre-operation validation             | Phase 2 | `validateHubCompatibility()`                        |
| FR-4: Duplicate handling strategy          | Phase 2 | `resolveDuplicate()` + prompt                       |
| FR-5: Folder structure mirroring           | Phase 3 | `mirrorFolderStructure()`                           |
| FR-6: Dependency-ordered creation          | Phase 3 | `topologicalSort()` + `replaceReferenceIdsInBody()` |
| FR-7: Retry with exponential backoff       | Phase 3 | `retryOperation()`                                  |
| FR-8: Two-phase progress                   | Phase 3 | Spinner (discovery) + progress bar (creation)       |
| FR-9: Operation report                     | Phase 4 | `generateFullHierarchyCopyReport()`                 |
| FR-10: User flow (recreate-content-items)  | Phase 4 | `runFullHierarchyCopy()`                            |
| FR-11: Publishing mirroring                | Phase 3 | `shouldPublishItem()` + `publishWithRetry()`        |
| FR-12: Locale handling                     | Phase 4 | `promptForTargetLocale` reuse                       |
| FR-13: Delivery key copying                | Phase 3 | `assignDeliveryKey()` in creation loop              |
