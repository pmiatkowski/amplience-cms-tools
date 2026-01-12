# Clarification Round 1

<!-- METADATA
format_version: 2.0
round_type: sequential
planned_questions: 5
current_question: 5
allow_followups: true
-->

## Date

2026-01-09

## Questions & Answers

### Q1: Before importing, should the tool modify extension JSON files to update hub-specific fields (hubId, URL origins)?

**Options:**
- A: Yes, automatically update hubId and URL origin in each extension file based on target hub's EXT_URL (ensures extensions reference correct hub, prevents cross-hub issues)
- B: Yes, but only update hubId, keep original URLs unchanged (minimal modification, preserves original extension URLs)
- C: No, import files exactly as-is without modification (simplest approach, user responsible for file preparation)

**Recommendation:** Option A, because the request explicitly mentions "update hubId and url origin based on .env AMP_HUB_XXXX_EXT_URL environment", and automatically updating hub-specific fields prevents common issues when moving extensions between hubs (dev → staging → prod). This aligns with the export pattern where files are hub-specific.

**Answer:** A

### Q2: What should happen if an extension with the same ID already exists in the target hub?

**Options:**
- A: Always overwrite existing extensions (mirrors export's "overwrite" behavior, ensures source files take precedence)
- B: Skip existing extensions, only import new ones (safer default, preserves existing hub configuration)
- C: Prompt user for each conflict (maximum control, but slower for bulk imports)

**Recommendation:** Option A, because importing typically means "sync from source to target", and the export flow already uses overwrite patterns. This matches the mental model where the local export directory is the source of truth being promoted to the target hub. Consistent with dc-cli's default import behavior.

**Answer:** A

### Q3: Should the tool validate extension JSON files before importing to the target hub?

**Options:**
- A: Yes, validate all files before starting import (fail fast if any file is corrupted/invalid, prevents partial imports)
- B: Yes, validate each file individually and skip invalid ones (resilient approach, imports valid files even if some are broken)
- C: No validation, let dc-cli handle errors (simplest implementation, relies on dc-cli's built-in validation)

**Recommendation:** Option A, because the export flow already includes validation via `validateExistingFiles()`, and failing fast prevents situations where some extensions import successfully while others fail mid-process. This gives users a clear error list upfront and maintains consistency with the export pattern. Users can fix issues before committing to the import operation.

**Answer:** B

### Q4: Should users see a preview of extensions before they're imported, similar to the export flow?

**Options:**
- A: Yes, always show preview table with extension details and require confirmation (safer, prevents accidental imports, mirrors export UX)
- B: Yes, but make preview optional via prompt (flexible, experienced users can skip preview for faster imports)
- C: No preview, just show count and proceed after confirmation (faster workflow, simpler implementation)

**Recommendation:** Option A, because the export flow includes a comprehensive preview (`displayPreview` showing ID/URL/Description table) and the request explicitly mentions "user will see a prompt confirming listed extensions and target hub". Previewing is especially important for imports since they modify the target hub, making mistakes more costly than exports. Consistent UX across export/import operations.

**Answer:** A

### Q5: The request mentions "filtered out extensions will be moved to a temp folder". How should the temp folder workflow work?

**Options:**
- A: Copy all files to temp, filter there, modify hub-specific fields, then import from temp (non-destructive to source, safe for retry, matches export's temp pattern)
- B: Filter and modify files in-place in source directory, use temp only for dc-cli operations (simpler, but modifies user's source files)
- C: Skip temp folder entirely, filter and import directly from source directory (fastest, minimal disk I/O)

**Recommendation:** Option A, because the export flow uses a similar temp directory pattern (`temp_export_${timestamp}/extensions`) for staging operations before committing to the target directory. This approach is non-destructive to the source files, allows for safe rollback on errors, and lets users retry imports without re-preparing files. The temp folder contains the modified versions (updated hubId/URL) while preserving original source files intact.

**Answer:** A

## Summary

Established core import requirements: automatically update hubId and URL origins for target hub, always overwrite existing extensions, validate each file individually and skip invalid ones, always show preview table before import, use temp directory workflow to preserve source files while preparing modified versions for import.
