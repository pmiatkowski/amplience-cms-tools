# Clarification Round 1

<!-- METADATA
format_version: 2.0
round_type: sequential
planned_questions: 5
current_question: 5
allow_followups: true
-->

## Date

2026-01-18

## Questions & Answers

### Q1: Which commands/features should create temp folders in the new `./temp/export/` structure?

**Options:**

- A: Both `copy-content-type-schemas` and `export-extensions` (consistent across all temp exports)
- B: Only `export-extensions` (scope to the extensions workflow, keep copy-content-type-schemas as-is)
- C: All commands that create temp folders (includes any other temp-generating commands found in the codebase)

**Recommendation:** Option A, because both commands use the same `temp_export_{timestamp}` naming pattern, and keeping them consistent will simplify maintenance and make the temp folder organization predictable for users.

**Answer:** C

### Q2: What should be the exact folder path format for the new temp export structure?

**Options:**

- A: `./temp/export/{timestamp}/` (clean, simple, just timestamp as folder name)
- B: `./temp/export/temp_export_{timestamp}/` (preserves the `temp_export_` prefix for consistency with existing references)
- C: `./temp/export/{command-name}-{timestamp}/` (includes command name for disambiguation when multiple exports run concurrently)

**Recommendation:** Option A, because the parent directory structure (`./temp/export/`) already provides organization, and using just the timestamp keeps paths shorter and cleaner. The existing `temp_export_` prefix is redundant when the folder is already inside an `export/` directory.

**Answer:** A

### Q3: How should existing `temp_export_*` folders in the project root be handled?

**Options:**

- A: Leave them untouched (no migration, users can delete manually if needed)
- B: Automatically move them to `./temp/export/` on first run (one-time migration)
- C: Delete them on first run after warning the user (clean slate approach)

**Recommendation:** Option A, because temp folders are ephemeral by nature and typically contain outdated data. Moving them adds complexity with little value (the data is usually discarded anyway), and deleting them automatically could surprise users who might still need the contents. A manual cleanup approach is safest.

**Answer:** A

### Q4: The `.gitignore` currently has `temp_export*` at the root. How should the gitignore pattern be updated?

**Options:**

- A: Replace with `temp/export/` (ignores the entire new temp export directory)
- B: Keep `temp_export*` AND add `temp/export/` (both old and new patterns for transition period)
- C: Use `temp/` to ignore all temp directories (broader, catches any temp-related folders)

**Recommendation:** Option B, because keeping `temp_export*` during a transition period prevents accidental commits of old temp folders that users haven't cleaned up yet. Once users have migrated and cleaned up, the old pattern can be removed in a future cleanup commit.

**Answer:** B

### Q5: Should the subdirectories within the temp export folder (e.g., `/extensions/`, `/content-types/`) be preserved, or should the structure be flattened?

**Options:**

- A: Preserve subdirectories (e.g., `./temp/export/{timestamp}/extensions/`) - maintains existing structure
- B: Flatten to just timestamp (e.g., `./temp/export/{timestamp}/`) - simpler, all files at root level
- C: Use category-based top-level dirs (e.g., `./temp/export/extensions/{timestamp}/`) - organizes by type instead of timestamp

**Recommendation:** Option A, because the existing subdirectory structure (`/extensions/`, `/content-types/`) provides logical organization and makes it clear what type of content each temp folder contains. This also maintains consistency with how the commands currently work and requires minimal code changes.

**Answer:** A

## Summary

All temp export folders will move to `./temp/export/{timestamp}/` with preserved subdirectory structure (e.g., `/extensions/`). Existing `temp_export_*` folders in root remain untouched. Gitignore will include both `temp_export*` and `temp/export/` during transition period.
