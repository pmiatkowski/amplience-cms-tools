# PRD: VSE Bulk Visualizations

> **Status**: Draft
> **Created**: 2026-01-16
> **Last Updated**: 2026-01-16

---

## Overview

Add a new "VSE Management" command to the Amplience CMS Tools CLI that enables bulk updating of content type visualizations across hubs using predefined JSON configurations. The feature automates the manual, repetitive process of configuring visualizations through the UI, with automatic URL origin replacement based on hub-specific environment variables.

## Problem Statement

Manual visualization management for content types across multiple hubs is time-consuming, error-prone, and leads to environment drift. As teams scale their content types and adopt Virtual Staging Environments (VSE), the current manual approach through the Amplience UI becomes unsustainable. Content editors experience broken previews when visualizations are incorrectly configured, and environments become inconsistent over time. Teams currently lack a systematic approach to maintain visualization configurations across development, staging, and production hubs.

## Goals

- **Eliminate repetitive manual work**: Enable bulk updates of visualizations across multiple content types in a single operation
- **Ensure environment consistency**: Provide hub-specific URL configuration to prevent environment drift
- **Improve time efficiency**: Reduce visualization configuration time from hours to minutes (e.g., 2 hours → 10 minutes)
- **Enable configuration as code**: Support version-controlled JSON configuration files for visualization settings
- **Integrate with existing workflow**: Extend the CLI tool that developers and DevOps teams already use daily

## Non-Goals

- **Other VSE operations**: Management of VSE settings beyond visualizations (future consideration)
- **Export functionality**: Dumping current visualization configs to files (nice-to-have for future)
- **Real-time synchronization**: Automatic syncing of visualizations across hubs without user trigger
- **UI-based interface**: This is a CLI-only feature; no web interface planned
- **Visualization preview rendering**: No in-tool preview of how visualizations will appear

## User Stories

- As a **developer**, I want to bulk update content type visualizations during releases, so that I can ensure all content types have correct preview URLs without manual UI clicks
- As a **DevOps engineer**, I want to configure visualizations from a JSON file during hub setup, so that new environments are configured consistently with existing ones
- As a **content team lead**, I want visualization configurations to be version-controlled, so that changes can be tracked and rolled back if needed
- As a **technical user**, I want to preview changes before applying them (dry-run), so that I can validate configurations without risk

## Functional Requirements

### FR-1: VSE Management parent command

Create a new top-level command "VSE Management" that appears in the main CLI menu. This serves as a parent command for all VSE-related operations, with "Bulk visualizations update" as the first sub-command.

### FR-2: Content type selection by API filtering

Allow users to select content types by providing a regular expression pattern (defaults to `AMP_DEFAULT_SCHEMA_ID` env var). Display content types in a multiselect prompt formatted as `[label] (contentTypeUri)`. Fetch content types via Amplience API and filter by the provided pattern.

### FR-3: Content type selection by file

Allow users to provide a JSON file containing an array of content type URIs (format: `["https://schema.example.com/type1.json", ...]`). Default file location from `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE` env var. Validate JSON structure before proceeding.

### FR-4: Visualization configuration file

Accept a JSON configuration file containing complete visualization objects that will replace existing visualizations. Configuration structure: `{ "visualizations": [{ "label": "...", "templatedUri": "...", "default": true }] }`. Default file location from `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE` env var.

### FR-5: URL origin replacement with placeholders

Replace placeholder string `{{ORIGIN_REPLACE}}` in `templatedUri` properties with hub-specific URLs from environment variables (`AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`). Preserve all other parts of the URL including path, query parameters, and other template variables (e.g., `{{contentItemId}}`).

### FR-6: Environment validation

Validate that `AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL` exists for the selected hub before proceeding. Abort operation with clear error message if env var is missing.

### FR-7: Confirmation summary

Display a summary before execution showing:
- List of selected content types with labels and URIs
- Visualization configuration with parsed/replaced origin URLs
- Target hub name
- Total number of content types to be updated

Require explicit user confirmation to proceed.

### FR-8: Bulk API updates with progress tracking

Update content types using `PATCH /content-types/{contentTypeId}` API endpoint. Display a progress bar during execution showing real-time progress (e.g., "Updating 5/20 content types..."). Continue processing all content types even if individual updates fail.

### FR-9: Error handling and partial failures

Continue processing all content types when individual updates fail. Collect all errors with context (content type URI, error message, HTTP status if applicable). Generate detailed failure information in the final report.

