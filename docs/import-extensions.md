# Functionality: Import Extensions

This functionality provides an intelligent way to import Amplience CMS
extensions to a hub with advanced filtering capabilities and automatic
hub-specific field updates. The tool validates extensions, updates hub-specific
fields (hub IDs and URL origins), applies regex-based filtering, and imports
extensions using dc-cli integration.

## Purpose

The primary purpose of this functionality is to enable bulk import of extensions
to Amplience CMS hubs for deployment, migration, and selective management
purposes. It provides intelligent filtering options and automatic field updates
to support various import workflows across different environments.

## Problems it solves

- **Bulk Extension Deployment:** Manually importing extensions one-by-one
  through the Amplience UI is time-consuming and error-prone. This tool
  automates the bulk import process.
- **Cross-Hub Migration:** Need to migrate extensions from one hub to another
  with automatic hub-specific field updates (hub IDs and URL origins). The tool
  handles field transformations automatically.
- **Selective Import:** Need to import only specific extensions matching certain
  patterns (e.g., by organization, URL pattern, or description content). The
  tool provides regex-based filtering across multiple extension fields.
- **Source Preservation:** Users need to ensure source files remain unmodified
  during import operations. The tool uses a temporary directory workflow to
  preserve source integrity.
- **Field Validation:** Extensions must have correct hub-specific fields for the
  target environment. The tool validates required configuration (EXT_URL) and
  updates fields appropriately.
- **Import Preview:** Users need to see what will be imported before finalizing
  changes. The tool provides preview mode with detailed extension information.

## How it works

1. The user initiates the `Manage Extensions` command from the main menu, which
   opens a submenu.
2. They select `Import Extensions` from the submenu.
3. They are prompted to select the target hub from configured hubs.
4. The tool validates that the target hub has `EXT_URL` configured (required for
   URL origin updates).
5. The user specifies the input directory containing extension JSON files
   (default from `AMP_DEFAULT_EXTENSION_DIR` environment variable).
6. The user enters a regex pattern to filter extensions (default from
   `AMP_DEFAULT_EXTENSION_FILTER` env variable or ".*"). The pattern matches
   against extension ID, URL, and description fields.
7. **File Validation and Filtering:**
   - The tool scans the input directory for JSON files
   - Each file is validated (JSON parsing and required field checks)
   - Invalid files are skipped with warnings
   - Valid extensions are filtered by the regex pattern
   - Extensions matching the pattern are kept for import
8. **Preview and Confirmation:**
   - A table displays extensions to be imported (ID, URL, description, file
     name)
   - The user reviews the preview and confirms to proceed
9. **Temporary Directory Workflow:**
   - The tool creates a temporary directory (`temp_import_{timestamp}/extensions`)
   - Source files matching the filter are copied to the temp directory
   - Hub-specific fields are updated in the temp copies:
     - `hubId` fields are updated to target hub's ID
     - URL origins are replaced using target hub's `EXT_URL`
   - Source files remain completely unmodified
10. The tool executes `dc-cli extension import` to import extensions from the
    temp directory to the target hub.
11. The temporary directory is cleaned up (success or failure).
12. Progress indicators display during file preparation, field updates, and
    import operations.
13. A comprehensive summary is displayed showing:
    - Total files scanned
    - Extensions matched by filter (with IDs)
    - Extensions imported successfully
    - Any errors encountered

## Key Features

- **Intelligent Filtering:** Regex pattern matching across extension ID, URL,
  and description fields
- **Automatic Field Updates:** Hub ID and URL origin fields automatically
  updated for target environment
- **Source Preservation:** Temporary directory workflow ensures source files
  remain unmodified
- **File Validation:** Pre-flight validation with fail-soft error handling
  (invalid files skipped with warnings)
- **Import Preview:** See detailed extension information before finalizing
  import
- **Configurable Defaults:** Default directory and filter pattern via
  environment variables
- **Progress Tracking:** Real-time progress indicators for all operations
- **Cleanup Guarantees:** Temporary directory cleaned up even on failure
- **Cross-Hub Migration:** Seamlessly migrate extensions between different
  environment hubs

