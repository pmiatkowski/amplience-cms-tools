# Extension Import - Phase 3 & 4 Integration Fix Plan

> **Status**: Ready for Implementation **Created**: 2026-01-12 **Issue**: Phase
> 3 (filtering/validation) and Phase 4 (dc-cli import) are implemented but not
> integrated

---

## Executive Summary

All Phase 3 and Phase 4 utilities are **fully implemented and tested** but are
**not integrated** into the main workflow. The TODO comments at lines 165-166 of
[import-extensions.ts](../src/services/actions/import-extensions.ts) are
accurate - the functionality exists but is not being called.

### Root Cause

Phase 5 (Integration) was marked as "completed" in the implementation plan but
was never actually performed. All individual components exist in isolation but
were never wired together.

### What's Missing

1. **Barrel Export** -
   [index.ts](../src/services/actions/import-extensions/index.ts) doesn't export
   filtering utilities
2. **Action Integration** -
   [import-extensions.ts](../src/services/actions/import-extensions.ts) doesn't
   call filtering or dc-cli import
3. **Command Integration** -
   [import-extensions.ts](../src/commands/manage-extensions/import-extensions/import-extensions.ts)
   doesn't prompt for filter, preview, or confirmation
4. **Result Tracking** - Result object always returns placeholder values
   (importedCount always 0)

---

## Implementation Requirements

### Test-Driven Development (TDD) Approach

Per [vitest.config.ts](../vitest.config.ts) and
[tech-stack.md](../.ai/memory/tech-stack.md):

1. **Write Tests First** - Before modifying integration code, write integration
   tests that verify the full workflow
2. **Coverage Thresholds** - Maintain minimum coverage:
   - Lines: 24%
   - Statements: 24%
   - Functions: 33%
   - Branches: 70%
3. **Test Isolation** - Use Vitest's mocking capabilities for external
   dependencies (fs, child_process)
4. **Test Location** - Place integration tests in
   [import-extensions.test.ts](../src/services/actions/import-extensions.test.ts)

### Code Style Requirements

Per [tech-stack.md](../.ai/memory/tech-stack.md):

1. **File Naming** - Use kebab-case (already compliant)
2. **Import Strategy** - Use `~/` path alias for cross-layer imports
3. **Error Handling** - Use custom error classes (already defined)
4. **Barrel Exports** - Update
   [index.ts](../src/services/actions/import-extensions/index.ts) to export all
   public APIs

---

## Detailed Implementation Plan

### Phase 1: Update Barrel Exports (10 min)

**Objective**: Make filtering utilities available for import

**File**:
[src/services/actions/import-extensions/index.ts](../src/services/actions/import-extensions/index.ts)

**Changes**:

```typescript
// ADD these exports:
export { buildFilterRegex } from './build-filter-regex';
export { extensionMatchesPattern } from './extension-matches-pattern';
export { filterExtensions } from './filter-extensions';
export type {
  ExtensionWithPath,
  FilterResult,
  InvalidFile,
} from './filter-extensions';
export { validateExtensionFile } from './validate-extension-file';
```

````

**TDD Steps**:

1. No new tests needed - exports are passive
2. Verify existing tests still pass: `npm run test -- import-extensions/index`

---

### Phase 2: Integrate Filtering into Action (30 min)

**Objective**: Add Phase 3 (filtering/validation) to main action workflow

**File**:
[src/services/actions/import-extensions.ts](../src/services/actions/import-extensions.ts)

**Current Workflow** (lines 137-183):

```typescript
// ✅ Phase 1-2: Copy and prepare files
const copiedFiles = await copyAndPrepareExtensions(resolvedSourceDir, tempDir);

// ✅ Phase 2: Update hub-specific fields
const prepProgress = createProgressBar(
  copiedFiles.length,
  'Preparing extension files'
);
for (const filePath of copiedFiles) {
  await updateExtensionFields(filePath, hub);
  prepProgress.increment();
}
prepProgress.stop();

// ❌ TODO: Phase 3 will add: filtering and validation
// ❌ TODO: Phase 4 will add: dc-cli import execution

// ⚠️ Result has placeholder values
const result: Amplience.ImportExtensionsResult = {
  sourceDir: resolvedSourceDir,
  totalFilesFound: copiedFiles.length,
  matchedCount: copiedFiles.length, // Will be set by filtering
  filteredOutCount: 0, // Will be set by filtering
  invalidCount: 0, // Will be set by filtering
  importedCount: 0, // Will be set after dc-cli import ← ALWAYS ZERO
  invalidFiles: [], // Will be populated by filtering
};
```

