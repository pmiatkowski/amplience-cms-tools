# Clarification Round 2

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

### Q1: When should the "existing files detected" prompt appear in the workflow?

**Options:**

- A: **Before regex pattern prompt** (Directory check → Mode selection → Pattern → Execute) — User knows mode before defining filter, but can't assess pattern impact on existing files
- B: **After regex pattern prompt** (Pattern → Directory check → Mode selection → Execute) — User knows what they're filtering before choosing mode, can make informed decision about overwrite/merge
- C: **After directory path prompt, before pattern** (Directory path → Check files → Mode selection → Pattern → Execute) — User sets destination first, sees what's there, chooses strategy, then defines filter

**Recommendation:** Option C, because it follows the logical flow of "where am I exporting? → what's already there? → how should I handle it? → what do I want to export?", allows users to change directory if needed before committing to a strategy, and aligns with the existing pattern where directory is prompted early (from Round 1, Q5 answer).

**Answer:** C

### Q2: In "Get missing only" mode, how should the tool identify which extensions are missing?

**Options:**

- A: **Compare extension IDs from hub API list with local filenames** (e.g., hub has "my-ext-123", check if "my-ext-123.json" exists locally) — Simple filename matching, fast, assumes dc-cli's naming convention
- B: **Parse local JSON files and compare extension IDs from content** — More reliable, handles renamed files, but requires reading all local files
- C: **Fetch hub extension list, download all to temp location, compare with existing directory, copy only missing** — Most reliable but slower (full download to temp first)

**Recommendation:** Option A, because dc-cli extension export uses predictable filename format (extension ID becomes filename), it's performant (no need to parse JSON), aligns with the "get missing" use case (user wants to add new extensions without re-downloading existing ones), and is consistent with how dc-cli names exported files.

**Answer:** A

### Q3: In "Overwrite matching only" mode, should the tool download all extensions first or filter at the API level?

**Options:**

- A: **Download all extensions to temp, then copy only matching to target directory** (preserves existing non-matching files, applies regex after download, consistent with original filtering approach)
- B: **Fetch hub extension list via API, filter by regex, download only matching extensions** (more efficient, skips downloading non-matching extensions, but requires API list call first)
- C: **Download all to target directory, then delete matching files and re-download them** (simpler logic, but briefly has duplicates and more file operations)

**Recommendation:** Option A, because it's consistent with your Round 1 answer (download ALL then filter on disk), ensures atomicity (temp location first, then move to target), and preserves the existing non-matching files safely without risk of corruption if download fails mid-process.

**Answer:** A

### Q4: When the user selects preview mode (from Round 1, Q4), what information should be displayed for the different export modes?

**Options:**

- A: **Same preview for all modes** (show matching extensions list only) — Simple, consistent, but doesn't show impact on existing files
- B: **Mode-specific previews** (Full overwrite: show "X existing files will be deleted"; Overwrite matching: show "Y matching files updated, Z non-matching kept"; Get missing: show "N new extensions added") — Informative, helps user understand impact
- C: **Detailed file-level preview** (show before/after state with file paths, existing vs new, kept vs deleted) — Maximum transparency but verbose

**Recommendation:** Option B, because it provides actionable information about what will happen to existing files based on the chosen mode, balances detail with readability, and aligns with the confirmation patterns in your codebase (showing summary before action like in archive-content-type-schemas).

**Answer:** B

### Q5: How should the tool handle errors when checking existing files in the export directory (e.g., corrupted JSON files, invalid filenames, permission issues)?

**Options:**

- A: **Ignore and skip problematic files** (show warning, continue with valid files, treat invalid files as non-extension files) — Resilient, doesn't block workflow, user can clean up later
- B: **Fail fast with error message** (stop execution, require user to fix/clean directory before proceeding) — Strict, ensures data integrity, prevents unexpected behavior
- C: **Prompt user for action** (show list of problematic files, ask: "Skip invalid files and continue?" or "Cancel and fix manually?") — Flexible, gives user control over risk tolerance

**Recommendation:** Option A, because the export modes are designed to handle mixed directory contents ("Overwrite matching only" explicitly preserves non-matching files), corrupted files are likely non-extension files that should be preserved, and blocking the entire workflow for a single bad file creates poor UX when the goal is just to export/update extensions.

**Answer:** B

## Summary

Established workflow for handling existing files in export directory: Check files after directory path prompt but before pattern (Directory → Check → Mode → Pattern flow), identify missing extensions by comparing hub extension IDs with local filenames, download all to temp then copy only matching in "Overwrite matching" mode, show mode-specific preview information (files deleted/updated/added counts), and fail fast with error if problematic files detected to ensure data integrity before proceeding.

