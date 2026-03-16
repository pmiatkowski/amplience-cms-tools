# ADR-003: Circular Reference Handling

## Context
Content items in Amplience can form circular reference chains:
- **Direct circular**: Item A references Item B, Item B references Item A
- **Self-reference**: Item A references itself
- **Long chains**: A → B → C → A

These patterns prevent simple sequential creation because:
- Item A needs B's target ID before B exists
- Item B needs A's target ID before A exists
- Standard topological sort fails on cycles

## Decision
**Two-Phase Creation**

For circular references (A → B → A) or self-references (A → A):

1. **Phase 1 (Create)**: Create all items with references nullified
   ```typescript
   const bodyWithNullRefs = nullifyReferences(item.body);
   const created = await targetService.createContentItem(repoId, bodyWithNullRefs);
   registry.sourceToTargetIdMap.set(item.id, created.id);
   ```

2. **Phase 2 (Update)**: Update items with resolved references
   ```typescript
   const transformedBody = transformReferencesInBody(item.body, registry.sourceToTargetIdMap);
   await targetService.updateContentItem(targetId, { body: transformedBody, version });
   ```

This preserves referential integrity without user intervention.

## Consequences

### Positive
- Handles all circular reference patterns automatically
- No user intervention required
- Works for any depth of circular chains
- Maintains data integrity

### Negative
- Requires two API calls per item with circular refs (create + update)
- Items briefly exist with null references between phases
- Slightly longer processing time

### Constraints
- Version number must be tracked between create and update
- Update must include latest version to avoid conflicts
- Items are created in dependency order, then updated in reverse order

## Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| Fail on circular refs | Simple detection | Blocks valid content | User-unfriendly |
| Require manual resolution | Full control | Manual effort, error-prone | Not scalable |
| Create with stub IDs | Single pass | Invalid IDs cause errors | API doesn't support |
| Skip circular items | Avoids complexity | Incomplete copies | Defeats purpose |

## Implementation Details

```typescript
// Circular detection using DFS
function detectCircularReferences(registry: ReferenceRegistry): string[][] {
  const circularGroups: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  for (const [id] of registry.entries) {
    if (!visited.has(id)) {
      detectCycle(id, visited, recursionStack, [], circularGroups, registry);
    }
  }
  return circularGroups;
}
```

## Date
2026-03-15
