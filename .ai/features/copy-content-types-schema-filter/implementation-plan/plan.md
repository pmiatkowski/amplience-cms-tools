# Implementation Plan: Copy Content Types Schema Filter

> **Status**: Planning  
> **Created**: 2026-01-30  
> **PRD Version**: 2026-01-30

---

## Summary

**Total Phases**: 2  
**Estimated Scope**: Small

---

## Phase 1: Modify promptForSchemaIdFilter Function

**Goal**: Update the existing schema ID filter prompt to accept optional default value and improve messaging

### Tasks

- [x] Task 1.1: Create unit tests for `promptForSchemaIdFilter` covering: default value usage, empty input handling, invalid regex handling (TDD - tests first)
- [x] Task 1.2: Update `promptForSchemaIdFilter` signature to accept optional `{ defaultValue?: string }` parameter
- [x] Task 1.3: Update prompt message to "Filter by schema ID (leave blank for any):"
- [x] Task 1.4: Add invalid regex validation with error message "Invalid regex pattern" and re-prompt loop

### Deliverables

- Modified `promptForSchemaIdFilter` function with optional default parameter
- Improved prompt message per FR-2
- Invalid regex handling with re-prompt per FR-5
- Unit tests covering all input scenarios

### Dependencies

- None

---

## Phase 2: Integrate Filter into Copy Content Types Command

**Goal**: Add schema ID filtering to the copy-content-types workflow with filter summary display

### Tasks

- [x] Task 2.1: Import `promptForSchemaIdFilter` in `copy-content-types.ts`
- [x] Task 2.2: Add filter prompt call after `getMissingContentTypes()` and before `promptForContentTypesToSync()`
- [x] Task 2.3: Pass `AMP_DEFAULT_SCHEMA_ID` environment variable as default value to prompt
- [x] Task 2.4: Implement filtering logic using regex pattern on `contentTypeUri` property
- [x] Task 2.5: Add filter summary display "Filtered to X of Y content types" after filtering
- [x] Task 2.6: Handle empty filter input (skip filtering, show all content types)
- [x] Task 2.7: Add integration tests for the copy-content-types command with filter scenarios

### Deliverables

- Schema ID filter integrated into copy-content-types workflow
- Environment variable default support
- Filter summary displayed to user
- Empty filter gracefully skipped
- Integration tests for filter behavior

### Dependencies

- Phase 1 complete

---

## Notes

### Implementation Details

**Integration Point (Phase 2):**
The filter should be inserted in `copy-content-types.ts` at approximately line 77, after:

```typescript
if (missingContentTypes.length === 0) { ... }
```

and before:

```typescript
console.log(`Found ${missingContentTypes.length} content types to sync:`);
```

**Filter Logic:**

```typescript
const pattern = new RegExp(filterPattern);
const filtered = missingContentTypes.filter(ct => pattern.test(ct.contentTypeUri));
```

**Backwards Compatibility:**

- The `defaultValue` parameter is optional, so existing callers of `promptForSchemaIdFilter` continue to work unchanged
- Empty filter input results in no filtering (all items shown)

### Coding Standards References

- **Testing Standards**: Co-locate unit tests with source files using `{filename}.test.ts` pattern (see `.ai/memory/coding-rules/testing/index.md`)
- **Architecture**: Follow Command → Action pattern; filter logic stays in command layer as it's user interaction orchestration
- **Module Structure**: One file, one function rule; filter prompt modification stays in existing file
- **Named Exports**: Use named exports only (existing pattern already followed)
- **Type Management**: Types defined inline in function signature (simple case, no need for shared type)
