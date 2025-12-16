# TDD Implementation Plan: Bulk Sync Hierarchies

**Feature**: Bulk Sync Hierarchies  
**Document Version**: 1.0  
**Date**: December 16, 2025  
**Approach**: Test-Driven Development (TDD)

---

## Overview

This plan implements the bulk-sync-hierarchies feature using Test-Driven
Development (TDD), where all tests are written before implementation code. The
plan is divided into 3 phases, each with comprehensive test coverage before any
production code.

**Key Principle**: RED → GREEN → REFACTOR

- RED: Write failing tests first
- GREEN: Implement minimum code to pass tests
- REFACTOR: Improve code while keeping tests green

---

## Phase 1: Foundation - Prompts & Core Types

**Objective**: Establish the multi-select prompt and core data structures with
full test coverage before implementing any command logic.

### Steps

#### 1.1 Create test file for multi-select prompt

**File**:
`src/commands/bulk-sync-hierarchies/prompts/prompt-for-multiple-hierarchies.test.ts`

**Tests to write**:

- ✓ Should display "Select All" option at the top
- ✓ Should return all items when "Select All" is chosen
- ✓ Should return only selected items when specific items are chosen
- ✓ Should validate at least one item is selected
- ✓ Should format choices with delivery key and schema ID
- ✓ Should handle empty list gracefully
- ✓ Should filter out unselected items correctly

**Pattern**: Follow `src/prompts/prompt-for-locale-strategy.test.ts` for mocking
`inquirer`

