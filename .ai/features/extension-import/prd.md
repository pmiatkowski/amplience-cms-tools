# PRD: Extension Import

> **Status**: Draft
> **Created**: 2026-01-09
> **Last Updated**: 2026-01-09

---

## Overview

Add import functionality to the manage-extensions command, allowing users to upload previously exported extensions from local filesystem to a target Amplience hub. This completes the export/import cycle for extension management, enabling users to migrate extensions between environments (dev → staging → prod).

## Problem Statement

Users can currently export extensions from Amplience hubs to their local filesystem, but there is no way to import those exported extensions back into a target hub. This prevents users from:
- Migrating extensions between environments
- Backing up and restoring extensions
- Sharing extension configurations across teams
- Automating extension deployment workflows

## Goals

- Enable users to import extensions from local filesystem to any configured hub
- Automatically update hub-specific fields (hubId, URL origins) for the target environment
- Provide filtering capability to selectively import extensions
- Show preview of extensions before import with confirmation prompt
- Maintain consistency with the existing export flow UX and patterns

## Non-Goals

- Importing extensions from sources other than local filesystem (e.g., remote URLs, git repositories)
- Creating new extensions from scratch (covered by Amplience UI)
- Deleting extensions (separate future feature)
- Version control or conflict resolution beyond overwrite strategy

## User Stories

- As a developer, I want to import extensions from local filesystem to a target hub, so that I can deploy extensions to different environments
- As a developer, I want extensions to be automatically updated with target hub details, so that I don't have to manually edit JSON files
- As a developer, I want to preview extensions before import, so that I can verify which extensions will be uploaded
- As a developer, I want to filter extensions by pattern, so that I can selectively import specific extensions

## Functional Requirements

### FR-1: Hub Selection

User selects target hub from configured hubs in `.env` file. System validates hub configuration and authentication before proceeding.

### FR-2: Source Directory Selection

User specifies source directory containing extension JSON files. System defaults to the same directory used by export command (`./extensions` or environment variable `AMP_DEFAULT_EXTENSION_DIR`). System validates directory exists and is readable.

### FR-3: Extension Filtering

User provides regex pattern to filter extensions. System defaults to environment variable `AMP_DEFAULT_EXTENSION_FILTER` if set. Only extensions matching the pattern are imported. Non-matching extensions are excluded from import.

### FR-4: Temp Directory Workflow

System copies source files to temporary directory (`temp_import_{timestamp}/extensions`), applies filtering, modifies hub-specific fields in temp copies, then imports from temp directory. Original source files remain unmodified.

### FR-5: Hub-Specific Field Updates

For each extension file in temp directory, system automatically updates:
- `hubId` field with target hub's hub ID
- URL `origin` fields based on target hub's `EXT_URL` environment variable

This ensures extensions reference the correct hub after import.

### FR-6: File Validation

System validates each extension JSON file individually before import:
- Check JSON syntax is valid
- Check required extension fields are present
- Skip invalid files with warning
- Continue importing remaining valid files

This resilient approach prevents one corrupted file from blocking the entire import.

### FR-7: Preview and Confirmation

Before importing, system displays preview table showing:
- Extension ID
- Extension URL
- Extension description
- File name

Shows count of matching vs total extensions. User must explicitly confirm before import proceeds.

### FR-8: Import Execution

System uses dc-cli `extension import <dir>` command to upload extensions from temp directory to target hub. Extensions with matching IDs overwrite existing extensions in the hub (dc-cli default behavior).

### FR-9: Progress Tracking

During import, system displays progress bar showing current file being processed and overall progress. Consistent with other bulk operations in the tool.

### FR-10: Import Summary

After completion, system displays summary including:
- Total files in source directory
- Total files matched by pattern
- Total files successfully imported
- Any validation errors or warnings
- Target hub details

## Technical Considerations

**Based on Global Tech Stack:**
- Use TypeScript with strict mode
- Use Inquirer.js for interactive prompts
- Use cli-progress for progress bars
- Use native Node.js `fs/promises` for file operations
- Use winston for logging

**Architecture Pattern:**
- Follow Command → Action pattern
- Command layer: `src/commands/manage-extensions/import-extensions/import-extensions.ts`
- Action layer: `src/services/actions/import-extensions.ts`
- Mirror export-extensions structure for consistency

**DC-CLI Integration:**
- Use `src/utils/dc-cli-executor.ts` (existing utility) to execute dc-cli commands
- Command: `dc-cli extension import <dir> --clientId <id> --clientSecret <secret> --hubId <hubId>`
- Check dc-cli availability before proceeding (like export flow)
- Handle dc-cli authentication errors gracefully

**Hub Configuration:**
- Read from `AMP_HUB_*` environment variables
- Require `EXT_URL` field for target hub (used to update extension URL origins)
- Support both OAuth and PAT authentication methods

**File Operations:**
- Preserve source files by using temp directory pattern
- Temp directory: `./temp_import_{timestamp}/extensions`
- Clean up temp directory after import completes (success or failure)

**Error Handling:**
- Create custom error classes (mirror export: `ImportExtensionsError`, `InvalidPatternError`, etc.)
- Handle directory access errors
- Handle dc-cli execution errors
- Handle authentication errors
- Show user-friendly error messages in command layer

## Acceptance Criteria

- [ ] AC-1: User can select target hub from configured hubs
- [ ] AC-2: User can specify source directory (with default to export directory)
- [ ] AC-3: User can provide regex pattern to filter extensions
- [ ] AC-4: System validates extension JSON files individually and skips invalid ones
- [ ] AC-5: System displays preview table with extension details before import
- [ ] AC-6: User must confirm preview before import proceeds
- [ ] AC-7: System automatically updates hubId and URL origin fields for target hub
- [ ] AC-8: System uses temp directory workflow, preserving original source files
- [ ] AC-9: System imports extensions using dc-cli command
- [ ] AC-10: Existing extensions with same ID are overwritten
- [ ] AC-11: System displays progress bar during import
- [ ] AC-12: System displays comprehensive summary after import completes
- [ ] AC-13: System handles authentication errors with clear messages
- [ ] AC-14: System cleans up temp directory after completion
- [ ] AC-15: Import option is enabled in manage-extensions menu (remove "disabled: true")

## Open Questions

None
