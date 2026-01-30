# Triage: schema-id-filter-default

## Root Cause

The `promptForSchemaIdFilter` function supports a `defaultValue` parameter to pre-fill the prompt, but three commands call it without passing the `AMP_DEFAULT_SCHEMA_ID` environment variable value. This causes inconsistent behavior where only `copy-content-types` respects the env variable while other commands ignore it.

The function signature is correct and already supports defaults:

```typescript
export async function promptForSchemaIdFilter({
  defaultValue,
}: {
  defaultValue?: string;
} = {}): Promise<string>
```

But the affected commands call it as `await promptForSchemaIdFilter()` instead of passing the env variable.

## Affected Components

- `src/commands/archive-content-type-schemas/archive-content-type-schemas.ts` (line 59) — calls without default
- `src/commands/copy-content-type-schemas/copy-content-type-schemas.ts` (line 169) — calls without default
- `src/commands/sync-content-type-properties/sync-content-type-properties.ts` (line 109) — calls without default
- `src/prompts/prompt-for-schema-id-filter.ts` — the prompt function (no changes needed, but could be improved)

## Severity

**Medium** — Feature works but lacks expected default behavior, impacting user productivity. Users must manually type the filter pattern each time instead of having it pre-filled.

## Fix Approach

**Option A (Recommended): Modify `promptForSchemaIdFilter` to read env variable internally**

1. Update `promptForSchemaIdFilter` to automatically read `process.env.AMP_DEFAULT_SCHEMA_ID` when no `defaultValue` is provided
2. This fixes all current callers automatically and ensures future callers get the default behavior
3. Refactor `copy-content-types.ts` to use the simplified call (remove explicit env variable reading)

**Option B (Simpler but scattered): Update each caller**

1. Add the env variable reading pattern to each affected command
2. Matches current `copy-content-types.ts` implementation
3. More code duplication, but minimal changes to existing function

**Recommended: Option A** — Centralizes the default logic in the prompt function, reducing duplication and preventing future bugs.

## Notes

- The correct pattern exists in `copy-content-types.ts` (lines 90-94) and can be used as reference
- Tests exist at `src/prompts/prompt-for-schema-id-filter.test.ts` — will need updating for Option A
- Consider adding a test case specifically for env variable default behavior

## Triaged

2026-01-30
