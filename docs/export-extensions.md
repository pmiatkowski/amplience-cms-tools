# Functionality: Export Extensions

This functionality provides an intelligent way to export Amplience CMS
extensions from a hub with advanced filtering capabilities and flexible handling
of existing exports. The tool downloads all extensions to a temporary location,
applies regex-based filtering, then strategically manages the target directory
based on user-selected mode.

## Purpose

The primary purpose of this functionality is to enable bulk export of extensions
from Amplience CMS hubs for backup, migration, and selective management
purposes. It provides intelligent filtering options and smart handling of
existing exports to support various export workflows.

## Problems it solves

- **Bulk Extension Backup:** Manually exporting extensions one-by-one through
  the Amplience UI is time-consuming and error-prone. This tool automates the
  bulk export process.
- **Selective Export:** Need to export only specific extensions matching certain
  patterns (e.g., by organization, URL pattern, or description content). The
  tool provides regex-based filtering across multiple extension fields.
- **Export Management:** When working with existing export directories, users
  need different strategies: full refresh, selective update, or incremental
  addition. The tool supports all three modes.
- **Pattern-Based Selection:** The dc-cli tool provides basic export
  functionality but lacks intelligent filtering options beyond manual ID
  selection. This tool enables pattern-based selection after download.
- **Export Preview:** Users need to see what will be exported before finalizing
  changes. The tool provides preview mode with mode-specific impact information.

## How it works

1. The user initiates the `Manage Extensions` command from the main menu, which
   opens a submenu.
2. They select `Export Extensions` from the submenu.
3. They are prompted to select the target hub from configured hubs.
4. The user specifies the output directory (default: `./exports/extensions`).
5. **File Validation:** If the directory exists and contains files:
   - The tool validates each file (JSON parsing and structure check)
   - If any file is corrupted or invalid, the command stops with an error
     listing problematic files
   - The user must fix or clean the directory manually before re-running
6. **Mode Selection:** If valid files exist, the user selects the export mode:
   - **Full overwrite:** Delete all existing files, export all filtered
     extensions fresh
   - **Overwrite matching only:** Keep existing non-matching files, re-download
     and overwrite only extensions matching the regex pattern
   - **Get missing only:** Keep all existing files, add only extensions not
     already present locally
7. The user enters a regex pattern to filter extensions (default from
   `AMP_DEFAULT_EXTENSION_FILTER` env variable or "XXXX"). The pattern matches
   against extension ID, URL, and description fields.
8. The user chooses between:
   - **Preview mode:** Display mode-specific preview information and require
     confirmation before executing
   - **Direct execution:** Apply filter and execute immediately without preview
9. The tool executes `dc-cli extension export` to download all extensions from
   the hub to a temporary location.
10. The regex pattern is applied, filtering extensions where any field (ID, URL,
    or description) matches the pattern.
11. Based on the selected mode:
    - **Full overwrite:** Clears target directory, copies all matching
      extensions from temp to target
    - **Overwrite matching:** Fetches hub extension list via API, filters by
      regex, copies only matching to target (preserving non-matching existing
      files)
    - **Get missing:** Compares hub extension IDs with existing local filenames,
      downloads only extensions with IDs not present locally
12. Progress indicators display during API calls, download, and file operations.
13. A mode-specific summary is displayed showing:
    - **Full overwrite:** Total downloaded, extensions kept (with IDs),
      extensions removed count, directory path
    - **Overwrite matching:** Total fetched, matching updated (with IDs),
      non-matching preserved count, directory path
    - **Get missing:** Total in hub, new added (with IDs), existing unchanged
      count, directory path

## Key Features

- **Intelligent Filtering:** Regex pattern matching across extension ID, URL,
  and description fields
- **Multiple Export Modes:** Flexible handling of existing exports (full
  overwrite, selective overwrite, incremental addition)
- **File Validation:** Pre-flight validation of existing files with fail-fast
  error handling to maintain data integrity
- **Preview Capability:** See mode-specific impact before finalizing export
- **Configurable Defaults:** Default filter pattern via environment variable
  (`AMP_DEFAULT_EXTENSION_FILTER`)
- **Progress Tracking:** Real-time progress indicators for all operations
- **Extensible Architecture:** Submenu structure ready for future import/delete
  operations

## Configuration

### Environment Variables

- **`AMP_DEFAULT_EXTENSION_FILTER`** - Default regex pattern for filtering
  extensions (default: "XXXX")

### Default Locations

