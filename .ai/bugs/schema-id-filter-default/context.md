# Context

## Relevant Files

- `src/prompts/prompt-for-schema-id-filter.ts` — The prompt function that accepts optional `defaultValue` parameter
- `src/commands/copy-content-types/copy-content-types.ts` — CORRECT usage: passes `AMP_DEFAULT_SCHEMA_ID` to prompt (line 90-94)
- `src/commands/archive-content-type-schemas/archive-content-type-schemas.ts` — BUG: calls `promptForSchemaIdFilter()` without default (line 59)
- `src/commands/copy-content-type-schemas/copy-content-type-schemas.ts` — BUG: calls `promptForSchemaIdFilter()` without default (line 169)
- `src/commands/sync-content-type-properties/sync-content-type-properties.ts` — BUG: calls `promptForSchemaIdFilter()` without default (line 108)

## Business Logic

- `AMP_DEFAULT_SCHEMA_ID` env variable should provide default filter pattern for schema ID prompts
- All commands using `promptForSchemaIdFilter` should respect this default for consistency

## Technical Constraints

- The prompt function already supports `defaultValue` parameter — no changes needed to the function itself
- Fix requires updating callers to pass the env variable

## Notes

- `copy-content-types.ts` shows the correct pattern on lines 90-94:

  ```typescript
  const defaultSchemaId = process.env.AMP_DEFAULT_SCHEMA_ID;
  const filterPattern = (await promptForSchemaIdFilter(
    defaultSchemaId ? { defaultValue: defaultSchemaId } : undefined
  ))?.trim() ?? '';
  ```
