# Sync Content Types

`Sync Content Types` aligns selected active content types from a source hub to a
target hub. It creates missing types, updates existing settings, reactivates an
archived target match, reconciles repository assignments, and can synchronize
the successfully updated target types with their schemas.

The legacy command-set key `copy-content-types` remains accepted as a deprecated
alias. It prints a deprecation warning and delegates to the same workflow. New
command sets should use `sync-content-types`.

## Requirements

- Exactly `@amplience/dc-cli` version `0.31.0` must be installed locally.
- Source and target hubs must be configured and must be different.
- Target repositories used by automatic mapping must have the same names as
  their source repositories.
- If any selected source type has visualizations, both hubs must define a valid
  HTTPS `AMP_HUB_<ENV>_VISUALISATION_APP_URL`.

Before hub selection, the command fails closed unless the local binary reports
version `0.31.0` and exposes the required `content-type export`,
`content-type import`, and per-ID `content-type sync` command surfaces.

## Usage

Run the CLI and select **Synchronize content-types**:

```bash
npm start
```

For command sets, use the `sync-content-types` key. The command remains
interactive when invoked from a set because its source, target, selection,
mapping, safety, and property-sync choices are collected at runtime.

## Preflight

The command collects all input before making remote changes:

1. Select source and target hubs.
2. Export active source content types and active/archived target content types
   using read-only dc-cli operations.
3. Optionally filter source types by schema URI regex, then select the types to
   align.
4. Choose whether corresponding schemas should be copied first.
5. If schemas will not be copied, verify that every selected schema already
   exists on the target.
6. Choose additive or exact repository alignment.
7. Choose automatic name matching or manual repository selection. Manual mode
   prompts once per selected content type.
8. Choose dry-run or live execution.
9. When eligible types exist, choose whether they should be synchronized with
   target schemas.
10. Review source/target direction, settings differences, current/planned
    repositories, and all planned actions, then confirm once.
11. For live execution on a protected target, complete its challenge.

After the final confirmation, schema copy, content type import, verification,
property synchronization, and reporting run without further prompts. If selected
schema validation fails, execution stops before content type import and records
the schema failures. After a successful schema import, the command waits briefly
for indexing before importing dependent content types.

## Matching And Settings

Content types are matched by `contentTypeUri`:

- Missing target URI: create the content type.
- Existing active target URI: update changed settings.
- Existing archived target URI: unarchive and update it.
- Target-only URI: leave it unchanged.

Settings include label, icons, visualizations, and cards. Source visualization
URLs using the configured source VSE origin are rewritten to the configured
target origin. Other origins are preserved.

This command reads visualization settings from the source and target content
types exported by dc-cli. It does not read the VSE Management visualization
configuration file (for example `exports/visualisations/visualisations.json`).

For every item with initial or changed settings (`CREATE` or `UPDATE_SETTINGS`),
the confirmation summary lists only the relevant fields and shows the current
target value beside the planned target value derived from the source. Missing
values display as `(not set)`. Arrays are rendered as compact JSON and replaced
as complete arrays, so URL, size, label, ordering, and default changes remain
visible. For example:

```text
- Article Card
  Actions: UPDATE_SETTINGS
  Settings changes:
    - label
      Current target (UAT): "Old Article"
      Planned target (from LIVE): "Article Card"
    - visualizations
      Current target (UAT): [{"label":"Preview","templatedUri":"https://live.example/preview"}]
      Planned target (from LIVE, visualization origin adapted for UAT): [{"label":"Preview","templatedUri":"https://uat.example/preview"}]
```

`Current target` is the value currently stored in the selected target hub.
`Planned target` is what will be written there. For visualizations, the planned
value is derived from the source hub and then has the configured source origin
rewritten to the configured target origin before comparison.

Only URLs beginning with the configured source origin at a URL boundary are
rewritten. Third-party URLs and values such as localhost remain unchanged.

## Plan Actions

| Action            | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `CREATE`          | The source URI is missing and will be registered on the target |
| `UNARCHIVE`       | A matching archived target type will be reactivated            |
| `UPDATE_SETTINGS` | One or more supported settings differ                          |
| `ASSIGN`          | One or more repositories will be assigned                      |
| `UNASSIGN`        | Exact mode will remove one or more assignments                 |
| `NO_CHANGE`       | Settings, lifecycle, and planned repositories already match    |

A `NO_CHANGE` type may still be synchronized with its schema when that schema is
copied during the same run.

## Schema Handling

When schema copy is selected, every selected content type URI is passed to the
schema workflow. Missing target schemas are created and existing target schemas
are updated. Files outside the confirmed selection are removed from the
temporary import directory, and validation errors stop the parent workflow
without a mid-execution prompt.

When schema copy is declined, preflight requires every selected schema URI to
already exist on the target. Missing schemas stop planning before repository
mapping or content type writes.

## Repository Modes

### Additive

Assign repositories present in the mapped source list while preserving
target-only assignments.

### Exact

Make target assignments equal the mapped source list. The plan explicitly shows
assignments that will be removed.

### Mapping Strategies

- **Automatic**: Match every source repository by exact target repository name.
  Preflight stops in either repository mode if any source name is unresolved.
