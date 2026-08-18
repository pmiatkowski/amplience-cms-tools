# Content Reference Resolution

## Overview

Content Reference Resolution is an automatic feature that handles
`content-reference` and `content-link` properties when synchronizing content
items between Amplience hubs. This feature ensures that references to other
content items are correctly remapped from source hub IDs to target hub IDs,
preventing `403 FORBIDDEN` errors and broken references.

## Problem Solved

When content items are copied between hubs:

1. Content references contain source hub item IDs
2. These IDs don't exist in the target hub
3. API returns `403 FORBIDDEN` when creating items with invalid references
4. Previously, users had to manually update references after creation

**Example of the problem:**

```json
{
  "component": {
    "id": "a1b2c3d4-source-hub-id", // Invalid in target hub
    "contentType": "https://schema.example.com/image",
    "_meta": {
      "schema": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-link"
    }
  }
}
```

## How It Works

### Automatic Activation

Reference resolution is **always enabled** for cross-hub content operations. No
opt-in flag is required. This ensures correctness by default.

### Resolution Flow

```text
┌─────────────────────────────────────────────────────────────┐
│  1. DISCOVER REFERENCES                                      │
│     • Scan item bodies recursively                           │
│     • Identify content-reference and content-link schemas    │
│     • Build reference registry                               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  2. MATCH TO TARGET HUB                                      │
│     • Priority: Delivery Key > Schema + Label                │
│     • Track matched and unmatched items                      │
│     • Flag external references (outside repository)          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  3. BUILD DEPENDENCY GRAPH                                   │
│     • Create directed graph from references                  │
│     • Detect circular references                             │
│     • Topological sort for creation order                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VALIDATE CONTENT TYPE ASSIGNMENTS                        │
│     • Collect every item that may be created                 │
│     • Compare schemas with target repository assignments    │
│     • Stop before confirmation when validation is blocked   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CREATE ITEMS (Two-Phase for Circular)                    │
│     • Create all candidates in dependency order              │
│     • Add each created ID to the source→target mapping       │
│     • Nullify then update references only for circular items │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  6. PRESERVE PUBLISHING STATUS                               │
│     • Track source item publishing state                     │
│     • Publish recreated items if source was published        │
└─────────────────────────────────────────────────────────────┘
```

### Reference Types Supported

| Type                  | Schema URI                            | Auto-publishes Children |
| --------------------- | ------------------------------------- | ----------------------- |
| **Content Link**      | `core#/definitions/content-link`      | Yes                     |
| **Content Reference** | `core#/definitions/content-reference` | No                      |

Both types are handled identically during reference resolution.

## Matching Strategy

Items are matched using priority order:

1. **Delivery Key (exact match)** - Highest confidence
   - Delivery keys are unique per hub
   - Exact match provides deterministic resolution

2. **Schema ID + Label (fallback)** - When no delivery key exists
   - Schema must match exactly
   - Label matching is case-sensitive

### Matching Example

```typescript
// Source item in DEV hub
{
  id: "abc-123",
  label: "Hero Banner",
  body: {
    _meta: { deliveryKey: "hero-banner", schema: "https://..." },
    image: { id: "ref-456", ... }  // Reference to resolve
  }
}

// Target item in PROD hub (matched by delivery key)
{
  id: "xyz-789",  // Different ID
  label: "Hero Banner",
  body: {
    _meta: { deliveryKey: "hero-banner", schema: "https://..." }
  }
}

// Result: sourceToTargetIdMap.set("abc-123", "xyz-789")
```

## Circular Reference Handling

For non-circular dependencies, all creation candidates, including selected,
folder, and hierarchy items, follow the dependency graph's topological order.
Each successful creation immediately extends `sourceToTargetIdMap`, so later
item bodies are created with target-hub IDs. Unmapped external references are
nullified rather than submitted with source-hub IDs.

Circular references (A → B → A) are handled automatically using two-phase
creation:

### Phase 1: Create with Nullified References

```typescript
// Item A references Item B, Item B references Item A
// Both created with null references first
const itemA_created = await createItem({ ...bodyA, reference: null });
const itemB_created = await createItem({ ...bodyB, reference: null });

// Map IDs
sourceToTargetIdMap.set('sourceA', itemA_created.id);
sourceToTargetIdMap.set('sourceB', itemB_created.id);
```

### Phase 2: Update with Resolved References

```typescript
// Now update with correct IDs
await updateItem(itemA_created.id, { reference: itemB_created.id });
await updateItem(itemB_created.id, { reference: itemA_created.id });
```

## External References

References to items **outside the source repository** are flagged as "external
references":

- Not automatically resolved (items may not be accessible)
- Listed in pre-flight summary
- User can handle separately if needed

