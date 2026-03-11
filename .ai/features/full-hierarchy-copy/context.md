# Context

## Relevant Files

### Command Being Extended

- `src/commands/recreate-content-items/recreate-content-items.ts` — Current
  implementation that copies content items and hierarchies
- `src/commands/recreate-content-items/utils.ts` — Filter utilities for content
  items
- `src/commands/recreate-content-items/prompts/` — User prompts for item
  selection and filters

### Related Commands That Need This Enhancement

- `src/commands/bulk-sync-hierarchies/bulk-sync-hierarchies.ts` — Synchronizes
  multiple hierarchies; needs embedded content support
- `src/commands/copy-folder-with-content/copy-folder-with-content.ts` — Copies
  folders with items; should handle embedded content

### Core Services & Actions

- `src/services/actions/recreate-content-items.ts` — Main action for recreating
  content items (lines 420-428 already note content links but don't process
  them)
- `src/services/amplience-service.ts` — Core API client for Amplience CMS
  operations
- `src/services/hierarchy-service.ts` — Manages hierarchical content item
  relationships (has buildHierarchyTree methods with circular reference
  protection)
- `src/services/content-type-service.ts` — Validates schemas and content types
  (validateSchemas method for hub compatibility)

### Utilities with Reusable Patterns

- `src/utils/folder-tree.ts` — Recursive traversal utilities with visited set
  pattern for circular reference protection
- `src/commands/shared/location-selection.ts` — Folder mapping utilities
  (createFolderMapping)
- `src/commands/shared/content-operations.ts` — Content fetching from folders
  with hierarchy discovery

### Type Definitions

- `types/amplience.d.ts` — Amplience CMS type definitions including ContentItem,
  Body, Hierarchy, and ContentItemWithDetails

## Code Snippets

### Circular Reference Protection Pattern (from folder-tree.ts)

```typescript
export function findAllDescendants(
  rootId: string,
  allItems: Amplience.ContentItem[]
): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>();

  function findChildren(parentId: string): void {
    if (visited.has(parentId)) return; // Prevent infinite loops
    visited.add(parentId);

    for (const item of allItems) {
      if (item.hierarchy?.parentId === parentId) {
        descendants.push(item.id);
        findChildren(item.id); // Recursively find children of this child
      }
    }
  }

  findChildren(rootId);
  return descendants;
}
```

### Schema Validation Pattern (from content-type-service.ts)

```typescript
async validateSchemas(
  targetHub: AmplienceService,
  contentTypes: Amplience.ContentType[]
): Promise<{
  missingSchemas: string[];
  invalidSchemas: string[];
  validContentTypes: Amplience.ContentType[];
}> {
  const targetSchemas = await targetHub.getAllSchemas();
  const targetSchemaMap = new Map(targetSchemas.map(schema => [schema.schemaId, schema]));

  const missingSchemas: string[] = [];
  const invalidSchemas: string[] = [];
  const validContentTypes: Amplience.ContentType[] = [];

  for (const contentType of contentTypes) {
    const schema = targetSchemaMap.get(contentType.contentTypeUri);
    if (!schema) {
      missingSchemas.push(contentType.contentTypeUri);
      continue;
    }

    const validationResult = this.validateContentTypeSchema(schema);
    if (validationResult.isValid) {
      validContentTypes.push(contentType);
    } else {
      invalidSchemas.push(contentType.contentTypeUri);
    }
  }

  return { missingSchemas, invalidSchemas, validContentTypes };
}
```

### Hierarchy Tree Building (from hierarchy-service.ts)

