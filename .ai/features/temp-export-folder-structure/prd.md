# PRD: temp-export-folder-structure

> **Status**: Draft
> **Created**: 2026-01-18
> **Last Updated**: 2026-01-18

---

## Overview

Reorganize temporary export folder structure from root-level `temp_export_*` directories to a centralized `./temp/export/{timestamp}/` hierarchy, improving project organization and reducing clutter in the project root.

## Problem Statement

Temporary export folders (`temp_export_{timestamp}`) are currently created directly in the project root by commands like `copy-content-type-schemas` and `export-extensions`. This creates clutter and makes the root directory messy, especially when multiple export operations are performed over time.

## Goals

- Centralize all temporary export folders under `./temp/export/` directory
- Maintain backward compatibility during transition period
- Preserve existing subdirectory structure within each timestamped export
- Apply changes to all commands that generate temp export folders

## Non-Goals

- Automatic migration of existing `temp_export_*` folders (users can clean up manually)
- Flattening the subdirectory structure within each export
- Changing the timestamp format or naming convention
- Organizing by content type (e.g., `./temp/export/extensions/{timestamp}/`)

## Functional Requirements

### FR-1: New folder structure

All commands creating temporary export folders must use the new path format: `./temp/export/{timestamp}/`. The timestamp should be a Unix epoch integer (milliseconds) matching the existing pattern.

### FR-2: Preserve subdirectories

The internal structure within each timestamped folder must be preserved. For example:
- `./temp/export/{timestamp}/extensions/` for extension exports
- `./temp/export/{timestamp}/content-types/` for content type schema exports

### FR-3: Affected commands

Update all commands that create `temp_export_*` folders:
- `copy-content-type-schemas`: Currently creates `temp_export_{timestamp}/` in root
- `export-extensions`: Currently creates `temp_export_{timestamp}/extensions/` in root

### FR-4: Gitignore updates

Update `.gitignore` to include both patterns during transition period:
- Keep `temp_export*` (for old folders users haven't cleaned up)
- Add explicit documentation of `temp/export/` coverage (note: already covered by existing `temp/` pattern)

### FR-5: No migration of existing folders

Existing `temp_export_*` folders in project root must remain untouched. No automatic migration or cleanup.

## Technical Considerations

**Affected files:**
- `src/commands/copy-content-type-schemas/copy-content-type-schemas.ts` (line 179-180)
- `src/services/actions/export-extensions.ts` (line 107)

**Path construction:**
- Use `path.resolve('./temp/export/{timestamp}')` for consistent path resolution
- Create parent directories recursively with `{ recursive: true }` option

**Testing:**
- Update test assertions to expect new path format
- Verify `temp/export/` parent directory is created when needed

**Gitignore note:**
The existing `temp/` pattern at line 65 already covers `./temp/export/`. The `temp_export*` pattern should be kept for transition period to prevent accidental commits of old folders.

## Acceptance Criteria

- [ ] AC-1: `copy-content-type-schemas` creates folders at `./temp/export/{timestamp}/`
- [ ] AC-2: `export-extensions` creates folders at `./temp/export/{timestamp}/extensions/`
- [ ] AC-3: Parent `./temp/export/` directory is created automatically if it doesn't exist
- [ ] AC-4: Existing tests pass with new path assertions
- [ ] AC-5: `.gitignore` includes both `temp_export*` and note about `temp/` coverage

## Open Questions

None