## Configuration

### Environment Variables

- **`AMP_DEFAULT_EXTENSION_DIR`** - Default directory for extension import
  (default: `./exports/extensions`)
- **`AMP_DEFAULT_EXTENSION_FILTER`** - Default regex pattern for filtering
  extensions (default: ".*")
- **`AMP_HUB_<HUBNAME>_EXT_URL`** - Required HTTPS URL for the target hub's
  Amplience extensions interface (e.g., `https://prod.amplience.net`)

### Default Locations

- **Source directory:** User-specified or default from
  `AMP_DEFAULT_EXTENSION_DIR`
- **Temporary processing:** `./temp_import_{timestamp}/extensions/`
- **File naming:** Extensions as JSON files following dc-cli convention:
  `{extension-id}.json`

## Prerequisites

- **dc-cli installed:** The tool requires Amplience dc-cli to be installed and
  accessible
- **Hub access:** Valid API credentials for the target hub (configured in .env)
- **EXT_URL configured:** Target hub must have `EXT_URL` configured in .env
- **File system access:** Read permissions for source directory, write
  permissions for temporary directory

## Use Cases

### Use Case 1: Deploy Extensions to Production

**Scenario:** A developer wants to deploy organization extensions from staging
to production.

**Steps:**

1. Run the tool and select "Manage Extensions" → "Import Extensions"
2. Select the production hub as target
3. Specify input directory containing exported staging extensions
4. Enter regex pattern matching organization extensions: `^myorg-.*`
5. Review preview table showing extensions to be imported
6. Confirm import
7. Extensions are automatically updated with production hub ID and URL origins
8. Extensions are imported to production hub

### Use Case 2: Selective Migration

**Scenario:** A DevOps engineer wants to migrate only specific extensions from
development to QA environment.

**Steps:**

1. Run the tool and navigate to "Import Extensions"
2. Select the QA hub as target
3. Specify the directory containing development exports
4. Enter regex pattern matching specific extensions: `feature-.*`
5. Review preview to verify correct extensions selected
6. Confirm import
7. Only matching extensions are updated and imported to QA
8. Source files remain unmodified for future use

### Use Case 3: Restore from Backup

**Scenario:** A system administrator needs to restore extensions from a backup
directory after an incident.

**Steps:**

1. Run the tool and navigate to "Import Extensions"
2. Select the target hub
3. Specify the backup directory containing extensions
4. Use default filter pattern ".*" to import all valid extensions
5. Review preview to confirm all extensions are included
6. Confirm import
7. All valid extensions are restored to the hub
8. Invalid files in backup are skipped with warnings

### Use Case 4: Cross-Environment Deployment

**Scenario:** A content manager wants to deploy a subset of extensions to
multiple environments (DEV, QA, PROD).

**Steps:**

1. Export extensions from source hub to a directory
2. For each target environment:
   - Run the tool and select "Import Extensions"
   - Select the target hub (DEV, QA, or PROD)
   - Specify the source directory
   - Enter filter pattern for desired extensions
   - Review preview and confirm
   - Extensions are imported with environment-specific field updates

## Error Handling

The tool provides clear error messages for:

- **dc-cli not installed:** "dc-cli is not installed or not accessible. Please
  install it first."
- **Hub authentication failure:** "Failed to authenticate with hub. Check your
  credentials."
- **Invalid regex pattern:** "Invalid regex pattern: [error details]. Please
  correct the pattern."
- **Missing EXT_URL:** "Target hub does not have EXT_URL configured. Please add
  AMP_HUB_<HUBNAME>_EXT_URL to your .env file."
- **Invalid EXT_URL:** "Target hub EXT_URL must be a valid HTTPS URL."
- **Directory access error:** "Cannot access directory [path]. Please check path
  and permissions."
- **File validation errors:** "The following files are invalid and will be
  skipped: [file list with error details]."
- **dc-cli execution error:** "Failed to import extensions: [dc-cli error
  details]."
- **Empty results:** "No valid extension files found matching the filter
  pattern."

## Output

- **Console summary:** Shows files scanned, extensions matched, imported count,
  and errors
