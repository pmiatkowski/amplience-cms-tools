# PRD: VSE Default Files Initialization

> **Status**: Draft
> **Created**: 2026-01-16
> **Last Updated**: 2026-01-16

---

## Overview

Add a new "Initialize Default Files" subcommand to the VSE Management command that helps users set up their visualization configuration files. This subcommand provides example file content and validates file existence, making it easier for users to get started with VSE bulk operations.

## Problem Statement

Users want to use the VSE Management bulk operations but face a chicken-and-egg problem: they need configuration files (`content-types.json` and `visualizations.json`) to run the commands, but there's no easy way to create these files with the correct format. Users must manually figure out the JSON structure from documentation, which creates friction and potential for errors.

## Goals

- Provide an easy way for users to see the correct file format and example content
- Validate existing configuration files when environment variables are set
- Display helpful instructions when environment variables are not configured
- Keep all VSE-related functionality organized within the existing VSE Management command

## Non-Goals

- Creating or modifying files automatically (non-destructive, informational only)
- Modifying existing `.env` files
- Fetching actual content types from the API (this is handled by other commands)
- Validating JSON content of existing files (only checks existence)

## User Stories

- As a new user, I want to see example configuration files, so that I can create my VSE setup files correctly
- As an existing user, I want to verify my configuration files exist, so that I can confirm my setup before running bulk operations

## Functional Requirements

### FR-1: VSE Subcommand Integration

Add "Initialize Default Files" as a new option in the VSE Management operation menu. This follows the existing pattern where operations like "Bulk Update Visualizations" are selected from a menu.

### FR-2: Environment Variable Detection

Detect whether the following environment variables are set:
- `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE`
- `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE`

### FR-3: Missing Environment Variables Behavior

When environment variables are NOT set, display text instructions to the console including:
- Environment variable name
- Recommended default file path (`./config/content-types.json` and `./config/visualizations.json`)
- Complete example file content with proper JSON formatting
- Brief explanation of each file's purpose

### FR-4: Existing Environment Variables Behavior

When environment variables ARE set, validate that the referenced files exist:
- Check file existence at the configured paths
- Display status: "✓ Found" for existing files, "✗ Missing" for non-existent files
- For missing files: display instructions to create them with example content

### FR-5: Visualizations Config Example Content

The `visualizations.json` example must include two visualization definitions:
1. **Preview**: Basic preview with `{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}` (default: true)
2. **Live View**: Live view with `{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}`

This matches the documentation example in `docs/vse-management.md`.

### FR-6: Content Types List Example Content

The `content-types.json` example must include an array of mock content type URIs:
- `https://schema.example.com/product.json`
- `https://schema.example.com/category.json`

These serve as format examples that users will replace with their actual content type URIs.

## Technical Considerations

- Must follow the existing VSE Management subcommand pattern in `src/commands/vse-management/`
- Create new subdirectory: `src/commands/vse-management/init-default-files/`
- Update `src/commands/vse-management/prompts/prompt-for-vse-operation.ts` to add the new option
- Update the `VseOperationChoice` type to include `'init-default-files'`
- Update `src/commands/vse-management/vse-management.ts` to handle the new operation
- Use console.log for text instruction display (no file creation)
- Use Node.js `fs.existsSync()` for file existence validation
- Example content should be stored as template strings or constants for maintainability

## Acceptance Criteria

- [ ] AC-1: VSE Management menu shows "Initialize Default Files" option
- [ ] AC-2: When env vars not set, displays instructions with env names, file paths, and complete example content
- [ ] AC-3: When env vars set and files exist, displays "✓ Found" status for each file
- [ ] AC-4: When env vars set and files missing, displays "✗ Missing" with example content
- [ ] AC-5: Visualizations example includes Preview and Live View definitions matching docs
- [ ] AC-6: Content types example includes mock URIs in proper JSON array format
- [ ] AC-7: No files are created or modified by this subcommand

## Open Questions

None
