# Implementation Plan: Extension Import

> **Status**: Planning
> **Created**: 2026-01-09
> **PRD Version**: 2026-01-09
> **Last Updated**: 2026-01-09 (Restructured for TDD compliance)

---

## Summary

**Total Phases**: 5
**Estimated Scope**: Medium

**Key Changes from Initial Plan:**
- Restructured to follow TDD methodology (tests before implementation)
- Integrated JSDoc documentation into implementation tasks
- Clarified file organization strategy for helper functions

---

## Phase 1: Core Import Infrastructure

**Goal**: Establish foundational structure for import functionality with temp directory workflow

### Tasks

- [ ] Task 1.1: Create directory structure `src/commands/manage-extensions/import-extensions/` with barrel export
- [ ] Task 1.2: Write tests for error classes following TDD (test file: `src/services/actions/import-extensions.test.ts`)
- [ ] Task 1.3: Create error classes in `src/services/actions/import-extensions.ts` with JSDoc documentation (ImportExtensionsError, InvalidPatternError, DirectoryAccessError, DcCliExecutionError, HubAuthenticationError)
- [ ] Task 1.4: Write tests for `importExtensions()` action function covering temp directory workflow, cleanup on success/failure
- [ ] Task 1.5: Implement `importExtensions()` action function skeleton with JSDoc (@param, @example tags) including temp directory workflow
- [ ] Task 1.6: Write tests for `runImportExtensions()` command orchestrator covering hub selection and workflow
- [ ] Task 1.7: Implement `runImportExtensions()` command orchestrator with JSDoc documentation
- [ ] Task 1.8: Write tests for `prompt-for-extension-input-directory.ts` prompt
- [ ] Task 1.9: Create `prompt-for-extension-input-directory.ts` with JSDoc, default to `AMP_DEFAULT_EXTENSION_DIR` environment variable
- [ ] Task 1.10: Write tests for `runDcCliImport()` helper function covering authentication, error handling
- [ ] Task 1.11: Implement `runDcCliImport()` in separate file `src/services/actions/import-extensions/run-dc-cli-import.ts` with JSDoc to execute dc-cli command with hub authentication

### Deliverables

- Basic import command structure in place with comprehensive test coverage
- Temp directory workflow functional and tested
- dc-cli integration working with authentication and error handling tested
- User can select hub and specify source directory
- All functions documented with JSDoc

### Dependencies

- None

---

## Phase 2: Hub-Specific Field Updates

**Goal**: Automatically update hub-specific fields for target environment

### Tasks

- [x] Task 2.1: Write tests for `copyAndPrepareExtensions()` function covering file copying, directory creation
- [x] Task 2.2: Implement `copyAndPrepareExtensions()` in separate file `src/services/actions/import-extensions/copy-and-prepare-extensions.ts` with JSDoc to copy source files to temp directory
- [x] Task 2.3: Write tests for `updateExtensionFields()` function covering hubId updates, URL origin updates, error cases
- [x] Task 2.4: Implement `updateExtensionFields()` in separate file `src/services/actions/import-extensions/update-extension-fields.ts` with JSDoc to modify hubId and URL origin fields
- [x] Task 2.5: Write tests for `updateHubId()` helper covering valid/invalid hub IDs
- [x] Task 2.6: Implement `updateHubId()` in `update-extension-fields.ts` (grouped with related field update logic) with JSDoc
- [x] Task 2.7: Write tests for `updateUrlOrigins()` helper covering EXT_URL validation, origin replacement
- [x] Task 2.8: Implement `updateUrlOrigins()` in `update-extension-fields.ts` with JSDoc to replace URL origins using target hub's EXT_URL
- [x] Task 2.9: Write tests for EXT_URL validation covering missing/invalid EXT_URL scenarios
- [x] Task 2.10: Add validation to ensure EXT_URL exists for target hub before proceeding
- [x] Task 2.11: Integrate field updates into temp directory workflow in `importExtensions()` action

### Deliverables

- Source files remain unmodified (verified by tests)
- Temp files have correct hubId and URL origins for target hub (verified by tests)
- Clear error message if EXT_URL is missing (tested)
- All functions tested and documented with JSDoc

### Dependencies

- Phase 1 complete

---

## Phase 3: Filtering and Preview

**Goal**: Enable selective import with preview and confirmation

### Tasks

