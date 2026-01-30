# Feature Request: copy-content-types-schema-filter

## Description

Copy content type command does not have filtering embedded in the interactive prompting. I want to be able to filter out specific content-types by filtering by schema id using regexp, similar to the filtering as prompt-for-hierarchy-filters.ts - only schemaId.

## Created

2026-01-30

## Clarifications

### Round 1

#### Q1: Where in the command flow should the schema ID filter be applied?

User: After fetching but before displaying the selection list — filter the `missingContentTypes` array before `promptForContentTypesToSync`

#### Q2: Should the schema ID filter prompt have a default value?

User: Default from environment variable (`AMP_DEFAULT_SCHEMA_ID`) — consistent with existing patterns in prompt-for-hierarchy-filters.ts

#### Q3: How should the filter handle empty/blank input?

User: Empty = no filtering — show all content types (skip filter entirely)

#### Q4: Should the filter show a summary of matched/filtered items after applying the pattern?

User: Brief summary — show "Filtered to X of Y content types" before selection

### Round 2

#### Q1: Should this feature reuse existing `promptForSchemaIdFilter` or create a new prompt?

User: Modify existing `promptForSchemaIdFilter` to add `AMP_DEFAULT_SCHEMA_ID` default and reuse it

#### Q2: What should the prompt message say?

User: Update to match hierarchy style: "Filter by schema ID (leave blank for any):"

#### Q3: Should modifying `promptForSchemaIdFilter` change the default for ALL commands or be opt-in?

User: Pass default as parameter — `promptForSchemaIdFilter({ defaultValue?: string })`, caller controls

#### Q4: What should happen if the regex pattern is invalid?

User: Show error and re-prompt — Display "Invalid regex pattern" and ask again

#### Q5: Should the feature include unit tests for the new filtering logic?

User: Yes, full test coverage — Tests for filter application, empty input, invalid regex, summary output