**New Workflow**:

```typescript
// ✅ Phase 1-2: Copy and prepare files
const copiedFiles = await copyAndPrepareExtensions(resolvedSourceDir, tempDir);

// ✅ Phase 2: Update hub-specific fields
const prepProgress = createProgressBar(
  copiedFiles.length,
  'Preparing extension files'
);
for (const filePath of copiedFiles) {
  await updateExtensionFields(filePath, hub);
  prepProgress.increment();
}
prepProgress.stop();

// ✅ Phase 3: Filter and validate extensions
const pattern = buildFilterRegex(params.filterPattern ?? '.*'); // Default: match all
const filterResult = await filterExtensions(copiedFiles, pattern);

// Log warnings for invalid files
if (filterResult.invalid.length > 0) {
  console.warn(`⚠️ Skipping ${filterResult.invalid.length} invalid file(s):`);
  for (const invalid of filterResult.invalid) {
    console.warn(`   - ${path.basename(invalid.filePath)}: ${invalid.error}`);
  }
  console.log();
}

// Early exit if no valid extensions match pattern
if (filterResult.kept.length === 0) {
  const result: Amplience.ImportExtensionsResult = {
    sourceDir: resolvedSourceDir,
    totalFilesFound: copiedFiles.length,
    matchedCount: 0,
    filteredOutCount: filterResult.removed.length,
    invalidCount: filterResult.invalid.length,
    importedCount: 0,
    invalidFiles: filterResult.invalid,
  };
  await cleanupTempDirectory(tempDir);
  return result;
}

// ✅ Phase 4: Import extensions using dc-cli
await runDcCliImport(hub, tempDir);

// ✅ Construct result with actual counts
const result: Amplience.ImportExtensionsResult = {
  sourceDir: resolvedSourceDir,
  totalFilesFound: copiedFiles.length,
  matchedCount: filterResult.kept.length,
  filteredOutCount: filterResult.removed.length,
  invalidCount: filterResult.invalid.length,
  importedCount: filterResult.kept.length, // DC-CLI imports all kept files
  invalidFiles: filterResult.invalid,
};
```

**Parameter Changes**:

Update `ImportExtensionsParams` type:

```typescript
type ImportExtensionsParams = {
  hub: Amplience.HubConfig;
  sourceDir: string;
  filterPattern?: string; // NEW: Optional regex pattern for filtering
};
```

**Import Additions**:

```typescript
import {
  buildFilterRegex,
  filterExtensions,
  runDcCliImport,
} from './import-extensions/index';
```

**TDD Steps**:

1. **Write integration test first** in import-extensions.test.ts:

   ```typescript
   describe('importExtensions - Phase 3 & 4 Integration', () => {
     it('should filter extensions by pattern', async () => {
       // Setup: Create temp source dir with 3 extensions
       // Test: Import with pattern matching 2 of 3
       // Assert: matchedCount=2, filteredOutCount=1, importedCount=2
     });

     it('should skip invalid files and continue', async () => {
       // Setup: Mix of valid and invalid JSON files
       // Test: Import all
       // Assert: invalidCount=N, kept extensions are imported
     });

     it('should call runDcCliImport with correct parameters', async () => {
       // Setup: Mock runDcCliImport
       // Test: Import extensions
       // Assert: runDcCliImport called once with (hub, tempDir)
     });

     it('should return zero imports when no extensions match', async () => {
       // Setup: Extensions that don't match pattern
       // Test: Import with non-matching pattern
       // Assert: importedCount=0, early exit before dc-cli
     });

     it('should log warnings for invalid files', async () => {
       // Setup: Mock console.warn, mix of valid/invalid files
       // Test: Import
       // Assert: console.warn called for each invalid file
     });
   });
   ```

2. **Run tests** (they should fail): `npm run test -- import-extensions.test.ts`
3. **Implement changes** to import-extensions.ts
4. **Verify tests pass**: `npm run test -- import-extensions.test.ts`
5. **Check coverage**: `npm run test -- --coverage import-extensions.ts`

