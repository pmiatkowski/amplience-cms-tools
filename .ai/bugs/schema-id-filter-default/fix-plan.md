# Fix Plan: schema-id-filter-default

## Fix Checklist

- [x] Update `promptForSchemaIdFilter` in `src/prompts/prompt-for-schema-id-filter.ts` to read `process.env.AMP_DEFAULT_SCHEMA_ID` internally when no `defaultValue` is provided
- [x] Simplify the call in `src/commands/copy-content-types/copy-content-types.ts` to use the new automatic default behavior (remove explicit env reading)
- [x] Verify `src/commands/archive-content-type-schemas/archive-content-type-schemas.ts` now inherits default behavior (no code change needed)
- [x] Verify `src/commands/copy-content-type-schemas/copy-content-type-schemas.ts` now inherits default behavior (no code change needed)
- [x] Verify `src/commands/sync-content-type-properties/sync-content-type-properties.ts` now inherits default behavior (no code change needed)
- [x] Add test case in `src/prompts/prompt-for-schema-id-filter.test.ts` for env variable default behavior
- [x] Update existing tests to mock `process.env.AMP_DEFAULT_SCHEMA_ID` where needed
- [ ] Test all four commands manually to verify default is applied

## Estimated Complexity

Simple

## Testing Strategy

1. Set `AMP_DEFAULT_SCHEMA_ID=https://example.com/` environment variable
2. Run each affected command:
   - `archive-content-type-schemas`
   - `copy-content-type-schemas`
   - `sync-content-type-properties`
   - `copy-content-types`
3. Verify the schema ID filter prompt shows the default value pre-filled
4. Test without env variable set — prompt should have no default
5. Run unit tests: `npm test -- prompt-for-schema-id-filter`

## Created

2026-01-30
