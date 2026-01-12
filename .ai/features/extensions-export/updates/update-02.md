# Feature Update 02

## Date

2026-01-09

## Change Description

When there are already files in the exported folder, user should be prompted before execution regarding next action:
- **Full overwrite** (delete everything in the export folder and perform fresh download) - set as default
- **Overwrite matching only** (will delete only matching json file by regexp). Those that do not match, should persist
- **Get missing only** - only download extensions that are not present in the current exported folder.

## Reason

To prevent accidental data loss and provide users with more control over export behavior when the target directory already contains extension files. This allows users to:
1. Safely update exports without losing unrelated files
2. Add missing extensions to an existing export
3. Perform a complete refresh when needed

## Impact Assessment

**Affected PRD sections:**
- FR-2: Output Directory Configuration
- FR-3: Export All Extensions
- FR-5: Extension Filtering
- FR-6: Preview/Direct Execution Mode (potential modification)
- FR-8: Result Summary
- AC-2: Output directory acceptance criteria
- AC-3: Extensions download acceptance criteria
- AC-13: Directory creation behavior

**Severity:** Moderate

**Justification:**
- Adds new functional requirement (pre-execution directory check and prompt)
- Modifies existing export workflow logic
- Introduces three distinct execution modes
- Requires new file system logic (checking existing files, selective deletion)
- Affects user interaction flow but doesn't change core architecture
- No changes to external integrations (dc-cli) or menu structure

**New Requirements:**

1. **FR-2A: Existing Files Detection**
   - Before export, check if output directory exists and contains .json files
   - If files exist, prompt user with three options
   - If directory is empty or doesn't exist, proceed with normal flow

2. **FR-2B: Export Mode Selection**
   - **Full overwrite** (default): Delete all files in export directory before export
   - **Overwrite matching only**: Delete only .json files that match the filter pattern, keep others
   - **Get missing only**: Compare existing files with hub extensions, download only those not present locally

3. **Modified Behavior:**
   - FR-3: Export command execution depends on selected mode
   - FR-5: Filtering logic adjusted based on mode
   - FR-8: Summary should indicate which mode was used and what happened to existing files

**Questions to Address:**

1. In "Get missing only" mode, how do we identify missing extensions?
   - Compare extension IDs from hub API list with local filenames?
   - Should we validate existing files are still valid/current?

2. In "Overwrite matching only" mode:
   - Should we download all first, then filter? Or filter hub list before download?
   - How do we match local files to hub extensions (by ID in filename)?

3. Should preview mode (FR-6) show:
   - What files will be kept/deleted in each mode?
   - Current state of output directory?

4. Should the mode selection come before or after the regex pattern prompt?
   - If before: User might not know what their pattern will match
   - If after: User knows what they're filtering but hasn't seen directory yet

5. Error handling:
   - What if local files are corrupted/invalid JSON?
   - What if filename pattern doesn't match expected extension ID format?

**Recommended Approach:**

Rather than updating PRD directly, recommend running `/ai.clarify extensions-export` to address the questions above, particularly:
- The sequencing of prompts (directory check → mode → pattern vs. pattern → directory check → mode)
- The technical implementation of "Get missing only" mode
- How to match local files to hub extensions reliably
- What information to show in preview mode for each option

This will ensure the implementation is well-defined before modifying acceptance criteria.
