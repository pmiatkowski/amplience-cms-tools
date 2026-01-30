# PRD: Copy Content Types Schema Filter

> **Status**: Draft
> **Created**: 2026-01-30
> **Last Updated**: 2026-01-30

---

## Overview

Add interactive schema ID filtering capability to the copy-content-types command, allowing users to filter content types by schema ID using regex patterns before selection. This brings feature parity with the hierarchy sync command's filtering experience while improving efficiency when working with large content type libraries.

## Problem Statement

The copy-content-types command currently displays all missing content types without any filtering capability. When working with hubs containing many content types, users must manually scroll through potentially hundreds of items to find the ones they need. The hierarchy sync command already has schema ID filtering via `prompt-for-hierarchy-filters.ts`, but this pattern hasn't been applied to the copy-content-types workflow.

## Goals

- Enable users to filter content types by schema ID using regex patterns during interactive prompting
- Provide consistent UX with existing filtering patterns (e.g., `prompt-for-hierarchy-filters.ts`)
- Support environment variable defaults for repeated filtering workflows
- Improve user productivity when working with large content type libraries

## Non-Goals

- Adding filtering to non-interactive/batch mode execution
- Filtering by other content type properties (name, label, etc.)
- Persisting filter preferences beyond environment variables
- Adding filtering to other commands (out of scope for this feature)

## Functional Requirements

### FR-1: Schema ID Filter Prompt Integration

Integrate the schema ID filter prompt into the copy-content-types command flow. The filter should be applied after fetching content types from the source hub but before displaying the selection list to the user. The filter operates on the `missingContentTypes` array before `promptForContentTypesToSync` is called.

### FR-2: Modify Existing `promptForSchemaIdFilter` Function

Update the existing `promptForSchemaIdFilter` function to accept an optional default value parameter via the signature `promptForSchemaIdFilter({ defaultValue?: string })`. This allows callers to control whether a default value is used. The prompt message should be updated to: "Filter by schema ID (leave blank for any):"

### FR-3: Environment Variable Default Support

Support `AMP_DEFAULT_SCHEMA_ID` environment variable as the default value for the filter prompt. The caller (copy-content-types command) passes this default to the modified `promptForSchemaIdFilter` function, maintaining consistency with existing patterns.

### FR-4: Empty Input Handling

When the user provides empty/blank input to the filter prompt, no filtering is applied and all content types are shown. The filter step is effectively skipped.

### FR-5: Invalid Regex Handling

When the user enters an invalid regex pattern, display the error message "Invalid regex pattern" and re-prompt the user to enter a valid pattern. Continue re-prompting until a valid pattern or empty input is provided.

### FR-6: Filter Summary Display

After applying the filter, display a brief summary showing the filtering results in the format: "Filtered to X of Y content types" where X is the number of matched content types and Y is the total before filtering. This summary appears before the selection prompt.

## Technical Considerations

**Tech Stack:**

- TypeScript v5+ with Node.js v22+
- Inquirer.js for CLI interaction
- Vitest for testing

**Architecture:**

- Follows Command → Action pattern per project guidelines
- Modifications to `promptForSchemaIdFilter` in `src/prompts/prompt-for-schema-id-filter.ts`
- Integration point in `src/commands/copy-content-types/copy-content-types.ts`

**Integration Points:**

- Reuse and modify existing `promptForSchemaIdFilter` function
- Reference `prompt-for-hierarchy-filters.ts` for pattern consistency
- Environment variable loading via existing dotenv configuration

**Backwards Compatibility:**

- The `defaultValue` parameter is optional, so existing callers continue to work unchanged
- No breaking changes to existing command behavior when filter is empty

## Acceptance Criteria

- [ ] AC-1: User can enter a regex pattern to filter content types by schema ID
- [ ] AC-2: Filter is applied after fetching but before the selection list is displayed
- [ ] AC-3: Empty filter input shows all content types without filtering
- [ ] AC-4: Invalid regex shows error message and re-prompts the user
- [ ] AC-5: Environment variable `AMP_DEFAULT_SCHEMA_ID` is used as default when passed by caller
- [ ] AC-6: Summary "Filtered to X of Y content types" is displayed after filtering
- [ ] AC-7: Prompt message reads "Filter by schema ID (leave blank for any):"
- [ ] AC-8: Existing callers of `promptForSchemaIdFilter` continue to work without changes
- [ ] AC-9: Unit tests cover: filter application, empty input handling, invalid regex handling, and summary output

## Open Questions

None — all requirements clarified through Q&A rounds.
