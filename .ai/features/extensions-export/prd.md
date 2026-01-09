# PRD: Extensions Export

> **Status**: Draft  
> **Created**: 2026-01-08  
> **Last Updated**: 2026-01-09

---

## Overview

A command-line tool to export Amplience CMS extensions from a hub with intelligent filtering capabilities and flexible handling of existing exports. The tool downloads all extensions to a temporary location, applies regex-based filtering, then strategically manages the target directory based on user-selected mode (full overwrite, selective overwrite, or incremental addition).

## Problem Statement

Users need to bulk export extensions from Amplience CMS hubs for backup, migration, and selective management purposes. The current dc-cli tool provides basic export functionality but lacks:
- Intelligent filtering options beyond basic ID selection
- Smart handling of existing exports (incremental updates, selective overwrites)
- Preview capabilities before finalizing changes
- Pattern-based selection across multiple extension fields

Users need a way to export extensions matching specific patterns without manual post-processing, while preserving flexibility in how existing exports are managed.

## Goals

- Enable users to export all extensions from an Amplience hub
- Provide intelligent filtering based on regex patterns matching extension ID, URL, or description
- Support flexible output directory configuration with sensible defaults (./exports/extensions)
- Offer multiple strategies for handling existing files in the export directory
- Allow users to preview filtered results and mode impact before finalizing export
- Create extensible architecture for future import/delete operations
- Maintain consistency with existing command patterns in the codebase
- Ensure data integrity by validating existing files before operations

## Non-Goals

- Import extensions (future phase)
- Delete extensions (future phase)
- Real-time filtering during API calls (filtering happens after download)
- Migration of extension settings or configurations beyond the extension definitions
- Support for non-regex filtering methods (e.g., interactive selection)
- Automatic repair of corrupted JSON files in export directories

## User Stories

- As a developer, I want to export all extensions from a hub and filter them by organization pattern, so that I can backup only my organization's extensions
- As a DevOps engineer, I want to preview which extensions will be kept before finalizing the export, so that I can verify my regex pattern is correct
- As a content manager, I want to specify a custom output directory, so that I can organize exports by environment or project
- As a system administrator, I want the default filter pattern configurable via .env, so that I can standardize exports across my team
- As a developer updating an existing export, I want to download only missing extensions, so that I can save time on incremental backups
- As a content manager with mixed directories, I want to overwrite only matching extensions, so that I can preserve other files in the export directory

## Functional Requirements

### FR-1: Hub Selection

Display list of configured hubs from app configuration. User selects target hub for extension export. Follow existing `promptForHub()` pattern from other commands.

### FR-2: Output Directory Configuration

Prompt user for output directory with default value `./exports/extensions`. Support both relative and absolute paths. Validate directory accessibility before proceeding.

### FR-3: Existing File Detection and Validation

After directory path is provided, check if directory exists and contains files. If files exist:
- Attempt to validate each file (JSON parsing, structure check)
- If any file is corrupted, invalid JSON, or has permission issues: stop execution with error message listing problematic files
- User must fix or clean directory manually before re-running command
- If all files are valid or directory is empty: proceed to next step

### FR-4: Export Mode Selection

If existing files detected in directory, prompt user to select handling mode:
- **Full overwrite**: Delete all existing files, export all filtered extensions fresh
- **Overwrite matching only**: Keep existing non-matching files, re-download and overwrite only extensions matching the regex pattern
- **Get missing only**: Keep all existing files, add only extensions not already present (compare hub extension IDs with local filenames)

If directory is empty or doesn't exist, skip mode selection and proceed with standard export.

### FR-5: Regex Pattern Configuration

Prompt user for regex pattern to filter extensions, with default value configurable via `AMP_DEFAULT_EXTENSION_FILTER` environment variable (defaulting to "XXXX" if not set). Pattern matches against extension ID, URL, and description fields.

### FR-6: Preview/Direct Execution Mode

Prompt user to choose between:
- **Preview mode**: Display mode-specific preview information and require confirmation before executing
  - Full overwrite: Show "X existing files will be deleted, Y matching extensions will be exported"
  - Overwrite matching: Show "Y matching files will be updated, Z non-matching files will be kept"
  - Get missing: Show "N new extensions will be added, M existing files unchanged"
- **Direct execution**: Apply filter and execute immediately without preview

### FR-7: Download All Extensions

Execute `dc-cli extension export` command to download all extensions from selected hub to temporary location. Use `DcCliCommandBuilder` pattern for authentication and command execution.

### FR-8: Extension Filtering and Mode Execution

Apply regex pattern and execute based on selected mode:
- **Full overwrite**: Clear target directory, copy all matching extensions from temp to target
- **Overwrite matching**: Fetch hub extension list via API, filter by regex in temp, copy only matching to target (preserving non-matching existing files)
- **Get missing**: Compare hub extension IDs with existing local filenames (e.g., "my-ext-123.json"), download only extensions with IDs not present locally

Pattern matches against extension ID, URL, and description fields. Keep extensions where any field matches the regex.

### FR-9: Progress Indication

Display progress indicators during:
- Fetching extension list from hub
- Extension download from hub to temp location
- Pattern matching and filtering
- File operations (copy/delete based on mode)