- **Manual**: Select target repositories independently for each content type. In
  exact mode, selecting none plans removal of every current assignment. In
  additive mode, selecting none preserves all current target assignments.

The confirmation summary and report always show repository assignments for each
selected content type:

```text
  Repository assignments:
    Current target (UAT): Legacy
    Planned target (exact): Content
    Assign: Content
    Unassign: Legacy
```

When the current and planned lists already match, the summary displays
`Changes: none` instead of omitting repository information.

## Schema Property Synchronization

During preflight, the command asks:

> After aligning the selected content types, synchronize them with their target
> schemas?

When selected, synchronization runs after content type import and post-import
verification. The eligible schema URI set is the union of:

- types successfully verified after create, settings update, or unarchive; and
- schemas successfully copied by this run, including content types whose
  settings and repositories otherwise needed no change.

The command resolves those URIs to current target content type IDs and calls
`dc-cli content-type sync <id>` separately for each exact ID. Repository-only
changes alone do not add a candidate, although a type may still qualify because
its schema was copied. A failure in this final stage does not roll back
successful alignment; it is reported as a partial result.

Property synchronization status is reported as `PLANNED` for dry-run,
`SKIPPED_BY_USER`, `NOT_APPLICABLE`, `SUCCEEDED`, or `FAILED`.

## Execution Stages And Progress

Live execution runs in this order:

1. Copy and validate selected schemas when requested.
2. Wait briefly for copied schemas to be indexed.
3. Bulk import changed content type definitions and repository assignments.
4. Re-export target types and verify postconditions.
5. Synchronize eligible target types with their schemas when preselected.
6. Write the Markdown report.

Schema and content type import are bulk dc-cli stages. The final per-type schema
synchronization uses one updating progress-bar line; individual `Executing:`
diagnostics are suppressed while that bar is active, and failures are listed
after it stops.

## Dry Run And Verification

Dry-run is implemented by this application because dc-cli content type import
does not provide a dry-run option. It performs read-only exports, builds the
same plan, and skips schema import, content type import, and property sync.

After a live import, the command re-exports target content types and compares
settings, lifecycle state, and repository assignments with the confirmed plan.
Only verified types are eligible for property synchronization.

If dc-cli exits with an import error after applying some records, verification
still determines each type's actual outcome. Verified successes are preserved,
remaining mismatches are failures, and the report retains the dc-cli error.

## Reports

Each executed plan writes a Markdown report to `reports/` containing:

- source and target hubs;
- dry-run/live and repository modes;
- schema-copy and property-sync choices;
- per-type actions, field-level setting changes with current/planned target
  values, and current/planned repository assignments;
- explicit repository `Assign`, `Unassign`, or `Changes: none` results;
- verified alignment failures and any retained dc-cli import error; and
- property synchronization status and failures.

Credentials are never included.

The alignment `Processed` count includes changed definitions that passed
post-import verification; `NO_CHANGE` items are not counted there. The property
sync count can be higher because successfully copied schemas also add eligible
types, including otherwise unchanged content types.

## Fail-Closed Conditions

Planning or execution stops without content type writes when:

- fewer than two hubs are configured or source and target are the same;
- the dc-cli version or required command surface is unsupported;
- the schema URI filter is invalid;
- schema copy is declined and a selected schema is missing from the target;
- automatic repository mapping cannot resolve every source repository name;
- selected visualizations require a missing, invalid, or non-HTTPS hub origin;
- parent-orchestrated schema validation fails; or
- schema copy fails before content type alignment begins.

Post-import mismatches and property-sync failures are reported as failed or
partial results rather than silently treated as success.

Selecting no content types or rejecting the final plan cancels cleanly without
writes.

## Related Commands

- [Copy Content Type Schemas](copy-content-type-schemas.md): Standalone schema
  export/import workflow.
- [Sync Content Type Properties](sync-content-type-properties.md): Standalone
  target-schema synchronization with regex, status, or exact-ID scope.
- [VSE Management](vse-management.md): Apply a visualization configuration file
  to content types on one hub.
- [User Command Sets](user-command-sets.md): Include this workflow in reusable
  interactive command sequences.

## Verified External Capabilities

| Capability                             | Owner                    | Source                                                                                            |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Content type export and `--archived`   | dc-cli 0.31.0            | [Content Type commands](https://github.com/amplience/dc-cli/blob/v0.31.0/docs/CONTENT-TYPE.md)    |
| Create/update from import records      | dc-cli 0.31.0            | [Import usage](https://github.com/amplience/dc-cli/blob/v0.31.0/docs/IMPORT_USAGE.md)             |
| Repository assignment and unassignment | dc-cli 0.31.0            | [Import usage](https://github.com/amplience/dc-cli/blob/v0.31.0/docs/IMPORT_USAGE.md)             |
| Per-ID schema synchronization          | dc-cli 0.31.0            | [Content Type commands](https://github.com/amplience/dc-cli/blob/v0.31.0/docs/CONTENT-TYPE.md)    |
| Content type management model          | Amplience Management API | [Content Types API](https://amplience.com/docs/api/dynamic-content/management/#tag/Content-Types) |

Additive repository union, VSE origin rewriting, dry-run, preflight planning,
post-import verification, scoped property synchronization, and reports are
implemented by this application rather than dc-cli.