## Pre-Flight Summary

Before confirmation or target mutation, the recreation commands show reference
discovery results and validate repository content-type assignments. Missing
assignments are grouped by URI with affected-item counts, labels, and IDs:

```text
📊 Reference discovery summary:
  - Discovered: 15
  - Already matched references in target: 5
  - Need to create: 8
  - External references: 2
  - Circular reference groups: 1

❌ Preflight blocked the operation.
Please assign these content types to "Newsroom" before continuing:
  - https://schema.example.com/article (2 items)
    - News Article (article-1)
    - Press Release (article-2)
❌ No target changes were made.
```

If discovery is incomplete, strict mode stops before validation can claim full
coverage. Setting `contentTypeValidation.abortOnReferenceDiscoveryFailure` to
`false` in `src/config.ts` permits known-item-only validation and nullifies
unresolved references. Target matching or dependency-planning failures, missing
assignments, unknown schemas, and assignment lookup errors still block
execution.

Delivery-key validation starts with Amplience's official
`GET /hubs/{hubId}/delivery-keys/content-item` lookup for each candidate
delivery key. This quickly identifies existing owners. If any candidate owner is
unresolved directly, preflight performs one complete fallback inventory: it
paginates all target-hub repositories returned to the configured credential,
then fetches full-body `ACTIVE` and `ARCHIVED` items separately from every
repository and compares delivery keys.

The inventory is fail-closed. A repository listing or page failure, or any
repository's `ACTIVE` or `ARCHIVED` page failure, blocks before confirmation and
target mutation. The output identifies the failed stage and repository when
available, and no partial inventory is accepted. This covers all repositories
returned to the configured credential; it does not claim visibility beyond the
credential's API ACLs.

Duplicate source keys and any owner found by direct lookup or inventory block.
The output includes the key, affected source labels and IDs, and the existing
owner's label, ID, and repository. Existing owners are never overwritten,
deleted, or silently reused. This deliberately catches content left by a partial
run before a retry can create a duplicate.

During fallback, progress is reported once per repository after both status
scans finish. A completed validation reports one final delivery-key completion;
it does not print one console line per key.

During execution, unmatched referenced items are created in dependency order.
Hierarchy roots retain their `_meta.hierarchy.root` marker, while child parent
IDs are recreated after target IDs are known. If a required referenced item
cannot be created, dependent items are not submitted with that reference set to
`null`; the operation stops and reports the original failure.

Delivery keys already applied by content creation are not assigned again. If a
fallback assignment is needed, the management API is called with `PATCH` and the
created item's current version. On retry, matched referenced items from a
partial run are checked for missing delivery keys and required publication.

## Report Output

After execution, a detailed report includes:

```markdown
## Reference Resolution Results

### Successfully Resolved (12)

| Source Item  | Source ID | Target ID | Match Type   |
| ------------ | --------- | --------- | ------------ |
| Hero Banner  | abc-123   | xyz-789   | delivery_key |
| Footer Links | def-456   | uvw-012   | schema_label |

### Circular References Resolved (2)

| Item             | Reference        | Phase                          |
| ---------------- | ---------------- | ------------------------------ |
| hero-banner      | featured-content | Created null → Updated with ID |
| featured-content | hero-banner      | Created null → Updated with ID |

### External References (2)

| Item       | Reference     | Schema | Action                 |
| ---------- | ------------- | ------ | ---------------------- |
| carousel-1 | image-asset-1 | image  | Requires manual update |
| carousel-2 | video-asset-1 | video  | Requires manual update |
```

## Commands Using This Feature

| Command                    | Integration                                 |
| -------------------------- | ------------------------------------------- |
| `recreate-content-items`   | Automatic for cross-hub recreation          |
| `copy-folder-with-content` | Automatic before folder or content creation |
| `sync-hierarchy`           | Automatic for hierarchy synchronization     |
| `bulk-sync-hierarchies`    | Automatic for bulk operations               |

## Best Practices

### 1. Use Delivery Keys

Assign delivery keys to items that are frequently referenced:

```json
{
  "_meta": {
    "deliveryKey": "shared-hero-banner",
    "schema": "https://..."
  }
}
```

This ensures reliable matching across hubs.

### 2. Review External References

Check the pre-flight summary for external references and:

- Copy referenced items to target hub first, or
- Update references manually after sync

### 3. Test with Dry-Run

Use dry-run mode to preview reference resolution:

```bash
? Run in dry-run mode? Yes
```

The dry-run report shows which references will be resolved.

### 4. Handle External Assets Separately

Asset references (images, videos) often point to different hubs:

- Copy assets first using `copy-folder-with-content`
- Then sync content items

