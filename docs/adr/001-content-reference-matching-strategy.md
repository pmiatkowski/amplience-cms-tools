# ADR-001: Content Reference Matching Strategy

## Status
Accepted

## Context
When synchronizing content items between Amplience hubs, content references (`content-reference` and `content-link` properties) contain source hub item IDs that become invalid in the target hub. We needed a strategy to match source items to their equivalent items in the target hub.

The challenge is that items may have:
- Different IDs between hubs (always the case)
- Same or different delivery keys
- Same or different labels
- Same schema IDs (required for valid reference)

## Decision
**Delivery Key Priority Matching**

Items are matched from source to target hub using the following priority order:

1. **Delivery Key (exact match)** - Highest confidence, unique per hub
2. **Schema ID + Label (fallback)** - When no delivery key match exists

```typescript
// Matching priority order
const match = targetItems.find(t => t.deliveryKey === source.deliveryKey)
  || targetItems.find(t => t.schemaId === source.schemaId && t.label === source.label);
```

## Consequences

### Positive
- Delivery keys provide deterministic, unique matching
- Fallback to schema+label handles items without delivery keys
- Predictable behavior for users who maintain consistent naming

### Negative
- Items with different labels require manual intervention
- Multiple items with same schema+label require user disambiguation
- External references (outside source repository) are flagged, not resolved

### Constraints
- Schema ID must always match for a valid reference
- References to items outside the selected repository are marked as "external"

## Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| ID-only matching | Simple | IDs always differ between hubs | Technically impossible |
| Label-only matching | Works for most cases | Labels may not be unique | Ambiguity risk |
| Fuzzy label matching | More flexible | Unpredictable results | Precision over recall |
| User-defined mapping | Full control | Manual effort per operation | Not scalable |

## Date
2026-03-15
