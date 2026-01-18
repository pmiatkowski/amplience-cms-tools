# Implementation Plan: temp-export-folder-structure

> **Status**: Planning
> **Created**: 2026-01-18
> **PRD Version**: 2026-01-18

---

## Summary

**Total Phases**: 2
**Estimated Scope**: Small

---

## Phase 1: Update Core Export Paths

**Goal**: Change the export folder paths from root-level `temp_export_*` to centralized `./temp/export/{timestamp}/` structure in both affected commands.

### Tasks

- [x] Task 1.1: Update or add tests for path changes (TDD: tests first)
  - Locate test files for both affected commands/actions
  - Update path assertions to expect new format: `./temp/export/{timestamp}/`
  - Verify parent directory creation (`./temp/export/`) is tested
  - Follow testing standards: co-locate tests, use `.test.ts` naming (see `.ai/memory/coding-rules/testing/index.md`)

- [x] Task 1.2: Update `copy-content-type-schemas.ts` to use new path format
  - Change line 179 from `temp_export_${Date.now()}` to `path.resolve('./temp/export', `${Date.now()}`)`
  - Ensure `recursive: true` option is maintained for directory creation
  - Verify the command creates `./temp/export/{timestamp}/` structure

- [x] Task 1.3: Update `export-extensions.ts` action to use new path format
  - Change line 107 from `path.resolve('./temp_export_${timestamp}/extensions')` to `path.resolve('./temp/export', `${timestamp}`, 'extensions')`
  - Ensure the action creates `./temp/export/{timestamp}/extensions/` structure
  - Maintain existing error handling and directory creation logic

### Deliverables

- Both commands create export folders under `./temp/export/{timestamp}/`
- Existing tests pass with updated path assertions
- New directory structure is automatically created on demand

### Dependencies

- None (baseline changes to existing code)

---

## Phase 2: Update Gitignore Documentation

**Goal**: Update `.gitignore` to document both patterns during transition period.

### Tasks

- [x] Task 2.1: Add documentation comment to `.gitignore`
  - Keep existing `temp_export*` pattern for transition period
  - Add inline comment noting `temp/` pattern already covers `./temp/export/`
  - Document that `temp_export*` is kept for old folders users haven't cleaned up

### Deliverables

- `.gitignore` clearly documents both patterns and their purposes
- Existing `temp/` pattern coverage is noted in comments

### Dependencies

- Phase 1 complete (path changes working as expected)

---

## Notes

This is a straightforward path refactoring with minimal risk. The changes are isolated to two files:

1. **Path construction**: Use `path.resolve('./temp/export', timestamp)` for consistent cross-platform path resolution
2. **Directory creation**: Existing `{ recursive: true }` options ensure parent directories are created automatically
3. **No migration needed**: Existing `temp_export_*` folders remain untouched per PRD requirements
4. **Backward compatibility**: No API changes, only internal path construction

### Coding Standards References

- **Testing Standards** (`.ai/memory/coding-rules/testing/index.md`):
  - Co-locate test files with source using `.test.ts` pattern
  - Mirror directory structure between source and tests
  - Focus tests on business logic and path construction

- **File Naming** (`.ai/memory/tech-stack.md`):
  - Use kebab-case for all filenames
  - Follow existing project patterns for consistency

- **Module Structure** (`.ai/memory/coding-rules/index.md`):
  - One file, one function principle (changes are isolated to specific functions)
  - Use named exports (no changes to export patterns needed)