- [x] Task 3.1: Write tests for `prompt-for-extension-filter-pattern.ts` prompt
- [x] Task 3.2: Create `prompt-for-extension-filter-pattern.ts` with JSDoc, default to `AMP_DEFAULT_EXTENSION_FILTER` environment variable
- [x] Task 3.3: Write tests for `buildFilterRegex()` function covering valid patterns, invalid patterns, edge cases
- [x] Task 3.4: Implement `buildFilterRegex()` in separate file `src/services/actions/import-extensions/build-filter-regex.ts` with JSDoc and error handling for invalid patterns
- [x] Task 3.5: Write tests for `extensionMatchesPattern()` function covering id/url/description matching, edge cases
- [x] Task 3.6: Implement `extensionMatchesPattern()` in separate file `src/services/actions/import-extensions/extension-matches-pattern.ts` with JSDoc to test extensions against regex
- [x] Task 3.7: Write tests for `filterExtensions()` function covering kept/removed lists, progress tracking
- [x] Task 3.8: Implement `filterExtensions()` in separate file `src/services/actions/import-extensions/filter-extensions.ts` with JSDoc
- [x] Task 3.9: Write tests for `validateExtensionFile()` function covering JSON syntax validation, required fields, individual file handling
- [x] Task 3.10: Implement `validateExtensionFile()` in separate file `src/services/actions/import-extensions/validate-extension-file.ts` with JSDoc
- [x] Task 3.11: Write tests for preview table display logic
- [x] Task 3.12: Implement preview table display in command showing extension ID, URL, description, and file name
- [x] Task 3.13: Write tests for `prompt-for-import-confirmation.ts` prompt
- [x] Task 3.14: Create `prompt-for-import-confirmation.ts` with JSDoc to show preview and get user confirmation

### Deliverables

- User can filter extensions by regex pattern (tested)
- Invalid extension files are skipped with warnings (tested)
- Preview table shows extensions before import (tested)
- User must confirm before proceeding (tested)
- All functions tested and documented with JSDoc

### Dependencies

- Phase 2 complete

---

## Phase 4: Progress & Summary

**Goal**: Provide clear feedback during and after import operation

### Tasks

- [x] Task 4.1: Write tests for progress bar integration during file preparation
- [x] Task 4.2: Add progress bar during file preparation using existing `createProgressBar()` utility
- [x] Task 4.3: Write tests for progress bar integration during dc-cli import
- [x] Task 4.4: Add progress bar during dc-cli import execution
- [x] Task 4.5: Define `ImportExtensionsResult` type in `types/amplience.d.ts` with counts and summaries
- [x] Task 4.6: Write tests for `formatImportSummary()` function covering various result scenarios
- [x] Task 4.7: Implement `formatImportSummary()` in separate file `src/commands/manage-extensions/import-extensions/format-import-summary.ts` with JSDoc
- [x] Task 4.8: Write tests for summary display logic covering all display scenarios
- [x] Task 4.9: Implement summary display in command with total files, matched files, imported files, and any errors
- [x] Task 4.10: Write tests for error handling covering all error types (authentication, directory access, dc-cli execution, etc.)
- [x] Task 4.11: Add detailed error handling in command layer with user-friendly messages for each error type

### Deliverables

- Progress bars show during long operations (tested)
- Comprehensive summary displayed after completion (tested)
- Clear error messages for all failure scenarios (tested)
- All display logic tested and documented

### Dependencies

- Phase 3 complete

---

## Phase 5: Integration, Documentation & E2E Testing

**Goal**: Integrate import into manage-extensions menu, document, and validate end-to-end

### Tasks

- [x] Task 5.1: Update `src/commands/manage-extensions/index.ts` to export `runImportExtensions`
- [x] Task 5.2: Update manage-extensions menu to remove "disabled: true" from import option
- [x] Task 5.3: Review all test coverage and ensure comprehensive coverage for critical paths
- [x] Task 5.4: Create documentation in `docs/import-extensions.md` with usage examples, screenshots, troubleshooting
- [x] Task 5.5: Update main `README.md` with import command description and link to detailed docs
- [x] Task 5.6: Write E2E integration test covering full workflow: export from hub A, import to hub B
- [x] Task 5.7: Perform manual E2E validation: export from hub A, import to hub B, verify extensions work in target hub
- [x] Task 5.8: Verify all JSDoc documentation is complete and examples are accurate
- [x] Task 5.9: Run full test suite and verify coverage meets project thresholds

### Deliverables

- Import option available in manage-extensions menu
- Comprehensive test coverage for all components (unit + integration + E2E)
- Complete documentation with examples
- Verified working end-to-end in real environment
- All code properly documented with JSDoc

### Dependencies

- Phase 4 complete

---

## Notes

### TDD Methodology

This plan follows Test-Driven Development (TDD) principles:
- **Red-Green-Refactor cycle**: Write failing test → Implement minimal code → Refactor
- **Tests first**: Every implementation task is preceded by its corresponding test task
- **Co-location**: All test files placed next to source files following `{filename}.test.ts` pattern
- **Comprehensive coverage**: Tests cover business logic, error handling, edge cases, and integration points

### File Organization Strategy

**Helper Functions Organization:**

Following the "one file, one function" principle where practical:
- **Separate files for independent helpers**: Functions like `buildFilterRegex()`, `extensionMatchesPattern()`, `validateExtensionFile()` get their own files
- **Grouped files for tightly coupled helpers**: Related functions like `updateHubId()` and `updateUrlOrigins()` are grouped in `update-extension-fields.ts` since they work together on field updates
- **Location pattern**: Helper files in `src/services/actions/import-extensions/` subdirectory
- **Barrel export**: All helpers exported through `src/services/actions/import-extensions/index.ts`

