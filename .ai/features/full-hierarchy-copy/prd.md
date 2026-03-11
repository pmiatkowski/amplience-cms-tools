# PRD: Full Hierarchy Copy with Embedded Content

> **Status**: Draft **Created**: 2026-03-11 **Last Updated**: 2026-03-11

---

## Overview

Extend the existing `recreate-content-items` command to fully copy hierarchy
trees including deeply nested embedded content items (Content Links, Content
References). Currently, the tool logs embedded content for manual handling. This
feature automates recursive discovery, validation, and creation of all
referenced content items across hubs, preserving folder structure and preventing
infinite loops from circular references.

## Problem Statement

When copying hierarchy items between Amplience hubs, embedded content items
(Content Links and Content References) are not processed — they are logged with
a note to "update manually." This forces operators to manually identify, create,
and re-link every embedded item, which is error-prone and time-consuming for
deep hierarchies. There is no automated way to copy a complete hierarchy tree
with all its dependencies intact.

## Goals

- Automatically discover and copy all embedded content items (Content Links and
  Content References) when copying hierarchy trees
- Preserve the full dependency graph so copied content items are correctly
  linked in the target hub
- Mirror the source folder structure in the target repository for all embedded
  content items
- Validate schema and content type compatibility between source and target hubs
  before any content is created
- Provide clear progress feedback and a detailed operation report

## Non-Goals

- Copying truly inline content (literal JSON embedded directly in the parent
  body without a separate CMS item) as separate items — this content is already
  part of the parent body and requires no separate handling. Note: Inline
  Content Links (`inline-content-link`) ARE processed, as they reference
  separate CMS items by ID.
- Modifying or merging content during copy (this is a faithful replication, not
  a content transformation tool)
- Handling schema migration or drift resolution — validation will fail-fast if
  schemas don't match
- Supporting cross-repository copy within the same hub (this is a cross-hub
  operation)
- Automating schema or content type creation in the target hub — these must
  already exist

## User Stories

- As a content operations manager, I want to copy an entire hierarchy tree
  (including all embedded content) from one hub to another, so that I can
  replicate content environments without manual re-linking.
- As a developer, I want the tool to validate schema compatibility before
  copying, so that I don't end up with partially copied content and broken
  references.
- As a content operator, I want to choose how duplicates are handled (skip,
  update, or rename), so that I can control behavior when content already exists
  in the target hub.

## Functional Requirements

### FR-1: Recursive Embedded Content Discovery

The tool must recursively traverse the body of each content item to discover all
embedded Content Links, Content References, and Inline Content Links (identified
by `inline-content-link` `$ref` pattern in schemas). Discovery must handle:

- Single embedded content objects (identified by `_meta.schema` property)
- Arrays of embedded content items
- Nested embeddings (embedded items containing their own embedded items)
- Mixed structures combining hierarchy children and embedded content

Inline Content (content embedded directly without a separate CMS item) must be
detected and skipped — it does not require separate copying.

If a referenced content item cannot be fetched from the source (deleted or
archived), the reference ID is preserved as-is in the body and a warning is
logged in the operation report.

### FR-2: Circular Reference Detection

The tool must track all processed content item IDs in a Set and skip any item
that has already been processed. This prevents infinite loops when content items
form circular reference chains (e.g., Item A links to Item B, which links back
to Item A).

### FR-3: Pre-Operation Validation

Before any content is copied, the tool must validate:

1. All content-type-schemas referenced by items in the hierarchy exist in both
   source and target hubs and are not archived
2. All content-types referenced by items exist in both source and target hubs
   and are not archived
3. Content type schemas are identical between hubs (same `schemaId` URI AND same
   schema body JSON via deep equality after normalization). Normalization: sort
   object keys alphabetically, strip hub-specific CMS metadata fields (`id`,
   `version`, `createdBy`, `createdDate`, `lastModifiedBy`, `lastModifiedDate`),
   then compare.

If validation fails, the operation must abort with a clear report of mismatches.

### FR-4: Duplicate Handling Strategy

Before the operation begins, the user must select a strategy for handling items
that already exist in the target repository:

- **Skip existing**: Do not modify the target item; use the existing target
  item's ID for linking
- **Update existing**: Overwrite the target item's body entirely with the source
  item's body
- **Rename duplicates**: Create a new item with a numeric suffix appended to the
  label (e.g., `My Item (1)`, `My Item (2)`), incrementing if a suffix already
  exists

Duplicate detection is based on **label match within the same folder path** in
the target repository. Items with the same label in the same target folder are
considered duplicates.

### FR-5: Folder Structure Mirroring

Each embedded content item must be created in the target repository in a folder
that mirrors the source item's folder path. If the target folder structure does
not exist, the necessary folders must be created to match the source.

Only items within the same source repository as the hierarchy root are copied.
Embedded references pointing to items in a different source repository are
logged as warnings in the operation report, and their reference IDs are left
unchanged (pointing to source IDs).

### FR-6: Dependency-Ordered Creation

Content items must be created in dependency order (leaf items first, then items
that reference them). After creating an embedded item in the target hub, all
references pointing to the source item's ID must be updated to use the newly
created target item's ID.

### FR-7: Error Handling and Retry

Failed item creations and updates must be retried up to 3 times with exponential
backoff. For update failures caused by version conflicts (HTTP 409), re-fetch
the target item to obtain the current version before retrying. If an item still
fails after retries:

- Log the failure
- Skip any items that depend on the failed item
- Continue processing remaining items
- Report all failures at the end of the operation

### FR-8: Two-Phase Progress Reporting

Progress must be reported in two phases:

- **Phase 1 (Discovery)**: A spinner while the tool discovers all items in the
  hierarchy and all embedded content dependencies
- **Phase 2 (Execution)**: A deterministic progress bar based on the total
  number of discovered items to process

### FR-9: Operation Report

After the operation completes, generate a Markdown report in the `reports/`
directory containing:

- Operation summary (source hub, target hub, repository, duplicate strategy,
  timing)
- Hierarchy structure that was copied
- All embedded items discovered during traversal
- Items created vs items skipped (with ID, label, and folder path for each)
- Folder mappings applied (source folder → target folder)
- Validation warnings (if any)
- Failures and errors encountered

### FR-10: User Flow

The command must follow the existing `recreate-content-items` flow:

1. Select source hub
2. Select source repository and content items (hierarchy roots)
3. Select target hub, target repository, and target locale
4. Choose duplicate handling strategy (skip / update / rename)
5. Run pre-operation validation
6. Display discovery summary and confirm execution
7. Execute copy with progress reporting
8. Generate and display report

### FR-11: Publishing Behavior

Copied items must mirror the source publishing state. Items that were ACTIVE and
published (`publishingStatus` is `EARLY` or `LATEST`) in the source are
published in the target after creation. Hierarchy nodes are published
parent-first with small delays between publishes to ensure correct ordering.
Embedded content items that were published are also published.

### FR-12: Locale Handling

All items (hierarchy and embedded) are created with the user-selected target
locale, following the existing `recreate-content-items` locale selection flow.

### FR-13: Delivery Key Handling

Source delivery keys are copied to target items. When the "rename duplicates"
strategy is selected, append a numeric suffix to the delivery key (e.g.,
`my-key-1`). For "skip existing" and "update existing" strategies, retain the
existing target item's delivery key. Delivery key conflicts are logged in the
operation report.

## Technical Considerations

- **TypeScript 5+ with strict mode** — all new code must satisfy strict type
  checking
- **Node.js v22+** — can use modern APIs (native fetch, structuredClone, etc.)
- **Command-Action architecture** — command orchestrates UI/prompts; action
  contains reusable business logic in `src/services/actions/`
- **AmplienceService** — all API calls go through the existing
  `AmplienceService` client; no direct fetch calls
- **Reuse existing patterns**:
  - Circular reference protection via `Set<string>` (pattern in
    `src/utils/folder-tree.ts`)
  - Schema validation via `ContentTypeService.validateSchemas()`
  - Hierarchy tree building via `HierarchyService.buildHierarchyTreeFromItems()`
  - Folder mapping via `createFolderMapping()` in
    `src/commands/shared/location-selection.ts`
- **Content relationship detection** — use combined approach: parse `$ref`
  patterns in schema definitions (`content-link`, `content-reference`) AND scan
  content bodies for nested `_meta` objects
- **Deep equality for schema comparison** — normalize schema JSON before
  comparison to catch structural drift between hubs
- **Vitest** for all unit and integration tests
- **Inquirer.js** for interactive prompts
- **cli-progress** for progress bars and spinners

## Acceptance Criteria

- [ ] AC-1: Copying a hierarchy root item also copies all Content Link and
      Content Reference items found recursively in the body of every item in the
      tree
- [ ] AC-2: Circular references between embedded content items do not cause
      infinite loops or stack overflows
- [ ] AC-3: Pre-operation validation detects and reports missing or mismatched
      schemas/content types, and aborts the operation if validation fails
- [ ] AC-4: The user can select a duplicate handling strategy (skip, update,
      rename) before the operation begins, and the tool applies it consistently
- [ ] AC-5: Embedded content items are created in target repository folders that
      mirror the source folder paths
- [ ] AC-6: All content references in copied items point to the correct target
      item IDs (not source IDs)
- [ ] AC-7: Failed item creations are retried up to 3 times with exponential
      backoff; failures are logged and the operation continues
- [ ] AC-8: A spinner displays during discovery phase and a progress bar
      displays during execution phase
- [ ] AC-9: A Markdown report is generated in `reports/` with full operation
      details including items created, skipped, failed, and folder mappings
- [ ] AC-10: Truly inline content (literal JSON without a separate CMS item) is
      left in-place. Inline Content Links pointing to separate CMS items are
      discovered and copied like Content Links and Content References
- [ ] AC-11: The command follows the existing recreate-content-items user flow
      (source hub → items → target hub → strategy → validate → confirm → execute
      → report)
- [ ] AC-12: Embedded references pointing to items in a different source
      repository are logged as warnings and their IDs are left unchanged
- [ ] AC-13: Duplicate items are matched by label within the same folder path in
      the target repository
- [ ] AC-14: Items that were published in the source are published in the target
      after creation, with hierarchy nodes published parent-first
- [ ] AC-15: All created items use the user-selected target locale
- [ ] AC-16: Delivery keys are copied from source; conflicts handled per
      duplicate strategy (suffix for rename, preserve existing for skip/update)
- [ ] AC-17: Dangling references to deleted/archived source items are preserved
      as-is and logged as warnings in the report
- [ ] AC-18: Update operations that fail with 409 version conflict re-fetch the
      target item version and retry (up to 3 attempts)

## Open Questions

None — all requirements have been clarified through three rounds of
clarification.
