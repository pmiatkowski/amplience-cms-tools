# Bug Report: schema-id-filter-default

## Description

there is a bug in usage of promptForSchemaIdFilter. It does not defaults to AMP_DEFAULT_SCHEMA_ID env variable

## Steps to Reproduce

1. Set `AMP_DEFAULT_SCHEMA_ID` environment variable
2. Run any of the affected commands: `archive-content-type-schemas`, `copy-content-type-schemas`, or `sync-content-type-properties`
3. Observe the schema ID filter prompt shows empty instead of the env variable value

## Expected Behavior

The prompt should pre-fill with the `AMP_DEFAULT_SCHEMA_ID` value (user can still change it)

## Actual Behavior

The prompt is empty — the env variable is ignored because callers don't pass it to the prompt function

## Affected Commands

- `archive-content-type-schemas.ts` (line 59)
- `copy-content-type-schemas.ts` (line 169)
- `sync-content-type-properties.ts` (line 108)

## Root Cause

The `promptForSchemaIdFilter` function supports a `defaultValue` parameter, but the affected commands call it without arguments. Only `copy-content-types.ts` correctly passes the env variable.

## Proposed Fix

1. Modify `promptForSchemaIdFilter` to read `AMP_DEFAULT_SCHEMA_ID` internally if no `defaultValue` provided
2. Callers can still override with explicit value
3. Refactor `copy-content-types.ts` to use the new default behavior (simplify code)

## Reported

2026-01-30
