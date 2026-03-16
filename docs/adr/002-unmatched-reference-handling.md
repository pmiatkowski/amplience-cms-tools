# ADR-002: Unmatched Reference Handling

## Context
When a content item from the source hub references another item that doesn't exist in the target hub, the system must decide how to handle this situation. The previous behavior was to log a warning and require manual intervention, which led to broken references and `403 FORBIDDEN` errors.

Options considered:
1. Skip items with unmatched references (partial sync)
2. Create placeholder items for references
3. Recursively discover and create missing referenced items
4. Fail the entire operation

## Decision
**Recursive Discovery & Automatic Creation**

When a referenced item does not exist in the target hub:

1. **Recursive Discovery**: The system discovers all referenced items from the source hub recursively
2. **Automatic Creation**: Missing items are created from scratch in the target hub to obtain new IDs
3. **ID Mapping Registry**: A `sourceToTargetIdMap` is built during creation
4. **Reference Binding**: References are bound in subsequent phases using the mapped IDs

```typescript
// Core mechanism
for (const item of discoveredItems) {
  const created = await targetService.createContentItem(repoId, transformedBody);
  registry.sourceToTargetIdMap.set(item.id, created.id);
}
```

This is the core mechanism: **references drive item creation, not just matching**.

## Consequences

### Positive
- Complete, working copies without manual intervention
- Preserves referential integrity automatically
- Idempotent behavior (re-running produces same result)

### Negative
- May create items user didn't intend to copy
- Requires recursive API calls (performance impact)
- External references (outside repository) still need manual handling

### Constraints
- Discovery is limited to the user-selected source repository
- References to items outside the repository are flagged as "external references"
- Pre-flight summary shows which items will be created

## Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| Skip unmatched | Simple, fast | Broken references, 403 errors | Defeats purpose of sync |
| Create placeholders | Preserves structure | Placeholders have no content | Incomplete solution |
| Fail operation | Safe | Blocks valid partial syncs | Too restrictive |
| User mapping | Full control | Manual effort | Not scalable for bulk operations |

## Date
2026-03-15