- **Progress indicators:** Display during file preparation, field updates, and
  import
- **Extensions imported:** Updated in target hub (matching IDs overwrite
  existing)
- **Source preservation:** Original files remain completely unmodified

## Related Commands

- **Export Extensions** - Export extensions from a hub to a directory
- **Delete Extensions** (Coming soon) - Delete extensions from a hub based on
  filters

## Troubleshooting

### Import fails with "EXT_URL not configured"

**Problem:** Target hub doesn't have `EXT_URL` environment variable set.

**Solution:** Add `AMP_HUB_<HUBNAME>_EXT_URL=https://your-hub-url.amplience.net`
to your `.env` file with the correct HTTPS URL for your hub's Amplience
interface.

### Some extensions skipped during import

**Problem:** Invalid JSON files or missing required fields.

**Solution:** Check the warning messages for specific validation errors. Fix or
remove invalid files from source directory. The tool will skip invalid files and
continue with valid ones.

### URL origins not updating correctly

**Problem:** Extensions imported but URL fields still reference old environment.

**Solution:** Verify `EXT_URL` is set correctly for target hub. The tool
replaces URL origins based on this configuration. Check extension JSON to
confirm URLs after import.

### Source files modified after import

**Problem:** Concerned that source files might have been changed.

**Solution:** The tool uses a temporary directory workflow and never modifies
source files. All field updates happen in temp copies only. You can verify by
checking source file timestamps and contents.

### Extensions not appearing in target hub

**Problem:** Import completes successfully but extensions don't appear.

**Solution:** Extensions with matching IDs overwrite existing ones. Check:

- Verify import summary shows successful count
- Check Amplience UI for imported extensions
- Verify hub credentials are correct for target environment
- Check dc-cli output for any warnings

## Technical Details

### Architecture

- **Command layer:**
  `src/commands/manage-extensions/import-extensions/import-extensions.ts` - User
  interface and prompts
- **Action layer:** `src/services/actions/import-extensions.ts` - Business logic
- **Helper functions:**
  - `src/services/actions/import-extensions/run-dc-cli-import.ts` - dc-cli
    integration
  - `src/services/actions/import-extensions/copy-and-prepare-extensions.ts` -
    File preparation
  - `src/services/actions/import-extensions/update-extension-fields.ts` - Field
    updates (hub ID and URL origins)
  - `src/services/actions/import-extensions/build-filter-regex.ts` - Pattern
    compilation
  - `src/services/actions/import-extensions/extension-matches-pattern.ts` -
    Pattern matching
  - `src/services/actions/import-extensions/filter-extensions.ts` - Filter
    orchestration
  - `src/services/actions/import-extensions/validate-extension-file.ts` - File
    validation

### Integration

- Uses `DcCliCommandBuilder` for dc-cli command execution
- Follows existing `promptForHub()` pattern for hub selection
- Integrates with hub configuration for EXT_URL and credentials
- Follows command registration pattern (barrel exports and switch case)
- Uses temporary directory pattern for safe file operations

### Dependencies

- **dc-cli:** For extension import functionality (command: `dc-cli extension
  import <dir> --clientId <id> --clientSecret <secret> --hubId <hubId>`)
- **Node.js fs/promises:** For file operations
- **Inquirer.js:** For user prompts
- **cli-progress:** For progress indicators

### Field Update Logic

**Hub ID Update:**

- Searches for all `hubId` fields in extension JSON
- Replaces with target hub's `hubId` value
- Handles nested objects and arrays recursively

**URL Origin Update:**

- Extracts origin from target hub's `EXT_URL` (e.g.,
  `https://prod.amplience.net`)
- Searches for all URL fields in extension JSON
- Replaces URL origins while preserving paths
- Only updates HTTPS URLs to avoid corrupting other data
- Handles nested objects and arrays recursively

### Test Coverage

- Comprehensive unit tests for all helper functions
- Integration tests for end-to-end workflow
- Error handling tests for all failure scenarios
- Test files co-located with source using `{filename}.test.ts` pattern
- Follows TDD methodology (tests written before implementation)
