# Full Hierarchy Copy

Copy entire hierarchy trees including all embedded content items (Content Links,
Content References, Inline Content Links) between Amplience hubs, preserving
folder structure and content relationships.

## Overview

This command extends the standard content recreation by automatically
discovering and copying all embedded content referenced within hierarchy items.
It replaces manual re-linking of content dependencies when copying between hubs.

## Usage

1. Run the CLI application with `npm start`
2. Select "Full Hierarchy Copy" from the command menu
3. Follow the interactive prompts

## Workflow

1. **Select source** — Choose source hub, repository, and folder
2. **Filter items** — Apply schema, status, and publishing filters
3. **Select items** — Choose which hierarchy root items to copy
4. **Select target** — Choose target hub, repository, and folder
5. **Select locale** — Choose target locale for all items
6. **Choose duplicate strategy** — Skip, update, or rename duplicates
7. **Validation** — Automatic schema/content type compatibility check
8. **Confirmation** — Review operation summary
9. **Execution** — Copy with progress tracking
10. **Report** — Detailed Markdown report generated

## Duplicate Handling Strategies

| Strategy              | Behavior                                  |
| --------------------- | ----------------------------------------- |
| **Skip existing**     | Use existing target item's ID for linking |
| **Update existing**   | Overwrite target item's body with source  |
| **Rename duplicates** | Create new item with suffix: "Item (1)"   |

## Pre-Operation Validation

Before copying begins, the tool validates:

- All content-type schemas exist in both hubs (not archived)
- All content types exist in both hubs (not archived)
- Schema bodies are identical (deep equality after normalization)

The operation aborts if validation fails.

## Embedded Content Types

| Type              | Detected By                                    | Action                   |
| ----------------- | ---------------------------------------------- | ------------------------ |
| Content Link      | `_meta.deliveryId` in body                     | Copied and re-linked     |
| Content Reference | `_meta.schema = content-reference`, `id` field | Copied and re-linked     |
| Inline Content    | `_meta.schema` only (no id/deliveryId)         | Skipped (part of parent) |

## Reports

Reports are saved to `reports/full-hierarchy-copy-{timestamp}.md` with:

- Operation summary and timing
- Validation results
- Items created, skipped, and failed
- Folder mappings
- Discovery warnings
- Published items list