---

### Phase 3: Integrate Prompts into Command (45 min)

**Objective**: Add user prompts for filter pattern, preview, and confirmation

**File**: src/commands/manage-extensions/import-extensions/import-extensions.ts

**Current Workflow** (lines 28-68):

```typescript
// ✅ Check dc-cli
const isDcCliAvailable = await checkDcCliAvailability();

// ✅ Select hub
const hub = await promptForHub(hubConfigs);

// ✅ Get source directory
const sourceDir = await promptForExtensionInputDirectory();

// ❌ MISSING: Prompt for filter pattern
// ❌ MISSING: Preview extensions
// ❌ MISSING: Confirmation prompt

// Execute import
const result = await importExtensions({ hub, sourceDir });

// ✅ Display summary
console.log('✅ Import completed!\n');
const summary = formatImportSummary(result);
console.log(summary);
```

**New Workflow**:

```typescript
// ✅ Check dc-cli
const isDcCliAvailable = await checkDcCliAvailability();

// ✅ Select hub
const hub = await promptForHub(hubConfigs);

// ✅ Get source directory
const sourceDir = await promptForExtensionInputDirectory();

// ✅ NEW: Prompt for filter pattern
const filterPattern = await promptForExtensionFilterPattern();

// ✅ NEW: Load and preview extensions before import
console.log('⏳ Loading extensions...\n');
const previewResult = await previewExtensions({ sourceDir, filterPattern });

// Show preview table
const previewTable = formatExtensionsForPreview(previewResult.kept);
console.log(previewTable);
console.log(
  `\n📊 Total: ${previewResult.totalFilesFound} | ` +
    `Match: ${previewResult.matchedCount} | ` +
    `Filtered: ${previewResult.filteredOutCount} | ` +
    `Invalid: ${previewResult.invalidCount}\n`
);

// Show warnings for invalid files
if (previewResult.invalidFiles.length > 0) {
  console.warn('⚠️ Invalid files (will be skipped):');
  for (const invalid of previewResult.invalidFiles) {
    console.warn(`   - ${path.basename(invalid.filePath)}: ${invalid.error}`);
  }
  console.log();
}

// Early exit if no extensions to import
if (previewResult.matchedCount === 0) {
  console.log('ℹ️ No extensions match the filter pattern. Exiting.\n');
  return;
}

// ✅ NEW: Confirmation prompt
const confirmed = await promptForImportConfirmation(
  hub.name,
  previewResult.matchedCount
);
if (!confirmed) {
  console.log('❌ Import cancelled by user.\n');
  return;
}

// Execute import
console.log('⏳ Starting import...\n');
const result = await importExtensions({
  hub,
  sourceDir,
  filterPattern,
});

// ✅ Display summary
console.log('✅ Import completed!\n');
const summary = formatImportSummary(result);
console.log(summary);
```

**Helper Function Required**:

Add `previewExtensions()` to action layer:

**File**: src/services/actions/import-extensions.ts

```typescript
/**
 * Preview extensions before import (read-only operation)
 *
 * Performs filtering and validation without modifying any files or
 * importing to hub. Returns metadata for preview display.
 *
 * @param params - Source directory and filter pattern
 * @example
 * const preview = await previewExtensions({
 *   sourceDir: './exports/extensions',
 *   filterPattern: 'my-extension'
 * });
 * console.log(`Will import ${preview.matchedCount} extensions`);
 */
async function previewExtensions(params: {
  sourceDir: string;
  filterPattern?: string;
}): Promise<Amplience.PreviewExtensionsResult> {
  const { sourceDir, filterPattern = '.*' } = params;
  const resolvedSourceDir = path.resolve(sourceDir);

  // Read all JSON files from source directory
  const files = await fs.readdir(resolvedSourceDir);
  const jsonFiles = files
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(resolvedSourceDir, f));

  // Filter and validate
  const pattern = buildFilterRegex(filterPattern);
  const filterResult = await filterExtensions(jsonFiles, pattern);

  return {
    sourceDir: resolvedSourceDir,
    totalFilesFound: jsonFiles.length,
    matchedCount: filterResult.kept.length,
    filteredOutCount: filterResult.removed.length,
    invalidCount: filterResult.invalid.length,
    kept: filterResult.kept,
    invalidFiles: filterResult.invalid,
  };
}

// Export for command layer
export { previewExtensions };
```