```typescript
public buildHierarchyTreeFromItems(
  rootItemId: string,
  allItems: Amplience.ContentItem[]
): Amplience.HierarchyNode {
  const childrenMap = new Map<string, Amplience.ContentItem[]>();

  allItems.forEach(item => {
    if (item.hierarchy && !item.hierarchy.root && item.hierarchy.parentId) {
      const parentId = item.hierarchy.parentId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(item);
    }
  });

  const descendants: Amplience.ContentItem[] = [];
  const visitedIds = new Set<string>();

  const collectDescendants = (parentId: string): void => {
    const children = childrenMap.get(parentId) || [];
    children.forEach(child => {
      if (!visitedIds.has(child.id)) {
        visitedIds.add(child.id);
        descendants.push(child);
        collectDescendants(child.id); // Recursively collect children
      }
    });
  };

  collectDescendants(rootItemId);
  return finalRootNode;
}
```

### Folder Mapping Pattern (from location-selection.ts)

```typescript
export function createFolderMapping(
  sourceFolder: Amplience.Folder | null,
  targetFolder: Amplience.Folder | null
): Map<string, string> {
  const folderMapping = new Map<string, string>();
  if (sourceFolder && targetFolder) {
    folderMapping.set(sourceFolder.id, targetFolder.id);
  }
  // Also map empty string (repository root) to target folder or repository root
  if (targetFolder) {
    folderMapping.set('', targetFolder.id);
  }
  return folderMapping;
}
```

## Business Logic

### Core Requirements

- **Recursive hierarchy copy**: Copy entire hierarchy trees including all child
  nodes
- **Embedded content support**: Handle three types of embedded content:
  - Content Links (references to other content items)
  - Content References (similar to content links)
  - Inline Content Links (embedded content)
- **Nested embeddings**: Embedded content may itself contain more embedded
  content (arrays or nested structures)
- **Circular reference detection**: Prevent infinite loops when content
  references form cycles
- **Folder structure preservation**: Embedded content items placed in parallel
  folder structure in target repository (source folder path → target folder
  path)

### Pre-Operation Validation

- **Schema validation**: All schemas must exist in both source and target hubs
- **Content type validation**: All content types must exist in both hubs
- **Fail-fast**: Abort operation if validation checks fail
- **Reuse existing validation**: Use `ContentTypeService.validateSchemas()`
  method

### Current Limitations (to be addressed)

- Lines 420-428 in `recreate-content-items.ts` note content links but log them
  for manual handling
- No recursive deep-copying of embedded content
- No circular reference tracking for embedded content

## Technical Constraints

### Stack

- **TypeScript 5+** with strict mode enabled
- **Node.js v22+**
- **Vitest** for testing

### Amplience CMS API Patterns

- Content items have `body` property containing the actual content JSON
- Embedded content represented in `body` as:
  - `contentLink` objects with `_meta.schema` pointing to content type
  - Arrays of content links/references
  - Nested structures
- Hierarchy relationships via `hierarchy` property:
  `{ root: boolean, parentId: string | null }`
- Slots may be included in hierarchy structures (edition slot associations)

### Architectural Pattern

- **Command-Action separation**: Commands handle UI/prompts, Actions contain
  reusable business logic
- **AmplienceService for all API calls**: Never use direct fetch calls
- **Progress bars** for long-running operations
- **Report generation** for all operations (Markdown format in `reports/`)

### Known Code Locations

```typescript
// Current content link handling (incomplete):
// src/services/actions/recreate-content-items.ts:420-428
if (bodyAny.component && Array.isArray(bodyAny.component)) {
  console.log(
    `  🔗 Found ${bodyAny.component.length} content links - these will need to be updated manually after creation`
  );
  // For now, we'll keep the component array but note that the IDs won't be valid in target hub
}
```

### Existing Reusable Patterns

#### 1. Circular Reference Protection

- **Location**: `src/utils/folder-tree.ts` (findAllDescendants)
- **Pattern**: Use `Set<string>` to track visited IDs, check before processing
- **Application**: Can be adapted for embedded content traversal

#### 2. Schema/Content Type Validation