**Directory structure:**
```
src/services/actions/
├── import-extensions.ts                           # Main action entry point
├── import-extensions.test.ts                      # Tests for main action
└── import-extensions/                             # Helper functions subdirectory
    ├── index.ts                                   # Barrel export
    ├── run-dc-cli-import.ts                       # DC-CLI integration
    ├── run-dc-cli-import.test.ts
    ├── copy-and-prepare-extensions.ts             # File preparation
    ├── copy-and-prepare-extensions.test.ts
    ├── update-extension-fields.ts                 # Grouped: updateHubId + updateUrlOrigins
    ├── update-extension-fields.test.ts
    ├── build-filter-regex.ts                      # Filtering logic
    ├── build-filter-regex.test.ts
    ├── extension-matches-pattern.ts               # Pattern matching
    ├── extension-matches-pattern.test.ts
    ├── filter-extensions.ts                       # Filter orchestration
    ├── filter-extensions.test.ts
    ├── validate-extension-file.ts                 # File validation
    └── validate-extension-file.test.ts
```

### JSDoc Documentation Standards

All public functions must include JSDoc with:
- **@param tags**: Document each parameter comprehensively with type and description
- **@example tags**: Include realistic usage examples, especially for Amplience API interactions
- **No @returns or @throws**: TypeScript types provide return information, avoid duplication
- **Focus on 'why'**: Document non-obvious decisions and business logic rationale

**Example:**
```typescript
/**
 * Update hub-specific fields in extension JSON file for target environment
 *
 * @param extensionPath - Absolute path to extension JSON file in temp directory
 * @param targetHub - Target hub configuration with hubId and EXT_URL
 * @example
 * await updateExtensionFields(
 *   '/temp/extensions/my-extension.json',
 *   { hubId: '5f8b...', name: 'PROD', extUrl: 'https://prod.amplience.net' }
 * );
 */
async function updateExtensionFields(extensionPath: string, targetHub: Amplience.HubConfig): Promise<void>
```

### Architectural Consistency

This implementation follows the established Command-Action pattern:
- **Command layer** (`import-extensions.ts`): Handles user interaction, prompts, progress, and error display
- **Action layer** (`import-extensions.ts` in services/actions): Contains core business logic, API calls, and file operations
- **Helper functions**: Organized in subdirectory with clear separation of concerns
- Mirrors the structure of `export-extensions` for consistency

### Temp Directory Pattern

Source files are never modified directly:
1. Copy source files to `temp_import_{timestamp}/extensions`
2. Apply filtering in temp directory
3. Update hub-specific fields in temp copies
4. Import from temp directory using dc-cli
5. Cleanup temp directory on success or failure

### Technical Considerations

**dc-cli Integration:**
- Command: `dc-cli extension import <dir> --clientId <id> --clientSecret <secret> --hubId <hubId>`
- Extensions with matching IDs overwrite existing extensions in hub
- Authentication errors must be caught and displayed clearly

**File Validation:**
- Each extension file validated individually
- Invalid files skipped with warnings
- Validation checks: JSON syntax, required fields (id, url, etc.)
- Continue importing remaining valid files if one fails

**Hub Configuration:**
- Target hub must have `EXT_URL` configured
- Fail early if `EXT_URL` missing (needed for URL origin updates)
- Support both OAuth and PAT authentication methods

### Risk Mitigation

**Data Safety:**
- Use temp directory to prevent source file corruption
- Validate files before modification
- Provide preview and confirmation before import
- All safety mechanisms tested

**Error Recovery:**
- Clean up temp directory even on failure (tested)
- Continue processing valid files if individual file fails validation (tested)
- Provide detailed error messages with file names and line numbers (tested)

**User Experience:**
- Clear progress indicators for long operations
- Comprehensive summary of what was imported
- Consistent with export command UX patterns

### Coding Standards References

Key standards addressed in this plan:

- **Testing (TDD)**: `.ai/memory/coding-rules/index.md` - Development Methodology
  - Tests written BEFORE implementation (Red-Green-Refactor)
  - Co-located with source files using `{filename}.test.ts` pattern
  - Use Vitest with path aliases (`~/`)
  - Focus on business logic, integration points, and critical paths

- **Documentation**: `.ai/memory/coding-rules/index.md` - Documentation Standards
  - JSDoc on all public functions with @param and @example tags
  - Self-documenting code preferred
  - Comments focus on 'why' not 'what'

- **File Organization**: `.ai/memory/tech-stack.md` - Command Pattern and Structure
  - Command-Action architecture with clear separation
  - One file, one function where practical (with exceptions for tightly coupled helpers)
  - Kebab-case file naming
  - Barrel exports for clean imports

- **Code Style**: `.ai/memory/coding-rules/index.md` - Coding Conventions
  - Use path aliases (`~/`) for imports
  - Named exports only (no default exports)
  - Global types in `types/` directory