**Expected outcome**: All tests FAIL (prompt doesn't exist yet)

#### 1.2 Implement multi-select prompt

**File**:
`src/commands/bulk-sync-hierarchies/prompts/prompt-for-multiple-hierarchies.ts`

**Implementation**:

```typescript
export async function promptForMultipleHierarchies(
  filteredItems: Amplience.ContentItem[]
): Promise<Amplience.ContentItem[]>;
```

**Features**:

- Checkbox prompt with "✓ Select All" at top
- Format: `${label} (${deliveryKey}) - ${schemaId}`
- Validation: Minimum 1 item required
- Handle "SELECT_ALL" special value
- Return filtered array of selected items

**Expected outcome**: All Step 1.1 tests PASS

#### 1.3 Create barrel export for prompts

**File**: `src/commands/bulk-sync-hierarchies/prompts/index.ts`

**Content**: Export `promptForMultipleHierarchies` (no tests needed per testing
guidelines)

#### 1.4 Create type definitions test file

**File**: `src/commands/bulk-sync-hierarchies/types.test.ts`

**Tests to write**:

- ✓ Should validate SourceHierarchy structure
- ✓ Should validate MatchedHierarchyPair structure
- ✓ Should validate MissingHierarchy structure
- ✓ Should validate BulkSyncSummary structure
- ✓ Should validate BulkSyncResult structure
- ✓ Should validate BulkSyncHierarchiesOptions structure

**Expected outcome**: All tests FAIL (types don't exist yet)

#### 1.5 Create type definitions

**File**: `src/commands/bulk-sync-hierarchies/types.ts`

**Types to implement** (per PRD Section 4.4):

```typescript
export type SourceHierarchy = {
  item: Amplience.ContentItem;
  allItems: Amplience.ContentItem[];
  contentCount?: number;
};

export type MatchedHierarchyPair = {
  source: SourceHierarchy;
  target: {
    item: Amplience.ContentItem;
    allItems: Amplience.ContentItem[];
  };
};

export type MissingHierarchy = {
  deliveryKey: string;
  schemaId: string;
  name: string;
  contentCount: number;
};

export type BulkSyncSummary = {
  totalSelected: number;
  totalMatched: number;
  totalMissing: number;
  missingHierarchies: MissingHierarchy[];
};

export type BulkSyncHierarchiesOptions = {
  sourceService: AmplienceService;
  targetService: AmplienceService;
  targetRepositoryId: string;
  matchedPairs: MatchedHierarchyPair[];
  updateContent: boolean;
  localeStrategy: LocaleStrategy;
  publishAfterSync: boolean;
  isDryRun: boolean;
};

export type BulkSyncResult = {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    sourceDeliveryKey: string;
    sourceName: string;
    success: boolean;
    error?: string;
    itemsCreated?: number;
    itemsRemoved?: number;
  }>;
};
```

**Expected outcome**: All Step 1.4 tests PASS

---

## Phase 2: Action Layer - Bulk Synchronization Logic

**Objective**: Implement the action layer with full test coverage, including
sequential synchronization, error handling, and result aggregation.

### Steps

#### 2.1 Create action test file

**File**: `src/services/actions/bulk-sync-hierarchies.test.ts`

**Test categories**:

**Sequential Synchronization**:

- ✓ Should process all matched pairs sequentially
- ✓ Should call syncHierarchy for each pair with correct options
- ✓ Should pass locale strategy to each sync operation
- ✓ Should pass updateContent flag to each sync operation
- ✓ Should pass publishAfterSync flag to each sync operation

**Error Handling**:

- ✓ Should continue processing when one hierarchy fails
- ✓ Should track failed hierarchy details
- ✓ Should not stop on first failure
- ✓ Should aggregate all errors

**Progress Tracking**:

- ✓ Should create progress bar with correct total
- ✓ Should increment progress after each hierarchy
- ✓ Should display current hierarchy name in progress
- ✓ Should stop progress bar after completion

**Result Aggregation**:

- ✓ Should count successful synchronizations
- ✓ Should count failed synchronizations
- ✓ Should collect detailed results for each hierarchy
- ✓ Should include items created/removed counts

**Dry-Run Mode**:

- ✓ Should pass isDryRun to individual sync operations
- ✓ Should not modify progress behavior in dry-run
- ✓ Should return proper dry-run results

**Edge Cases**:

- ✓ Should handle empty matched pairs array
- ✓ Should handle all hierarchies failing
- ✓ Should handle single hierarchy processing

**Pattern**: Follow `src/services/actions/sync-hierarchy.test.ts` for mocking
structure

**Mocks needed**:

- `syncHierarchy` action
- `createProgressBar`
- `AmplienceService` methods

**Expected outcome**: All tests FAIL (action doesn't exist yet)

#### 2.2 Implement bulk sync action

**File**: `src/services/actions/bulk-sync-hierarchies.ts`

**Implementation**:

```typescript
export async function bulkSyncHierarchies(
  options: BulkSyncHierarchiesOptions
): Promise<BulkSyncResult>;
```

**Features**:

- Sequential loop through `matchedPairs`
- Try-catch per hierarchy to continue on failures
- Call `syncHierarchy` for each pair
- Track success/failure counts
- Create overall progress bar: "Processing X of Y hierarchies"
- Aggregate results with detailed breakdown
- Return `BulkSyncResult`

**Expected outcome**: All Step 2.1 tests PASS

#### 2.3 Update actions barrel export

**File**: `src/services/actions/index.ts`

**Content**: Export `bulkSyncHierarchies` (no tests needed per testing
guidelines)

#### 2.4 Create utility functions test file

**File**: `src/commands/bulk-sync-hierarchies/utils.test.ts`

**Test categories**:

**Hierarchy Matching**:

- ✓ Should match hierarchies by delivery key AND schema ID
- ✓ Should not match if delivery key matches but schema ID differs
- ✓ Should not match if schema ID matches but delivery key differs
- ✓ Should return matched pairs with source and target data
- ✓ Should identify missing hierarchies (no match in target)
- ✓ Should handle empty source list
- ✓ Should handle empty target list
- ✓ Should handle no matches found

**Missing Hierarchies Report**:

- ✓ Should generate report with delivery key, schema ID, name
- ✓ Should include content count for each missing hierarchy
- ✓ Should format report as markdown
- ✓ Should handle hierarchies without delivery keys
- ✓ Should handle hierarchies without schema IDs

**Report Saving**:

- ✓ Should save report to temp folder with timestamp
- ✓ Should create filename with format:
  missing-hierarchies-YYYY-MM-DD-HH-mm-ss.md
- ✓ Should handle file system errors gracefully

**Edge Cases**:

- ✓ Should handle duplicate delivery keys in source
- ✓ Should handle missing delivery key field
- ✓ Should handle missing schema ID field
- ✓ Should count items in hierarchy tree correctly

**Expected outcome**: All tests FAIL (utils don't exist yet)

#### 2.5 Implement utility functions

**File**: `src/commands/bulk-sync-hierarchies/utils.ts`

**Functions to implement**:

```typescript
export function matchHierarchies(
  sourceItems: SourceHierarchy[],
  targetAllItems: Amplience.ContentItem[]
): {
  matched: MatchedHierarchyPair[];
  missing: MissingHierarchy[];
};

export function generateMissingHierarchiesReport(
  missing: MissingHierarchy[]
): string;

export async function saveMissingHierarchiesReport(
  report: string
): Promise<string>;
```

**Features**:

- Strict matching: `deliveryKey === deliveryKey && schemaId === schemaId`
- Extract delivery key from `body._meta.deliveryKey`
- Extract schema ID from `body._meta.schema`
- Count content items in hierarchy tree
- Generate markdown report
- Save to `temp_export_[timestamp]/` or `reports/` folder
- Return file path

**Expected outcome**: All Step 2.4 tests PASS

---

## Phase 3: Command Layer - User Interaction & Integration

**Objective**: Implement the command orchestration layer with comprehensive test
coverage for all user interaction paths, then integrate into the main
application.

### Steps

#### 3.1 Create command test file

**File**: `src/commands/bulk-sync-hierarchies/bulk-sync-hierarchies.test.ts`

**Test categories**:

**Configuration & Setup**:

- ✓ Should exit early if no hubs configured
- ✓ Should exit early if no repositories available
- ✓ Should load hub configurations correctly

**Source Selection Flow**:

- ✓ Should prompt for source hub selection
- ✓ Should prompt for source repository selection
- ✓ Should use promptForContentItem for filtering
- ✓ Should use promptForMultipleHierarchies for selection
- ✓ Should validate at least one hierarchy selected
- ✓ Should fetch allItems for tree building

**Target Selection Flow**:

- ✓ Should prompt for target hub selection
- ✓ Should prompt for target repository selection
- ✓ Should fetch target repository items

**Hierarchy Matching**:

- ✓ Should call matchHierarchies with source and target items
- ✓ Should display missing hierarchies warning if any
- ✓ Should save missing hierarchies report
- ✓ Should allow user to cancel if all hierarchies missing

**Configuration Prompts**:

- ✓ Should prompt for update content option
- ✓ Should prompt for locale strategy
- ✓ Should prompt for publish after sync option
- ✓ Should prompt for dry-run mode

**Summary & Confirmation**:

- ✓ Should display summary of selected hierarchies
- ✓ Should display matched vs missing counts
- ✓ Should display configuration summary
- ✓ Should prompt for final confirmation
- ✓ Should exit if user declines confirmation

**Service Instantiation**:

- ✓ Should create source AmplienceService with correct credentials
- ✓ Should create target AmplienceService with correct credentials

**Hierarchy Tree Building**:

- ✓ Should build source hierarchy trees using HierarchyService
- ✓ Should use buildHierarchyTreeFromItems (not buildHierarchyTree)
- ✓ Should build trees for all matched pairs

**Action Execution**:

- ✓ Should call bulkSyncHierarchies action with correct options
- ✓ Should pass all configuration options to action
- ✓ Should handle action results

**Results Display**:

- ✓ Should display final summary with success/failure counts
- ✓ Should display detailed results for each hierarchy
- ✓ Should display missing hierarchies reminder

**User Cancellations**:

- ✓ Should exit if user cancels source hub selection
- ✓ Should exit if user cancels source repository selection
- ✓ Should exit if user cancels content item filtering
- ✓ Should exit if user cancels hierarchy selection
- ✓ Should exit if user cancels target hub selection
- ✓ Should exit if user cancels target repository selection
- ✓ Should exit if user cancels final confirmation

**Happy Path Scenarios**:

- ✓ Should complete full flow when all hierarchies match
- ✓ Should complete full flow when some hierarchies missing
- ✓ Should complete dry-run flow

**Pattern**: Follow `src/commands/sync-hierarchy/sync-hierarchy.test.ts` for
structure

**Mocks needed**:

- `app-config` (getHubConfigs)
- All prompts (promptForHub, promptForRepository, promptForContentItem, etc.)
- `bulkSyncHierarchies` action
- `AmplienceService` constructor and methods
- `HierarchyService` methods
- Utility functions (matchHierarchies, generateReport, saveReport)

**Expected outcome**: All tests FAIL (command doesn't exist yet)

#### 3.2 Implement command orchestrator

**File**: `src/commands/bulk-sync-hierarchies/bulk-sync-hierarchies.ts`

**Implementation**:

```typescript
export async function runBulkSyncHierarchies(): Promise<void>;
```

**Flow** (per PRD Section 6):

1. **Load Configuration**
   - Get hub configs
   - Exit if no hubs

2. **Source Selection**
   - promptForHub (source)
   - promptForRepository (source)
   - promptForContentItem (with filters, allItems: true)
   - promptForMultipleHierarchies (multi-select)

3. **Target Selection**
   - promptForHub (target)
   - promptForRepository (target)
   - Fetch all target repository items

4. **Hierarchy Matching**
   - Call matchHierarchies
   - Display missing hierarchies if any
   - Save missing hierarchies report
   - Exit if all missing and user confirms

5. **Configuration**
   - promptForConfirmation (update content)
   - promptForLocaleStrategy
   - promptForConfirmation (publish after sync)
   - promptForDryRun

6. **Summary & Confirmation**
   - Display selected hierarchies list
   - Display missing hierarchies count
   - Display configuration summary
   - promptForConfirmation (final)
   - Exit if declined

7. **Service Instantiation**
   - Create source AmplienceService
   - Create target AmplienceService

8. **Tree Building**
   - Build source hierarchy trees for matched pairs
   - Use HierarchyService.buildHierarchyTreeFromItems

9. **Execution**
   - Call bulkSyncHierarchies action
   - Display progress

10. **Results**
    - Display final summary
    - Display detailed results
    - Display missing hierarchies reminder

**Expected outcome**: All Step 3.1 tests PASS

#### 3.3 Create command barrel export

**File**: `src/commands/bulk-sync-hierarchies/index.ts`

**Content**: Export `runBulkSyncHierarchies` (no tests needed per testing
guidelines)

#### 3.4 Update main commands barrel

**File**: `src/commands/index.ts`

**Content**: Export `runBulkSyncHierarchies` from bulk-sync-hierarchies (no new
tests needed)

#### 3.5 Write integration test for main index

**File**: `src/index.test.ts` (extend existing if present, or create new)

**Tests to write**:

- ✓ Should call runBulkSyncHierarchies when command is 'bulk-sync-hierarchies'
- ✓ Should import runBulkSyncHierarchies from commands
- ✓ Should handle command argument correctly

**Expected outcome**: Tests FAIL (integration not added yet)

#### 3.6 Integrate command into main entry point

**File**: `src/index.ts`

**Changes**:

- Add import: `import { runBulkSyncHierarchies } from '~/commands';`
- Add case to switch statement:
  ```typescript
  case 'bulk-sync-hierarchies':
    await runBulkSyncHierarchies();
    break;
  ```

**Pattern**: Follow existing commands in switch statement

**Expected outcome**: All Step 3.5 tests PASS

#### 3.7 Run full test suite validation

**Commands to execute**:

```bash
npm test
npm run test:coverage
```

**Validation checklist**:

- [ ] All new tests pass
- [ ] All existing tests still pass (no regressions)
- [ ] Coverage >80% for new code
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors

**Expected outcome**: All tests GREEN, coverage targets met

#### 3.8 Create command documentation

**File**: `docs/bulk-sync-hierarchies.md`

**Sections to include**:

1. **Feature Overview**
   - Purpose and use cases
   - When to use vs single sync-hierarchy

2. **How It Works**
   - Step-by-step user flow
   - Matching criteria explanation
   - Missing hierarchies handling

3. **Configuration Options**
   - Update content mode
   - Locale strategies
   - Publish after sync
   - Dry-run mode

4. **Missing Hierarchies Report**
   - Format and location
   - What's included
   - How to use

5. **Best Practices**
   - Recommended workflow
   - Testing strategies
   - Error recovery

6. **Troubleshooting**
   - Common issues
   - Error messages
   - Solutions

7. **Examples**
   - Complete happy path example
   - Partial match scenario
   - Dry-run example

#### 3.9 Update main README

**File**: `README.md`

**Changes**:

- Add `bulk-sync-hierarchies` to available commands list
- Add brief description: "Synchronize multiple content item hierarchies from
  source to target hub/repository"
- Add link to detailed documentation:
  `[docs/bulk-sync-hierarchies.md](docs/bulk-sync-hierarchies.md)`

---

## Test Coverage Targets

### Per-File Coverage Goals

| File                               | Coverage Target | Critical Areas                        |
| ---------------------------------- | --------------- | ------------------------------------- |
| prompt-for-multiple-hierarchies.ts | >90%            | Selection logic, validation           |
| bulk-sync-hierarchies.ts (action)  | >85%            | Error handling, sequential processing |
| utils.ts                           | >90%            | Matching logic, report generation     |
| bulk-sync-hierarchies.ts (command) | >80%            | Flow orchestration, user interactions |

### Overall Project Coverage

- **New code**: >80% coverage minimum
- **Existing code**: No regression (maintain current coverage)

---

## Testing Best Practices for This Feature

### 1. Mock External Dependencies

```typescript
// Mock dotenv to prevent loading from .env files
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock inquirer for prompts
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock actions
vi.mock('~/services/actions/sync-hierarchy', () => ({
  syncHierarchy: vi.fn(),
}));
```

### 2. Use Helper Functions

```typescript
// Create test data generators
function createMockContentItem(
  deliveryKey: string,
  schemaId: string
): Amplience.ContentItem {
  return {
    id: `item-${deliveryKey}`,
    label: `Test ${deliveryKey}`,
    body: {
      _meta: {
        deliveryKey,
        schema: schemaId,
      },
    },
  } as Amplience.ContentItem;
}
```

### 3. Organize Tests by Feature

```typescript
describe('bulkSyncHierarchies', () => {
  describe('sequential synchronization', () => {
    // Tests for sync flow
  });

  describe('error handling', () => {
    // Tests for failures
  });

  describe('progress tracking', () => {
    // Tests for progress
  });
});
```

### 4. Test Edge Cases

- Empty arrays
- Missing properties
- API failures
- User cancellations
- All success scenarios
- All failure scenarios
- Mixed success/failure

---

## Definition of Done

### Phase 1 Complete When:

- [ ] All prompt tests written and passing
- [ ] Multi-select prompt implemented and working
- [ ] All type tests written and passing
- [ ] Type definitions created and exported
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Phase 2 Complete When:

- [ ] All action tests written and passing
- [ ] Bulk sync action implemented and working
- [ ] All utility tests written and passing
- [ ] Utilities implemented (matching, reporting)
- [ ] Action exported from barrel
- [ ] Coverage >85% for action layer

### Phase 3 Complete When:

- [ ] All command tests written and passing
- [ ] Command orchestrator implemented and working
- [ ] Integration tests written and passing
- [ ] Command integrated into main index
- [ ] Documentation complete
- [ ] README updated
- [ ] All tests passing (new and existing)
- [ ] Coverage >80% for entire feature
- [ ] No regressions in existing functionality

---

## Risk Mitigation

### Potential Issues

1. **Performance with Many Hierarchies**
   - **Mitigation**: Sequential processing (not parallel) to avoid rate limiting
   - **Future**: Add configurable batch sizes

2. **Memory Usage with Large Trees**
   - **Mitigation**: Process one hierarchy at a time, clear references
   - **Monitoring**: Test with large hierarchies (100+ items)

3. **Complex Test Setup**
   - **Mitigation**: Create reusable test helpers and mock factories
   - **Documentation**: Document mock patterns in test files

4. **Error Recovery**
   - **Mitigation**: Continue on individual failures, detailed error reporting
   - **Future**: Implement resume functionality

---

## Further Considerations

### 1. Performance Testing

**Question**: Should we add performance tests for processing 10+ hierarchies
with 100+ items each?

**Recommendation**: Add as optional Phase 4 after core functionality is
complete:

- Integration test with large datasets
- Measure execution time
- Validate <5 minute target
- Monitor memory usage

### 2. Error Recovery Strategy

**Question**: Should we implement resume mechanism for failed hierarchies?

**Recommendation**: Mark as future enhancement (per PRD Section 12):

- Current: Detailed error reporting allows manual retry
- Future: Save state, allow resume from last successful point
- Complexity: High, defer to v2

### 3. Rate Limiting

**Question**: Should we add configurable delays between hierarchy syncs?

**Recommendation**: Add if performance testing reveals API rate limit issues:

- Start without delays (simplest implementation)
- Add if needed during validation phase
- Make configurable via prompt or config file

---

## Success Metrics

### Functional Success

- [ ] Can select multiple hierarchies with checkboxes
- [ ] "Select All" option works correctly
- [ ] Hierarchies matched by delivery key + schema ID
- [ ] Missing hierarchies reported with full details
- [ ] Report saved to temp folder
- [ ] All matched hierarchies synchronized
- [ ] Failures don't stop remaining processing
- [ ] Progress displayed (overall and per-hierarchy)
- [ ] Final summary shows all results

### Quality Success

- [ ] > 80% test coverage for new code
- [ ] All tests passing (0 failures)
- [ ] No regressions in existing tests
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code follows project conventions

### User Experience Success

- [ ] Clear progress indicators
- [ ] Meaningful error messages
- [ ] Comprehensive summary
- [ ] Documentation clear and complete
- [ ] Flow intuitive and consistent with existing commands

---

**END OF PLAN**

This TDD implementation plan ensures that all code is validated by tests before
implementation, reducing bugs and ensuring high quality. The phased approach
allows for incremental progress with clear checkpoints and validation gates.
