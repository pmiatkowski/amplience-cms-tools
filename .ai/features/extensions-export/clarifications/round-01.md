# Clarification Round 1

<!-- METADATA
format_version: 2.0
round_type: sequential
planned_questions: 5
current_question: 5
allow_followups: true
-->

## Date

2026-01-08

## Questions & Answers

### Q1: Should the extension command support export-only, or should it also include import and delete operations?

**Options:**

- A: Export-only (fastest to implement, aligns with "export functionality" in
  request)
- B: Export + Import (standard bidirectional workflow, matches
  copy-content-type-schemas pattern)
- C: Full suite: Export + Import + Delete (comprehensive management, mirrors all
  dc-cli extension capabilities)

**Recommendation:** Option C, because the request says "manage extensions" (not
just export), dc-cli already provides all three operations
(export/import/delete), and other commands in the codebase follow comprehensive
patterns (e.g., archive-content-type-schemas handles both archive and restore
flows).

**Answer:** A, but there will be more actions introduced in the future so ensure
to leave some space for that

### Q2: How should extension management fit into the existing menu-driven command structure?

**Options:**

- A: Single menu item "Manage Extensions" that opens a submenu (Export / Import
  / Delete) — allows future operations without cluttering main menu
- B: Separate menu items for each operation: "Export Extensions", "Import
  Extensions" (future), "Delete Extensions" (future) — follows existing flat
  command pattern
- C: Single menu item "Export Extensions" for now, add "Import Extensions" /
  "Delete Extensions" as separate items when implemented — incremental approach

**Recommendation:** Option A, because you mentioned future extensibility is
important, grouping extension operations under one menu item prevents main menu
bloat (you already have 13 commands), and hierarchical menus are used elsewhere
in your codebase (e.g., list-folder-tree has hub → repository selection flow).

**Answer:** A

### Q3: Should users be able to filter which extensions to export (e.g., by ID or pattern), or should it always export all extensions?

**Options:**

- A: Export all extensions only (simplest, matches standard backup/migration use
  case)
- B: Support filtering by specific extension IDs via prompt (flexible, aligns
  with dc-cli's `--id` flag capability)
- C: Support both: default to "all", with option to filter by IDs or regex
  pattern (maximum flexibility, matches patterns in copy-content-type-schemas)

**Recommendation:** Option C, because dc-cli already supports `--id` filtering
for selective exports, your copy-content-type-schemas command demonstrates this
pattern (filter by regex or select specific schemas), and selective export is
valuable for testing or migrating specific extensions without full hub export.

**Answer:** We will use our own filtering option - first command will download
ALL extensions - then, once on the disk, it will filter out extensions based on
provided reg-exp pattern. By default it should be set to "XXXX". Filtering will
check id, or url or description and if it matches, it will only keep those
matching extensions

### Q4: Should the export command support a dry-run/preview mode before actually exporting and filtering extensions?

**Options:**

- A: Yes, show matching extensions and confirm before export (safer, aligns with
  other commands like archive-content-type-schemas that require confirmation)
- B: No, execute immediately (faster workflow, user can inspect files after
  export)
- C: Make it configurable: prompt user whether to preview first or execute
  directly (maximum flexibility)

**Recommendation:** Option A, because your other commands consistently use
confirmation patterns ("Display summary and confirm" from context.md), exporting
all extensions then filtering could be time-consuming on large hubs, and showing
what will be kept/removed before finalizing gives users confidence especially
with regex patterns.

**Answer:** C

### Q5: Where should the exported extensions be saved, and should users be able to specify the output directory?

**Options:**

- A: Fixed location: `./temp_export_{timestamp}/extensions/` (consistent with
  existing temp_export folders visible in workspace)
- B: User-specified directory via prompt (flexible, allows organizing exports by
  purpose/client)
- C: Default to `./exports/extensions_{timestamp}/` with option to customize via
  prompt (balance of convenience and flexibility)

**Recommendation:** Option B, because dc-cli's extension export command requires
an output directory argument (`dc-cli extension export ./export-dir`), other
commands in your codebase prompt for important paths, and users likely want to
organize extension exports by environment/project rather than mixing them in
temp folders.

**Answer:** B with default option set to ./exports/extensions

**Additional Clarification:** Default filtering regex pattern will be
configurable in .env file (similar to AMP_DEFAULT_SCHEMA_ID pattern)

## Summary

Established core requirements for extension export: Export-only operation with
extensible architecture for future import/delete features, accessed via "Manage
Extensions" menu item with operation submenu, two-phase filtering (download all
then filter on disk by regex matching id/url/description), configurable
preview/direct execution mode, user-specified output directory with
./exports/extensions default, and default regex filter configurable via .env
file.