### FR-10: Result Summary

Display mode-specific summary:
- **Full overwrite**: Total extensions downloaded, extensions kept after filtering (with IDs), extensions removed (count), final export directory path
- **Overwrite matching**: Total extensions fetched, matching extensions updated (with IDs), non-matching files preserved (count), final export directory path
- **Get missing**: Total extensions in hub, new extensions added (with IDs), existing extensions unchanged (count), final export directory path

### FR-11: Menu Integration

Add "Manage Extensions" menu item to main command menu. Opens submenu with:
- Export Extensions (current feature)
- Import Extensions (placeholder for future - display "Coming soon" message)
- Delete Extensions (placeholder for future - display "Coming soon" message)

### FR-12: Error Handling

Handle and display user-friendly errors for:
- dc-cli not installed or unavailable
- Hub authentication failures
- Invalid regex patterns (syntax errors)
- File system permission issues
- Corrupted or invalid JSON files in export directory (fail fast with file list)
- Empty extension results from hub
- Network connectivity issues during download

## Technical Considerations

**Technology Stack:**
- TypeScript with Node.js v22+
- dc-cli integration via `DcCliCommandBuilder` from `utils/dc-cli-executor.ts`
- Inquirer.js for user prompts
- cli-progress for progress indicators
- Native Node.js `fs` and `fs/promises` modules for file operations
- Native Node.js `fetch` for Amplience API calls (extension list retrieval)

**Architecture Pattern:**
- Command layer: `src/commands/manage-extensions/manage-extensions.ts` (menu orchestrator) and `src/commands/manage-extensions/export-extensions.ts` (export command UI)
- Action layer: `src/services/actions/export-extensions.ts` for business logic
- Shared utilities: `src/commands/shared/` for common prompt patterns
- Utility functions: File validation, JSON parsing, extension ID extraction in `utils/`

**Integration Points:**
- Uses existing `DcCliCommandBuilder` for dc-cli command execution
- Follows existing `promptForHub()` pattern for hub selection
- Integrates with .env configuration for default filter pattern
- Follows command registration pattern (barrel exports in `commands/index.ts` and switch case in `index.ts`)
- May require Amplience API client for fetching extension list (in "Overwrite matching" and "Get missing" modes)

**File System:**
- Temporary download location: `./temp_export_{timestamp}/extensions/` (created per execution)
- Final export location: user-specified or default `./exports/extensions`
- Extensions exported as JSON files following dc-cli naming convention: `{extension-id}.json`
- File validation: JSON.parse with try-catch, check for required extension fields

**Environment Configuration:**
- `AMP_DEFAULT_EXTENSION_FILTER` — Default regex pattern for filtering (default: "XXXX")

**dc-cli Command Usage:**
- Export: `dc-cli extension export <dir> --clientId <id> --clientSecret <secret> --hubId <hub>`
- Downloads all extensions as individual JSON files named by extension ID

**Extensibility Considerations:**
- Submenu structure allows future addition of import/delete operations
- Action layer designed to be reusable by future import/restore commands
- Filtering logic extracted to utility function for reuse across extension operations
- Mode selection pattern can be adapted for import operations (merge vs replace strategies)

**Error Handling Strategy:**
- Fail fast on corrupted files to maintain data integrity
- Graceful degradation not applicable (integrity is paramount)
- Clear error messages with actionable guidance (e.g., "Remove or fix file X before retrying")

## Acceptance Criteria

- [ ] AC-1: User can select a hub from configured list
- [ ] AC-2: User can specify output directory (default: ./exports/extensions)
- [ ] AC-3: Command checks for existing files in target directory after path prompt
- [ ] AC-4: Command validates all existing files (JSON parsing) and fails with error list if any are invalid
- [ ] AC-5: If existing files detected, user is prompted to select mode (Full overwrite / Overwrite matching / Get missing)
- [ ] AC-6: User can enter regex pattern (default from .env or "XXXX")
- [ ] AC-7: User can choose preview mode to see mode-specific impact before execution
- [ ] AC-8: User can choose direct execution to skip preview
- [ ] AC-9: In Full overwrite mode, all existing files are deleted and all matching extensions are exported fresh
- [ ] AC-10: In Overwrite matching mode, only matching extensions are updated, non-matching existing files are preserved
- [ ] AC-11: In Get missing mode, only extensions with IDs not present locally are added
- [ ] AC-12: All extensions are downloaded from selected hub to temporary location
- [ ] AC-13: Extensions are filtered by matching pattern against ID, URL, or description
- [ ] AC-14: Progress indicators display during API calls, download, and file operations
- [ ] AC-15: Mode-specific summary displays appropriate counts and extension IDs
- [ ] AC-16: "Manage Extensions" appears in main menu with submenu (Export / Import placeholder / Delete placeholder)
- [ ] AC-17: Command handles dc-cli not installed error gracefully
- [ ] AC-18: Command handles invalid regex pattern with clear error message
- [ ] AC-19: Command fails fast with clear error if corrupted files detected in export directory
- [ ] AC-20: Extensions are named by extension ID following dc-cli convention

## Open Questions

None