- **Location**: `src/services/content-type-service.ts`
- **Methods**: `validateSchemas()`, `getMissingContentTypes()`
- **Returns**: Separated lists of missing/invalid/valid items
- **Application**: Run before copying to ensure compatibility

#### 3. Hierarchy Tree Building

- **Location**: `src/services/hierarchy-service.ts`
- **Methods**: `buildHierarchyTreeFromItems()`, `buildHierarchyTree()`
- **Pattern**: Uses parent-child map + visited set for traversal
- **Application**: Similar structure needed for embedded content dependency
  graph

#### 4. Folder Mapping

- **Location**: `src/commands/shared/location-selection.ts`
- **Pattern**: `Map<sourceId, targetId>` for folder relationships
- **Application**: Extend to track embedded content item mappings

#### 5. Recursive Tree Traversal

- **Location**: `src/utils/folder-tree.ts` (countTotalFolders,
  getAllSubfolderIds)
- **Pattern**: Nested function with recursive calls
- **Application**: Template for deep body traversal

## Amplience API Specifications

### Content Relationship Types

Based on Amplience documentation, there are three distinct ways to embed
content:

#### 1. Content Link

**Schema Definition:**

```json
{
  "allOf": [
    {
      "$ref": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-link"
    },
    {
      "properties": {
        "contentType": {
          "enum": ["https://schema-examples.com/media"]
        }
      }
    }
  ]
}
```

**Runtime Behavior:**

- When parent item is published, ALL linked content items are published too
- When retrieving content, the ENTIRE linked content item is returned inline
- Used for tightly coupled content relationships

**Example in Content Body:**

```json
{
  "content_Link": {
    "_meta": {
      "name": "Media example",
      "schema": "https://schema-examples.com/media",
      "deliveryId": "93e6ba69-921b-4bf2-93dd-f105a05ea018"
    },
    "image": {
      /* full image object */
    },
    "video": {
      /* full video object */
    }
  }
}
```

#### 2. Content Reference

**Schema Definition:**

```json
{
  "allOf": [
    {
      "$ref": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
    },
    {
      "properties": {
        "contentType": {
          "enum": ["https://schema-examples.com/media"]
        }
      }
    }
  ]
}
```

**Runtime Behavior:**

- Publishing parent does NOT publish referenced content (must publish
  separately)
- When retrieving content, only the ID is returned (lazy loading pattern)
- Used for loosely coupled relationships (e.g., "related blog posts")

**Example in Content Body:**

```json
{
  "content_Reference": {
    "_meta": {
      "schema": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
    },
    "contentType": "https://schema-examples.com/media",
    "id": "9609d7f5-4b5a-4e10-a85a-975494c03892"
  }
}
```

#### 3. Inline Content (Mixin)

**Schema Definition:**

```json
{
  "inline_Content": {
    "type": "object",
    "allOf": [
      {
        "$ref": "https://schema-examples.com/media"
      }
    ]
  }
}
```

**Runtime Behavior:**

- Content is NOT managed separately (no separate content item in CMS)
- All content embedded directly in parent's body
- Cannot be shared with other content items
- No separate publishing workflow

**Example in Content Body:**

```json
{
  "inline_Content": {
    "image": {
      /* image properties */
    },
    "video": {
      /* video properties */
    },
    "videotitle": "Sunglasses promo",
    "altimagetext": "Woman in field",
    "_meta": {
      "schema": "https://schema-examples.com/media"
    }
  }
}
```

### Detection Strategy

To identify embedded content items, the implementation should:

1. **Check Schema Definitions** (at schema level):
   - Look for `$ref` patterns:
     - `http://bigcontent.io/cms/schema/v1/core#/definitions/content-link`
     - `http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference`
   - Parse schema to identify which properties are content links/references

2. **Scan Content Body** (at runtime):
   - Traverse JSON recursively looking for objects with `_meta.schema` property
   - Check if `_meta.schema` matches:
     - `content-link` definition URL
     - `content-reference` definition URL
     - Any registered content type schema ID
   - Handle arrays of embedded content

