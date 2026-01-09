# Implementation Plan: Extensions Export

> **Status**: Planning  
> **Created**: 2026-01-08  
> **Last Updated**: 2026-01-09  
> **PRD Version**: 2026-01-09

---

## Summary

**Total Phases**: 5  
**Estimated Scope**: Large

---

## Phase 1: Core Infrastructure & Menu Integration

**Goal**: Set up command structure, menu integration, and basic hub selection
flow

### Tasks

- [ ] Task 1.1: Create command directory structure
      `src/commands/manage-extensions/` with barrel exports following project
      conventions
- [ ] Task 1.2: Add "Manage Extensions" menu to main command menu in
      `src/index.ts` with submenu structure (Export/Import placeholder/Delete
      placeholder)
- [ ] Task 1.3: Create unit test `export-extensions.test.ts` for command
      orchestrator following co-location strategy (see
      [testing guidelines](../../memory/coding-rules/testing/index.md))
- [ ] Task 1.4: Implement basic command orchestrator `export-extensions.ts` with
      hub selection using existing `promptForHub()` pattern
- [ ] Task 1.5: Implement dc-cli availability check using
      `checkDcCliAvailability()` with user-friendly error message

### Deliverables

- Menu navigation works end-to-end from main menu → Manage Extensions → Export
  Extensions
- Hub selection prompt displays and allows hub selection
- Command gracefully handles missing dc-cli installation

### Dependencies

- None

---

## Phase 2: Directory Management & File Validation

**Goal**: Implement directory configuration, existing file detection, and
validation logic

### Tasks

- [ ] Task 2.1: Create output directory prompt with default value
      `./exports/extensions` supporting relative and absolute paths
- [ ] Task 2.2: Create unit tests for file validation covering valid files,
      corrupted JSON, invalid structure, permission errors (following TDD
      methodology - tests first)
- [ ] Task 2.3: Create utility function `validateExistingFiles()` to detect and
      validate JSON files in target directory
- [ ] Task 2.4: Implement JSON validation logic (parse check, extension
      structure check) with detailed error reporting
- [ ] Task 2.5: Implement fail-fast behavior: stop execution with list of
      problematic files if any validation fails
- [ ] Task 2.6: Add directory accessibility check before proceeding to next
      steps

### Deliverables

- User can specify output directory with validation
- Existing files are detected and validated for integrity
- Command fails fast with clear error messages for invalid files
- User receives actionable guidance to fix problematic files

### Dependencies

- Phase 1 complete

---

## Phase 3: Export Mode Selection & Hub Extension Fetching

**Goal**: Implement mode selection for handling existing files and hub extension
list fetching

### Tasks

- [ ] Task 3.1: Create export mode selection prompt (Full overwrite / Overwrite
      matching / Get missing) displayed only when existing valid files detected
- [ ] Task 3.2: Create utility function `fetchHubExtensions()` to retrieve
      extension list from Amplience API using native fetch
- [ ] Task 3.3: Implement authentication for API calls reusing hub credentials
      from config
- [ ] Task 3.4: Create unit tests for mode selection logic and hub extension
      fetching with mocked API responses
- [ ] Task 3.5: Add error handling for API failures with retry logic (3
      attempts)
- [ ] Task 3.6: Skip mode selection prompt if directory is empty or doesn't
      exist

### Deliverables

- User is prompted to select export mode only when existing files detected
- Extension list successfully fetched from hub API
- Mode selection integrated into command flow after directory validation

### Dependencies

- Phase 2 complete

---

## Phase 4: Regex Filtering & Mode-Specific Execution

**Goal**: Implement regex pattern configuration and mode-specific
download/filtering logic

### Tasks

- [ ] Task 4.1: Create regex pattern prompt with default from
      `AMP_DEFAULT_EXTENSION_FILTER` env variable (defaulting to "XXXX")
- [ ] Task 4.2: Implement regex validation with try-catch and clear error
      messages for invalid patterns
- [ ] Task 4.3: Create filtering utility `matchExtensionPattern()` to match
      regex against extension ID, URL, and description fields
- [ ] Task 4.4: Implement Full Overwrite mode: delete all existing files,
      download all to temp, filter, copy matching to target
- [ ] Task 4.5: Implement Overwrite Matching mode: download all to temp, filter,
      copy only matching to target (preserving non-matching existing files)
- [ ] Task 4.6: Implement Get Missing mode: compare hub extension IDs with local
      filenames, download only missing extensions
- [ ] Task 4.7: Create action file `src/services/actions/export-extensions.ts`
      with mode-specific execution logic
- [ ] Task 4.8: Add unit tests covering all three modes with different scenarios
      (empty hub, partial matches, no matches)

### Deliverables

- Regex filtering works correctly across extension fields
- All three export modes execute correctly with proper file handling
- Action layer is testable and follows Command → Action architecture

### Dependencies

- Phase 3 complete

---

## Phase 5: Preview Mode, Progress Indicators & Summary

**Goal**: Add mode-specific preview functionality, progress indicators, and
result summaries

### Tasks

- [ ] Task 5.1: Create preview/direct execution mode prompt
- [ ] Task 5.2: Implement mode-specific preview display:
  - Full overwrite: "X existing files will be deleted, Y matching extensions
    will be exported"
  - Overwrite matching: "Y matching files will be updated, Z non-matching files
    will be kept"
  - Get missing: "N new extensions will be added, M existing files unchanged"
- [ ] Task 5.3: Add confirmation prompt after preview before executing
      operations
- [ ] Task 5.4: Add progress indicators using `cli-progress` during extension
      download to temp location
