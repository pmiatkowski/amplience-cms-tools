# Feature Request: full-hierarchy-copy

## Description

I want to extend recreate-content-items functionality by being able to copy
hierarchy items and child nodes that contain items known as Content link,
Content reference, Inline content link. These elements are like embedded content
items. They might also contain similar structures like content reference,
content link, inline content link, or even array of these. Main requirement is
to be able recreate any hierarchy tree that contains these emebedd content
items. These content items also should be recreated if they don't exist. This is
recurrent logic and there might be circular referencing so there should be a
mechanism that checks against that. Additional requirement is that embeded
content item should be put in a similar folder in the target repositiory as in
the source directory in the repository. Before any movments there should be a
sanity check that all schemas match between two hubs and content types also
match (they exists so that content items could be recreated in the target hub)

## Created

2026-03-11

## Clarifications

### Round 1

#### Q1: How should the tool identify embedded content items?

User: Use comprehensive approach - check schema definitions ($ref patterns like
`http://bigcontent.io/cms/schema/v1/core#/definitions/content-link` and
`content-reference`) AND analyze nested `_meta` objects in content bodies.
Schemas have clearly defined which elements are which using $ref patterns.

#### Q2: Where should embedded content items be created in the target repository?

User: Mirror exact source folder path in target repository (preserves
organizational structure).

#### Q3: How should the tool handle circular references?

User: Track processed items by ID in a Set, skip already-processed references
(prevents infinite loops).

#### Q4: When should validation occur?

User: Before any content copying begins. Validate: (1) content-type-schemas
exist in both repositories and are not archived, (2) content-types exist in both
repositories and are not archived, (3) content type schemas are identical in
both hubs.

#### Q5: When an embedded content item already exists in the target repository, what should happen?

User: User selects strategy upfront before operation begins (options: skip
existing/update existing/rename duplicates).

#### Q6: What information should be included in the operation report?

User: Detailed list — summary + each item created/skipped with ID, label, and
folder path. Include: hierarchy structure copied, embedded items discovered,
items created vs skipped, folder mappings applied, validation warnings.

### Round 2

#### Q1: What does "update existing" mean as a duplicate strategy?

User: Overwrite the target item's body entirely with the source item's body.

#### Q2: How should "rename duplicates" generate new names?

User: Append a numeric suffix — e.g., `My Item (1)`, `My Item (2)` —
incrementing if suffix already exists.

#### Q3: How should errors during copy be handled?

User: Retry failed items up to 3 times with exponential backoff, then continue
on error — log failures, skip dependent items, report all failures at the end.

#### Q4: How should the user select source and target hubs?

User: Follow existing `recreate-content-items` flow — select source hub first,
pick items, then select target hub and repository.

#### Q5: What does "schemas are identical" mean for validation?

User: Same `schemaId` URI AND same schema body JSON (deep equality after
normalization) — ensures structural compatibility and catches drift between
hubs.

#### Q6: How should progress be reported during the operation?

User: Two-phase progress — Phase 1: spinner during discovery of all items and
embedded content, Phase 2: deterministic progress bar based on discovered total.