3. **Combined Approach** (recommended):
   - Parse schemas first to know which properties are relationships
   - Scan body for nested `_meta` objects to catch dynamic content
   - Track both schema-defined and runtime-discovered embedded content

### Content Body Structure

All content items have this structure:

```json
{
  "id": "content-item-uuid",
  "label": "Human readable label",
  "body": {
    "_meta": {
      "name": "Item name",
      "schema": "https://schema-id-of-this-item",
      "deliveryId": "delivery-key"
    },
    // ... other properties defined by schema
    "someContentLink": {
      "_meta": {
        "schema": "https://linked-content-schema"
        // ... nested content item data
      }
    }
  },
  "hierarchy": {
    "root": false,
    "parentId": "parent-uuid-or-null"
  },
  "folderId": "folder-uuid"
}
```

### Key Differences Summary

| Feature           | Content Link | Content Reference | Inline Content              |
| ----------------- | ------------ | ----------------- | --------------------------- |
| **Separate Item** | Yes          | Yes               | No                          |
| **Publishing**    | Cascades     | Independent       | Cascades with parent        |
| **Retrieval**     | Full object  | ID only           | N/A (embedded)              |
| **Shareable**     | Yes          | Yes               | No                          |
| **Must Copy**     | Yes          | Yes               | No (already in parent body) |

### Implementation Impact

**For this feature:**

- **Content Link**: Must be copied as separate items, IDs updated in parent body
- **Content Reference**: Must be copied as separate items, IDs updated in parent
  body
- **Inline Content**: No separate copy needed (already embedded in parent body)

**Detection in code:**

- Check `body` for objects with `_meta.schema` property
- For `content-link` and `content-reference`: Extract ID, fetch original item,
  copy to target
- For inline content: Skip (already part of parent body)

## Notes

### Documentation References

- **Content Links & References**:
  https://amplience.com/developers/docs/schema-reference/schema-examples/core-concepts/combine-schemas/#content-links-and-content-references
- **Data Types Documentation**:
  https://amplience.com/developers/docs/schema-reference/data-types/
- **Slots**:
  https://amplience.com/developers/docs/dev-tools/guides-tutorials/slots/

### Implementation Considerations

- **Visited set pattern**: Adapt from `folder-tree.ts` findAllDescendants for
  embedded content circular reference detection
- **Dependency graph**: Build similar to HierarchyService's parent-child map
  before creating items
- **Deep traversal**: Recursively scan `body` object for:
  - Objects with `_meta.schema` property
  - Arrays containing content references
  - Nested objects within embedded content
- **Order of operations**:
  1. Validate all schemas/content types exist in target
  2. Discover all embedded content items (build dependency graph)
  3. Topologically sort items (leaves first, then parents)
  4. Create items in dependency order
  5. Update references to point to newly created IDs
- **Folder path mapping**: For each embedded item, determine source folder and
  map to parallel target folder path
- **Content type detection**: Check `body._meta.schema` or look for `_meta`
  property in nested objects

### Integration Points

- **bulk-sync-hierarchies**: Should automatically use new embedded content
  handling
- **copy-folder-with-content**: Already has folder structure + content copy; add
  embedded content discovery
- **Schema validation**: Leverage existing
  `ContentTypeService.validateSchemas()` method
- **Folder mapping**: Extend existing `createFolderMapping()` utility

### Testing Strategy

- Unit tests for circular reference detection (adapt from folder-tree tests)
- Unit tests for deep body traversal
- Integration tests with mock hierarchies containing embedded content
- Test cases:
  - Simple embedded content (1 level deep)
  - Nested embedded content (3+ levels)
  - Circular references (A → B → A)
  - Arrays of embedded content
  - Mixed hierarchy + embedded content
  - Embedded content in different folders
  - Embedded content with missing schemas (should fail validation)
