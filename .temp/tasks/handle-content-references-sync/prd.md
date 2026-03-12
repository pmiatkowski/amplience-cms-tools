# PRD: handle-content-references-sync

**Status:** Clarified
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## 1. Overview

The `bulk-sync-hierarchies` and `recreate-content-items` commands currently fail when recreating content items that contain **content references** (`content-reference`) or **content links** (`content-link`) across Amplience hubs. These reference types store content item IDs that point to items in the source hub. When copied to a target hub, these IDs become invalid, causing `403 FORBIDDEN` errors and failed content item creation.

Content references can be:
- Single properties with `id` and `contentType` fields
- Arrays of references
- Nested at any level within the content item body
- Within inline content (which doesn't need remapping)
- Within hierarchical child items

The solution requires discovering all referenced content items recursively, creating a mapping registry, matching items between source and target hubs, and recreating items in the correct order with proper reference bindings.

## 2. Goals

### Primary Goals
1. Enable cross-hub content item recreation with full content reference resolution
2. Prevent `FORBIDDEN` errors caused by invalid cross-hub content references
3. Maintain referential integrity across all nested levels of content references

### Secondary Goals
1. Preserve publishing status from source to target hub
2. Support both `content-reference` and `content-link` property types
3. Handle circular reference scenarios gracefully
4. Provide clear progress feedback during reference resolution

## 3. Functional Requirements

### 3.1 Core Features

#### F1: Content Reference Discovery
- **F1.1** Recursively scan content item bodies to identify all `content-reference` and `content-link` properties
- **F1.2** Detect references by schema pattern: `http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference` and `content-link`
- **F1.3** Extract reference IDs from properties containing `{ id, contentType, _meta.schema }` structure
- **F1.4** Handle references in arrays (e.g., `listContainingContentReferences`)
- **F1.5** Skip inline content links (schema references that are embedded directly, not by ID)

#### F2: Reference Registry & Mapping
- **F2.1** Build a registry of all discovered content references with their source item IDs
- **F2.2** Track which references have been processed to prevent infinite loops
- **F2.3** Support incremental discovery as new references are found in referenced items
- **F2.4** Maintain bidirectional mapping: source ID → target ID (after recreation)

#### F3: Target Hub Matching
- **F3.1** Fetch all non-archived content items from target repository
- **F3.2** Match source items to target items by:
  - Schema ID (required match)
  - Label/Name (fuzzy match)
  - Delivery key (if present, exact match preferred)
- **F3.3** Create a resolution plan: items to create vs. items already existing

#### F4: Ordered Item Creation
- **F4.1** Build dependency graph from reference relationships
- **F4.2** Topologically sort items so dependencies are created first
- **F4.3** Create items with no references first, then items with resolved references
- **F4.4** Update references in created items with new target IDs

#### F5: Reference Resolution & Update
- **F5.1** After all items are created, update content references with target IDs
- **F5.2** Handle delivery key assignments for items that require them
- **F5.3** Validate all references point to valid target hub items before finalizing

#### F6: Publishing Status Preservation
- **F6.1** Track publishing status from source items (`LATEST`, `EARLY`, or unpublished)
- **F6.2** Publish recreated items only if source was published
- **F6.3** Preserve the publication version status

### 3.2 Edge Cases & Error Handling

- **E1:** Circular references between content items (A → B → A)
- **E2:** Self-referencing content items (A → A)
- **E3:** References to items that don't exist in source repository (orphaned references)
- **E4:** References to items that can't be matched in target repository
- **E5:** Multiple source items matching the same target item
- **E6:** Deeply nested reference chains (>10 levels)
- **E7:** Mixed inline content and content references in the same property
- **E8:** Empty or null reference properties

## 4. Non-Functional Requirements

### Performance
- **NFR1:** Reference discovery should complete within 30 seconds for 1000 items
- **NFR2:** Use pagination for large repositories (existing pattern with `size: 100`)
- **NFR3:** Minimize API calls by batching item fetches

### Reliability
- **NFR4:** Process should be idempotent - running twice should not create duplicates
- **NFR5:** Failed reference resolution should not break the entire operation
- **NFR6:** Provide rollback guidance for partial failures

### User Experience
- **NFR7:** Clear progress indicators during each phase
- **NFR8:** Detailed report of resolved vs. unresolved references
- **NFR9:** Warning prompts for unmatched references before proceeding

## 5. Technical Considerations

### Existing Patterns to Reuse
- `sourceToTargetIdMap` pattern from `sync-hierarchy.ts` (line 153)
- `getAllContentItems()` from `AmplienceService` for fetching repository items
- `prepareItemBodyForCreation()` for body transformation
- Progress bar pattern from `createProgressBar()`
- Report generation pattern from existing actions

### Reference Detection Strategy
Based on the provided schema example, references can be identified by:
```typescript
// Content Reference pattern
{
  id: string,           // UUID of referenced item
  contentType: string,  // Schema URI
  _meta: {
    schema: "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
  }
}

// Content Link pattern
{
  id: string,
  contentType: string,
  _meta: {
    schema: "http://bigcontent.io/cms/schema/v1/core#/definitions/content-link"
  }
}
```

### Matching Strategy
Priority order for matching source items to target items:
1. **Delivery Key** (exact match) - highest confidence
2. **Schema ID + Label** (exact schema, fuzzy label)
3. **Schema ID only** (multiple matches possible, requires user input)

## 6. Out of Scope

- Cross-hub content type schema synchronization (assume schemas exist in target)
- Version history preservation (only latest version is recreated)
- Workflow state preservation
- User permission/ACL migration
- Real-time sync (this is a one-time bulk operation)

## 7. Clarified Decisions

### 7.1 Matching Strategy
**Decision: Delivery Key Priority**

Items are matched from source to target hub using the following priority:
1. **Delivery Key (exact match)** — Highest confidence, unique per hub
2. **Schema ID + Label (fallback)** — When no delivery key match exists

### 7.2 Unmatched Reference Handling
**Decision: Recursive Discovery & Creation**

When a referenced item does not exist in the target hub:
- The system **recursively discovers** all referenced items from the source hub
- Missing items are **created from scratch** in the target hub to obtain new IDs
- A **source→target ID mapping registry** is built during creation
- References are **bound in subsequent phases** using the mapped IDs

This is the core mechanism: references drive item creation, not just matching.

### 7.3 Discovery Scope
**Decision: Single Repository**

Reference discovery is **limited to the user-selected source repository**:
- Only items within the selected repo are discovered and recreated
- References pointing to items outside the repo are flagged as "external references" in the pre-flight summary
- User can handle external references separately if needed

### 7.4 Delivery Key Handling
**Decision: Preserve If Available, Skip If Exists (Idempotent)**

When creating items in the target hub:
- Use the source delivery key if available in target
- **Skip creation** if delivery key already exists in target (assume already synced)
- This ensures idempotent behavior — running the operation twice produces the same result
- Pre-flight summary shows which items will be skipped vs created

### 7.5 Circular Reference Handling
**Decision: Two-Phase Creation**

For circular references (A → B → A) or self-references (A → A):
1. **Phase 1:** Create all items with null/empty references
2. **Phase 2:** Update items with circular references using the now-available target IDs

This preserves referential integrity without user intervention.

### 7.6 Feature Activation
**Decision: Always-On**

Reference resolution is **automatically enabled** for all cross-hub content recreation operations:
- No opt-in flag required
- Ensures correctness by default (prevents `403 FORBIDDEN` errors from invalid IDs)
- Aligns with user expectation that "sync" produces a complete, working copy

## 8. Remaining Considerations

These items are deferred for implementation-phase decisions:

1. **Partial Failure Recovery** — Whether to support checkpointing/resuming; for now, rely on idempotent behavior
2. **Inline vs Reference Distinction** — Use pattern matching on `_meta.schema` (existing approach)
3. **Performance Optimization** — Pre-fetch referenced items in parallel; no hard recursion depth limit initially
4. **Dry-Run Mode** — Pre-flight summary provides visibility; explicit dry-run can be added later if needed

## 9. Additional Context

*Reserved — populated by /task-add-context*