### FR-10: Dry-run mode

Support dry-run mode that simulates the operation without making actual API calls. Show what would be updated (content types, visualization configs, parsed URLs) without modifying any data. Follow existing CLI tool patterns for dry-run implementation.

### FR-11: Markdown report generation

Generate a detailed markdown report in `reports/` directory after each operation (both dry-run and live). Include:
- Operation summary (timestamp, hub, mode, filters)
- Success and failure counts
- Total execution time
- Item-by-item results with content type details
- Full error messages for failures

Follow existing CLI tool report format patterns.

## Technical Considerations

**Architecture Integration:**
- Follow the Command-Action pattern: command in `src/commands/vse-management/`, action in `src/services/actions/`
- Command handles user prompts and orchestration
- Action handles API calls and business logic
- Use shared utilities from `commands/shared/` where applicable

**Tech Stack:**
- TypeScript 5+ with strict mode enabled
- Node.js v22+ runtime
- Inquirer.js for interactive prompts
- cli-progress for progress bar (`createProgressBar()` utility)
- Native fetch for API calls via `AmplienceService`
- Vitest for testing

**API Integration:**
- All API calls through `AmplienceService` class (handles OAuth and PAT authentication)
- Use existing `PATCH /content-types/{contentTypeId}` endpoint
- Leverage existing authentication patterns (no new auth implementation needed)

**Environment Variables:**
- `AMP_DEFAULT_SCHEMA_ID`: Default regex pattern for content type filtering
- `AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE`: Default path to content types list JSON file
- `AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE`: Default path to visualization config JSON file
- `AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`: Hub-specific visualization app URLs (e.g., `https://vse.mycompany.com`)

**Code Patterns to Follow:**
- Use `createProgressBar(total)` for bulk operations (see CLAUDE.md common patterns)
- Generate markdown reports in `reports/` directory
- Implement dry-run mode with confirmation prompts
- Use barrel exports (`index.ts`) for clean imports
- Import aliases: `~/` maps to `src/`
- Kebab-case file naming convention

**Dependencies:**
- No new external dependencies required
- Leverage existing utilities: `createProgressBar()`, `displayTable()`, report generation
- Use existing `AmplienceService` for API authentication and requests

**Integration Points:**
- Add command export to `src/commands/index.ts`
- Add command case to `src/index.ts` switch statement
- Create documentation in `docs/vse-management.md`
- Update main README.md with command description

## Acceptance Criteria

- [ ] AC-1: User can access "VSE Management" command from main CLI menu
- [ ] AC-2: User can select "Bulk visualizations update" sub-command
- [ ] AC-3: User can select content types by API filtering with regex pattern
- [ ] AC-4: User can select content types by providing a JSON file with URI array
- [ ] AC-5: User can specify visualization configuration JSON file path
- [ ] AC-6: System replaces `{{ORIGIN_REPLACE}}` placeholder with hub-specific URL from env var
- [ ] AC-7: System validates hub-specific env var exists and aborts if missing
- [ ] AC-8: User sees confirmation summary showing content types, config, and target hub before execution
- [ ] AC-9: System displays progress bar during bulk updates showing current progress (e.g., "5/20")
- [ ] AC-10: System continues processing all content types even when individual updates fail
- [ ] AC-11: System generates markdown report with success/failure counts and detailed results
- [ ] AC-12: Dry-run mode shows what would be updated without making actual changes
- [ ] AC-13: Reports include operation summary, timing, item-by-item results, and error details
- [ ] AC-14: System preserves path and query parameters in `templatedUri` during URL replacement
- [ ] AC-15: Content type selection by API shows items formatted as `[label] (contentTypeUri)`

## Open Questions

**Important (should resolve during implementation):**
- What is the exact structure of visualization objects in content types? (Validate against actual Amplience API response during implementation)
- Should error reporting distinguish between different failure types (network errors, validation errors, permission errors)? (Follow existing CLI error handling patterns)
- Should the progress bar show estimated time remaining or just count progress? (Follow existing `createProgressBar()` utility behavior)

**Nice to know:**
- Could this be extended to other VSE operations beyond visualizations in the future? (Defer for future consideration)
- Should there be an export function to dump current visualization configs? (Nice-to-have for future enhancement)
- Should the tool support YAML config files in addition to JSON? (Out of scope for initial implementation)