- [ ] Task 5.5: Add progress indicator during filtering operation showing
      processed/total extensions
- [ ] Task 5.6: Implement mode-specific result summary:
  - Full overwrite: Total downloaded, kept after filtering (with IDs), removed
    count, export path
  - Overwrite matching: Total fetched, matching updated (with IDs), non-matching
    preserved count, export path
  - Get missing: Total in hub, new added (with IDs), existing unchanged count,
    export path
- [ ] Task 5.7: Add JSDoc documentation with `@param` and `@example` tags for
      all exported functions
- [ ] Task 5.8: Create unit tests for preview logic, progress indicators, and
      summary formatting
- [ ] Task 5.9: Implement proper cleanup of temporary directories after
      successful execution or on error
- [ ] Task 5.10: Create integration tests covering full command flow from menu
      selection through all three export modes (Full overwrite, Overwrite
      matching, Get missing) to completion, including error scenarios

### Deliverables

- Users can preview mode-specific impact before finalizing export
- Progress indicators provide feedback during long-running operations
- Mode-specific summaries show clear operation results
- Temporary resources cleaned up properly

### Dependencies

- Phase 4 complete

---

## Notes

### Implementation Architecture

This feature follows the project's established **Command → Action** architecture
pattern:

- Command layer (`export-extensions.ts`) handles UI orchestration and user
  interaction
- Action layer (`export-extensions.ts` in services/actions) handles business
  logic and API calls

### Workflow Sequence (Based on Round 2 Clarifications)

The command follows this specific workflow:

1. Hub selection
2. Output directory path prompt (with default `./exports/extensions`)
3. Check for existing files in directory
4. If files exist: Validate all files (fail fast on corrupted/invalid files)
5. If valid files exist: Export mode selection (Full overwrite / Overwrite
   matching / Get missing)
6. Regex pattern prompt (with default from env or "XXXX")
7. Preview/Direct execution choice
8. If preview: Show mode-specific preview with confirmation
9. Execute mode-specific logic
10. Display mode-specific result summary

### Technology Integration

- **dc-cli Integration**: Use `DcCliCommandBuilder` from
  `src/utils/dc-cli-executor.ts` for all dc-cli command execution
- **Amplience API**: Use native Node.js `fetch` for retrieving extension lists
  from hub API
- **Progress Indicators**: Use `cli-progress` library for visual feedback during
  long operations
- **File Operations**: Use native Node.js `fs` module (promises API) for file
  system operations
- **Temporary Directories**: Create `./temp_export_{timestamp}/extensions/` for
  intermediate downloads
- **Environment Variables**: Access via
  `process.env.AMP_DEFAULT_EXTENSION_FILTER` with fallback to "XXXX"

### Mode-Specific Implementation Details

**Full Overwrite Mode:**

- Delete all existing files in target directory
- Download all extensions from hub to temp location
- Apply regex filter to temp files
- Copy only matching extensions to target directory
- Display: "X files deleted, Y matching extensions exported"

**Overwrite Matching Mode:**

- Fetch hub extension list via API
- Download all extensions to temp location
- Apply regex filter to temp files
- Copy only matching extensions to target (overwriting existing matches)
- Preserve non-matching existing files in target
- Display: "Y matching files updated, Z non-matching files kept"

**Get Missing Mode:**

- Fetch hub extension list via API
- Compare extension IDs from API with local filenames (e.g., "my-ext-123.json")
- Download only extensions with IDs not present locally (direct to target, no
  temp needed)
- Display: "N new extensions added, M existing files unchanged"

### File Validation Strategy

Based on Round 2 Q5, implement **fail-fast** validation:

- After directory path provided, scan for existing files
- Validate each file: JSON parsing, structure check (has required extension
  fields)
- If ANY file is invalid/corrupted: stop execution immediately
- Display clear error message with list of problematic files
- Require user to fix or remove files before re-running command
- This ensures data integrity before any operations

### Coding Standards References

Key coding rules that apply to this implementation:

- **Architecture**: Follow Command → Action pattern (see
  [tech-stack.md](../../memory/tech-stack.md) section 4.1)
- **File Naming**: Use kebab-case for all files (see
  [coding-rules/index.md](../../memory/coding-rules/index.md))
- **Testing**: Co-locate tests with source files, one test file per source file
  (see
  [coding-rules/testing/index.md](../../memory/coding-rules/testing/index.md))
- **Documentation**: Use JSDoc with `@param` and `@example` tags, avoid
  `@returns` and `@throws` (see
  [coding-rules/index.md](../../memory/coding-rules/index.md))
- **Exports**: Use named exports only, create barrel exports in `index.ts` files
  (see [coding-rules/index.md](../../memory/coding-rules/index.md))
- **TDD**: Write tests before implementation where practical (see
  [coding-rules/index.md](../../memory/coding-rules/index.md))

### Future Extensibility

The submenu structure created in Phase 1 allows for future addition of:

- Import Extensions (future phase)
- Delete Extensions (future phase)

The filtering logic and action layer are designed to be reusable by future
import/restore commands.

### Environment Configuration Required

Add to `.env.example` and document in README:

```
AMP_DEFAULT_EXTENSION_FILTER=XXXX
```

### Testing Strategy

- **Unit Tests**: For all utilities, actions, and command logic with focus on
  mode-specific behavior
- **Integration Tests**: For full command flow including dc-cli interaction (can
  use mocks)
- **Edge Case Tests**: Empty results, invalid inputs, error scenarios, all three
  modes with various file states
- **Validation Tests**: Corrupted JSON, invalid structure, permission errors
- **Test Coverage**: Focus on business logic and critical paths (not just
  coverage metrics)