**New Type** (add to types/amplience.d.ts):

```typescript
type PreviewExtensionsResult = {
  sourceDir: string;
  totalFilesFound: number;
  matchedCount: number;
  filteredOutCount: number;
  invalidCount: number;
  kept: Array<{ extension: Extension; filePath: string }>;
  invalidFiles: Array<{ filePath: string; error: string }>;
};
```

**Import Additions**:

```typescript
import { previewExtensions } from '~/services/actions/import-extensions';
import { formatExtensionsForPreview } from './format-extensions-for-preview';
import { promptForExtensionFilterPattern } from './prompt-for-extension-filter-pattern';
import { promptForImportConfirmation } from './prompt-for-import-confirmation';
```

**TDD Steps**:

1. **Write tests for `previewExtensions()`** in import-extensions.test.ts:

   ```typescript
   describe('previewExtensions', () => {
     it('should return preview without modifying files', async () => {
       // Setup: Source directory with extensions
       // Test: Call previewExtensions
       // Assert: Returns correct counts, files unchanged
     });

     it('should filter extensions by pattern in preview', async () => {
       // Setup: Extensions with different IDs
       // Test: Preview with specific pattern
       // Assert: Only matching extensions in kept array
     });
   });
   ```

2. **Implement `previewExtensions()`** in import-extensions.ts
3. **Verify action tests pass**: `npm run test -- import-extensions.test.ts`

4. **Write integration test for command workflow** in import-extensions.test.ts:

   ```typescript
   describe('runImportExtensions - Full Workflow', () => {
     it('should complete full import workflow with prompts', async () => {
       // Setup: Mock all prompts, mock importExtensions action
       // Test: Run command
       // Assert: All prompts called in order, import called with correct params
     });

     it('should cancel import if user declines confirmation', async () => {
       // Setup: Mock confirmation to return false
       // Test: Run command
       // Assert: Import not called, displays cancellation message
     });

     it('should exit early if no extensions match', async () => {
       // Setup: Preview returns 0 matches
       // Test: Run command
       // Assert: Confirmation not shown, import not called
     });
   });
   ```

5. **Implement command changes**
6. **Verify command tests pass**:
   `npm run test -- commands/manage-extensions/import-extensions`

---

### Phase 4: Update Documentation (15 min)

**Objective**: Update documentation to reflect integration completion

**Files**:

1. docs/import-extensions.md - Already accurate, verify completeness
2. .ai/features/extension-import/implementation-plan/plan-state.yml - Update
   Phase 5 status

**Changes to plan-state.yml**:

```yaml
status: completed
current_phase: 5
phases:
  - name: Core Import Infrastructure
    status: completed
  - name: Hub-Specific Field Updates
    status: completed
  - name: Filtering and Preview
    status: completed
  - name: Progress & Summary
    status: completed
  - name: Integration & Testing # UPDATE THIS
    status: completed
    notes: |
      Integration completed:
      - Barrel export updated with filtering utilities
      - Filtering integrated into main action workflow
      - DC-CLI import execution integrated
      - Command layer prompts integrated (filter, preview, confirmation)
      - Full integration tests added and passing
```

**TDD Steps**:

1. No tests needed for documentation updates
2. Verify documentation matches implemented behavior

---

### Phase 5: End-to-End Testing (30 min)

**Objective**: Verify complete workflow in real environment

**Manual Test Scenarios**:

1. **Happy Path - All Extensions**:

   ```bash
   npm start
   # Select: Import Extensions
   # Select target hub
   # Enter source directory: ./exports/extensions
   # Enter filter pattern: .* (match all)
   # Verify: Preview shows all extensions
   # Confirm: Yes
   # Verify: All extensions imported, summary displayed
   ```

2. **Filtered Import**:

   ```bash
   npm start
   # Select: Import Extensions
   # Enter filter pattern: product
   # Verify: Preview shows only product-* extensions
   # Confirm: Yes
   # Verify: Only filtered extensions imported
   ```

