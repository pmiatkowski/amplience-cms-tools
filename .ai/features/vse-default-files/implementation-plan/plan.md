# Implementation Plan: VSE Default Files Initialization

> **Status**: Planning
> **Created**: 2026-01-16
> **PRD Version**: 2026-01-16

---

## Summary

**Total Phases**: 3
**Estimated Scope**: Small

---

## Phase 1: Core Subcommand Structure

**Goal**: Create the basic subcommand directory structure and integrate it into the VSE Management command menu

### Tasks

- [ ] Task 1.1: Create `init-default-files/` subdirectory in `src/commands/vse-management/`
- [ ] Task 1.2: Create `init-default-files.ts` with `runInitDefaultFiles()` function that displays "Initialize Default Files - Coming Soon" message
- [ ] Task 1.3: Create `index.ts` barrel export in `init-default-files/` directory
- [ ] Task 1.4: Update `VseOperationChoice` type in `prompt-for-vse-operation.ts` to include `'init-default-files'`
- [ ] Task 1.5: Add "Initialize Default Files" choice to the operation menu in `prompt-for-vse-operation.ts`
- [ ] Task 1.6: Add case handler in `vse-management.ts` switch statement to call `runInitDefaultFiles()`

### Deliverables

- VSE Management menu displays "Initialize Default Files" option
- Selecting the option displays a placeholder message
- No existing functionality is broken

### Dependencies

- None

---

## Phase 2: Environment Variable Detection and File Validation

**Goal**: Implement environment variable detection and file existence validation logic

### Tasks

- [x] Task 2.1: Create utility function `getVseFilePaths()` to read environment variables `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE` and `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE`
- [x] Task 2.2: Create utility function `validateFileExists(filePath: string): boolean` using Node.js `fs.existsSync()`
- [x] Task 2.3: Create type definitions for VSE file paths configuration object
- [x] Task 2.4: Update `runInitDefaultFiles()` to call `getVseFilePaths()` and detect if environment variables are set
- [x] Task 2.5: Implement branching logic in `runInitDefaultFiles()` - one path for missing env vars, another path for existing env vars

### Deliverables

- Command can detect whether VSE environment variables are configured
- Command can validate file existence at configured paths
- Clear code structure for two main execution paths

### Dependencies

- Phase 1 complete

---

## Phase 3: Display Logic and Example Content

**Goal**: Implement the display logic for both scenarios (missing vs. existing environment variables)

### Tasks

- [ ] Task 3.1: Create constant `CONTENT_TYPES_EXAMPLE` containing the mock content types URIs array (following FR-6)
- [ ] Task 3.2: Create constant `VISUALIZATIONS_EXAMPLE` containing the Preview and Live View definitions (following FR-5)
- [ ] Task 3.3: Create utility function `displayMissingEnvVarsInstructions()` to show environment variable names, recommended paths, and complete example content
- [ ] Task 3.4: Create utility function `displayFileValidationResults()` to show "Found" or "Missing" status for each file with example content for missing files
- [ ] Task 3.5: Implement console output formatting with clear section headers and example JSON content
- [ ] Task 3.6: Add unit tests for utility functions in `init-default-files.test.ts` (co-located per testing standards)
- [ ] Task 3.7: Create/update documentation in `docs/vse-management.md` to describe the new subcommand

### Deliverables

- Users see helpful instructions when environment variables are not configured
- Users see file status validation when environment variables are configured
- Example content matches documentation specifications
- Full feature is functional with test coverage

### Dependencies

- Phase 2 complete
- Example content must match `docs/vse-management.md` documentation

---

## Notes

### Technical Considerations

- **Non-destructive approach**: This command only displays information and validates file existence - no files are created or modified
- **Example content storage**: Constants should be stored at the top of the file for easy maintenance and updates
- **Console formatting**: Use clear section headers and emoji indicators (✓/✗) for file status to match existing CLI patterns
- **Path handling**: Support both relative and absolute file paths when validating file existence

### Coding Standards References

- **File naming**: Use kebab-case for all files (`init-default-files.ts`) (see `memory/tech-stack.md`)
- **Command pattern**: Follow the existing VSE Management subcommand pattern in `src/commands/vse-management/bulk-update-visualizations/` (see `memory/tech-stack.md`)
- **One file, one function**: The main command orchestrator should be in `init-default-files.ts` with utility functions as needed (see `memory/coding-rules/index.md`)
- **Barrel exports**: Create `index.ts` for clean exports from the subdirectory (see `memory/tech-stack.md`)
- **Testing**: Co-locate unit tests with source files using `*.test.ts` pattern (see `memory/coding-rules/testing/index.md`)
- **Named exports**: Use named exports only, avoid default exports (see `memory/coding-rules/index.md`)
- **JSDoc documentation**: Document exported functions with `@param` and `@example` tags (see `memory/coding-rules/index.md`)

### Integration Points

- Update `src/commands/vse-management/prompts/prompt-for-vse-operation.ts` for menu option
- Update `src/commands/vse-management/vse-management.ts` for switch case handler
- Update `docs/vse-management.md` for documentation
- Update main README.md if needed for feature visibility

### Example Content Reference

From PRD FR-5 and FR-6, the example content must match:

**Visualizations Config (`visualizations.json`)**:
- Preview: `{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}` (default: true)
- Live View: `{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}`

**Content Types List (`content-types.json`)**:
- Array with mock URIs: `https://schema.example.com/product.json`, `https://schema.example.com/category.json`