- **Temporary download:** `./temp_export_{timestamp}/extensions/`
- **Final export:** User-specified or default `./exports/extensions`
- **File naming:** Extensions exported as JSON files following dc-cli
  convention: `{extension-id}.json`

## Prerequisites

- **dc-cli installed:** The tool requires Amplience dc-cli to be installed and
  accessible
- **Hub access:** Valid API credentials for the target hub (configured in .env)
- **File system access:** Write permissions for temporary and target directories

## Use Cases

### Use Case 1: Backup Organization Extensions

**Scenario:** A developer wants to backup all extensions belonging to their
organization.

**Steps:**

1. Run the tool and select "Manage Extensions" → "Export Extensions"
2. Select the target hub
3. Specify output directory (or use default)
4. If directory is empty, skip mode selection
5. Enter regex pattern matching organization: `^myorg-.*`
6. Choose preview mode to verify extensions
7. Confirm export
8. Extensions matching the pattern are exported

### Use Case 2: Incremental Backup

**Scenario:** A DevOps engineer wants to add newly created extensions to an
existing export directory without re-downloading everything.

**Steps:**

1. Run the tool and navigate to "Export Extensions"
2. Select the hub
3. Specify the existing export directory
4. Tool validates existing files (all pass)
5. Select mode: **Get missing only**
6. Enter regex pattern (or use default)
7. Choose direct execution
8. Only new extensions (IDs not present locally) are added

### Use Case 3: Selective Refresh

**Scenario:** A content manager wants to update only specific extensions in a
mixed export directory while preserving other files.

**Steps:**

1. Run the tool and navigate to "Export Extensions"
2. Select the hub
3. Specify the directory containing mixed files
4. Tool validates existing files
5. Select mode: **Overwrite matching only**
6. Enter regex pattern to match specific extensions: `production-.*`
7. Choose preview mode to see which files will be updated
8. Confirm export
9. Only matching extensions are updated; other files remain untouched

### Use Case 4: Full Refresh Export

**Scenario:** A system administrator wants to create a fresh export of all
extensions matching a pattern.

**Steps:**

1. Run the tool and navigate to "Export Extensions"
2. Select the hub
3. Specify output directory (existing or new)
4. If existing files detected, tool validates them
5. Select mode: **Full overwrite**
6. Enter regex pattern to match all desired extensions
7. Choose preview mode to see total impact
8. Confirm export
9. All existing files deleted, all matching extensions exported fresh

## Error Handling

The tool provides clear error messages for:

- **dc-cli not installed:** "dc-cli is not installed or not accessible. Please
  install it first."
- **Hub authentication failure:** "Failed to authenticate with hub. Check your
  credentials."
- **Invalid regex pattern:** "Invalid regex pattern: [error details]. Please
  correct the pattern."
- **Corrupted files:** "The following files are corrupted or invalid: [file
  list]. Please fix or remove them before retrying."
- **File system permissions:** "Permission denied when accessing [path]. Please
  check file permissions."
- **Empty results:** "No extensions found in hub matching the criteria."
- **Network issues:** "Network error during download: [error details]. Please
  check connectivity."

## Output

- **Extensions:** Individual JSON files named by extension ID (e.g.,
  `my-extension-123.json`)
- **File location:** User-specified directory or default `./exports/extensions`
- **Summary:** Console output showing mode-specific counts and extension IDs

## Related Commands

- **Import Extensions** (Coming soon) - Import extensions from export directory
  to a hub
- **Delete Extensions** (Coming soon) - Delete extensions from a hub based on
  filters

## Future Enhancements

- Import functionality for migrating extensions between hubs
- Delete functionality for bulk removal of extensions
- Support for additional filtering methods (interactive selection)
- Automatic repair of corrupted JSON files
- Real-time filtering during API calls

## Technical Details

### Architecture

- **Command layer:** `src/commands/manage-extensions/export-extensions.ts` -
  User interface and prompts
- **Action layer:** `src/services/actions/export-extensions.ts` - Business logic
- **Utilities:** File validation, JSON parsing, extension ID extraction

### Integration

- Uses `DcCliCommandBuilder` for dc-cli command execution
- Follows existing `promptForHub()` pattern for hub selection
- Integrates with Amplience API for extension list retrieval (in specific modes)
- Follows command registration pattern (barrel exports and switch case)

### Dependencies

- **dc-cli:** For extension export functionality
- **Node.js fs/promises:** For file operations
- **Node.js fetch:** For Amplience API calls
- **Inquirer.js:** For user prompts
- **cli-progress:** For progress indicators