3. **Invalid Files Handling**:

   ```bash
   # Setup: Add invalid JSON file to source directory
   npm start
   # Select: Import Extensions
   # Verify: Warning logged for invalid file
   # Verify: Valid extensions still imported
   ```

4. **User Cancellation**:

   ```bash
   npm start
   # Select: Import Extensions
   # Confirm: No
   # Verify: Import cancelled, no API calls made
   ```

5. **No Matches**:
   ```bash
   npm start
   # Enter filter pattern: zzz_nonexistent
   # Verify: Message "No extensions match", exits early
   ```

**Automated E2E Test** (optional, add to tests/integration/):

```typescript
// tests/integration/import-extensions.e2e.test.ts
describe('Import Extensions E2E', () => {
  it('should complete full import workflow end-to-end', async () => {
    // Setup: Create test extensions, configure test hub
    // Execute: Run command with mocked prompts
    // Assert: Extensions exist in hub via API verification
    // Cleanup: Remove test extensions
  });
});
```

---

## Time Estimate

| Phase     | Task                                  | Duration     |
| --------- | ------------------------------------- | ------------ |
| 1         | Update Barrel Exports                 | 10 min       |
| 2         | Integrate Filtering into Action (TDD) | 30 min       |
| 3         | Integrate Prompts into Command (TDD)  | 45 min       |
| 4         | Update Documentation                  | 15 min       |
| 5         | End-to-End Testing                    | 30 min       |
| **Total** |                                       | **2h 10min** |

---

## Success Criteria

### Functional Requirements

- ✅ Extensions are filtered by user-provided pattern
- ✅ Preview table displays before import
- ✅ User confirms before import proceeds
- ✅ Invalid files are skipped with warnings
- ✅ DC-CLI import executes for valid, matching extensions
- ✅ Result summary shows accurate counts

### Technical Requirements

- ✅ All integration tests pass
- ✅ Coverage thresholds maintained (lines: 24%, statements: 24%, functions:
  33%, branches: 70%)
- ✅ No ESLint violations
- ✅ Code follows project conventions (kebab-case, barrel exports, path aliases)

### User Experience

- ✅ Clear progress indicators at each step
- ✅ User-friendly error messages
- ✅ Preview allows informed decision before import
- ✅ Consistent with other command patterns in project

---

## Rollback Plan

If integration causes issues:

1. **Revert barrel export**: Remove new exports from index.ts
2. **Revert action integration**: Restore TODO comments in import-extensions.ts
3. **Revert command integration**: Restore original workflow in command file
4. **Keep utilities**: All Phase 3 & 4 utilities remain intact for future
   integration

All utilities have comprehensive test coverage and work independently, so
partial rollback is safe.

---

## Dependencies

### External Dependencies

- `dc-cli` - Already required and checked at runtime
- No new npm packages required

### Internal Dependencies

- All utilities already implemented:
  - build-filter-regex.ts
  - filter-extensions.ts
  - validate-extension-file.ts
  - run-dc-cli-import.ts
  - prompt-for-extension-filter-pattern.ts
  - prompt-for-import-confirmation.ts
  - format-extensions-for-preview.ts

---

## Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                                              |
| ------------------------------------ | ---------- | ------ | ------------------------------------------------------- |
| Integration breaks existing workflow | Low        | High   | TDD approach, comprehensive tests before implementation |
| Coverage drops below thresholds      | Low        | Medium | Write tests first, verify coverage after each phase     |
| DC-CLI authentication fails          | Medium     | Medium | Already handled with HubAuthenticationError class       |
| Invalid files cause import failure   | Low        | Low    | Fail-soft approach already implemented                  |

---

## Post-Integration Verification

After completing all phases:

1. ✅ Run full test suite: `npm run test`
2. ✅ Verify coverage: `npm run test -- --coverage`
3. ✅ Run linter: `npm run lint`
4. ✅ Manual E2E test with real hub
5. ✅ Update CHANGELOG.md with integration completion
6. ✅ Remove TODO comments from import-extensions.ts

---

## Notes

- All utilities are **already tested** - integration testing focuses on workflow
- No breaking changes to existing export functionality
- Pattern matching follows same approach as export command
- Fail-soft approach ensures resilience (skip invalid files, continue with valid
  ones)
````