## Troubleshooting

### "Reference not found in target"

**Cause:** Referenced item doesn't exist in target hub and couldn't be created.

**Solution:**

1. Check if the item exists in the source repository
2. Verify the item's schema exists in target hub
3. Review external references in pre-flight summary

### "Referenced item creation failed"

**Cause:** A referenced item required by another item could not be created in
the target repository.

**Solution:**

1. Resolve the first referenced-item API error shown in the output
2. Verify hierarchy roots retain the hierarchy trait and all referenced content
   types are assigned to the target repository
3. Re-run the command; dependent items are intentionally skipped until the
   required reference can be mapped

### "Content type preflight blocked the operation"

**Cause:** A required content type is not assigned to the target repository, an
item has no schema metadata, or repository assignments could not be loaded.

**Solution:**

1. Review the grouped URI and item list in the preflight output
2. Assign every listed content type to the target repository
3. Verify credentials can read repository content-type assignments
4. Re-run the command; no target changes were made by the blocked attempt

### "Delivery keys must be unique across the target hub"

**Cause:** Multiple creation candidates use the same delivery key, or an item in
any repository in the target hub already owns that key. Existing owners may be
artifacts of an earlier partial run.

**Solution:**

1. Review the source items and existing target owner printed for each key
2. Decide whether to remove the partial target content or change the source key
3. Re-run the command; the blocked attempt made no target changes

### "Delivery-key inventory failed"

**Cause:** At least one candidate owner was unresolved by direct lookup, and the
fallback could not completely list and paginate the target repositories or read
one repository's full-body `ACTIVE` or `ARCHIVED` pages. A partial inventory
cannot prove that a key is available.

**Solution:**

1. Review the failed inventory stage and repository shown in the output
2. Verify the configured credential can list every intended repository and read
   both active and archived items
3. Fix the reported API or access failure and retry; the blocked attempt made no
   target changes

### `403 Authorization required` from direct delivery-key lookup

**Cause:** In observed Amplience behavior, the direct delivery-key endpoint can
return `403 Authorization required` when it cannot resolve an owner, including
for an unused key. A possible `404` is also unresolved. Neither response by
itself proves that the configured credential is invalid.

The command therefore runs the complete fallback inventory instead of treating
the response as an immediate authorization failure or assuming the key is
available. Other direct lookup failures remain blocking.

**Solution:**

1. Let the fallback inventory complete before deciding whether the key is free
2. If inventory fails, use its stage and repository details to correct API
   access or retry the failed request
3. Treat a separately reported direct-lookup failure as blocking and resolve
   that error before retrying

### "Reference discovery failed"

**Cause:** Recursive discovery could not produce a complete list of items that
may be created.

**Solution:**

1. Resolve the reported API or source-item access error and retry
2. Keep strict mode enabled when complete validation is required
3. Use the relaxed `src/config.ts` setting only when known-item validation and
   nullified unresolved references are acceptable

### "Multiple matches found"

**Cause:** Multiple items in target have same schema and label.

The operation stops during target matching because choosing one automatically
would make reference resolution ambiguous. No target changes are made.

**Solution:**

1. Add unique delivery keys to source items
2. Rename items to have unique labels
3. Remove or disambiguate duplicate target items, then run the command again

### "Circular reference detected but not resolved"

**Cause:** Error during Phase 2 update.

**Solution:**

1. Check API credentials have update permissions
2. Review error logs for version conflicts
3. Re-run the operation (idempotent)

## Technical Implementation

The feature is implemented in `src/services/content-reference/`:

| Module                           | Purpose                               |
| -------------------------------- | ------------------------------------- |
| `types.ts`                       | Core types and interfaces             |
| `content-reference-discovery.ts` | Recursive reference scanning          |
| `content-reference-mapping.ts`   | Source→Target ID registry             |
| `content-reference-graph.ts`     | Dependency graph and topological sort |
| `content-reference-resolver.ts`  | Target hub matching                   |
| `content-reference-transform.ts` | Body transformation                   |
| `content-reference-publisher.ts` | Publishing status preservation        |
| `content-reference-report.ts`    | Report generation                     |

## Related Documentation

- [ADR-001: Content Reference Matching Strategy](./adr/001-content-reference-matching-strategy.md)
- [ADR-002: Unmatched Reference Handling](./adr/002-unmatched-reference-handling.md)
- [ADR-003: Circular Reference Handling](./adr/003-circular-reference-handling.md)
- [Recreate Content Items](./recreate-content-items.md)
- [Sync Hierarchy](./sync-hierarchy.md)
- [Bulk Sync Hierarchies](./bulk-sync-hierarchies.md)
