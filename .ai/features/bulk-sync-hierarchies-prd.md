## Product Requirements Document (PRD)

### Feature: Bulk Sync Hierarchies

**Document Version:** 1.0  
**Date:** December 16, 2025  
**Author:** AI Senior Software Engineer

---

## 1. Feature Overview

The `bulk-sync-hierarchies` command extends the existing `sync-hierarchy`
functionality to support synchronizing multiple content item hierarchies from a
source hub/repository to a target hub/repository in a single operation. This
feature enables efficient bulk migration and synchronization of hierarchical
content structures.

---

## 2. Technical Context

### 2.1 Existing Foundation

The application already implements:

- **sync-hierarchy command** (sync-hierarchy) - Single hierarchy synchronization
- **HierarchyService** (hierarchy-service.ts) - Hierarchy tree building and sync
  plan generation
- **syncHierarchy action** (sync-hierarchy.ts) - Synchronization execution
- **promptForContentItem** (prompt-for-content-item.ts) - Single item selection
  with filtering
- **Multi-select patterns** - Used in `promptForItemsToClean`,
  `promptForItemsToRecreate`, `promptForContentTypesToSync`
- **Locale strategy handling** (prompt-for-locale-strategy.ts)
- **Dry-run mode support** - Implemented across all commands
- **Progress reporting** - Using `createProgressBar` utility

### 2.2 Architecture Pattern

The application follows the **Command → Action** pattern:

- **Commands** (commands) - UI orchestration, prompts, user feedback
- **Actions** (actions) - Business logic, API interactions
- **Shared Utilities** (shared) - Reusable command patterns

---

## 3. Requirements

### 3.1 User Clarifications & Decisions

Based on the user responses:

1. **Multiple Selection Mechanism (B)**: Display all matching hierarchies with
   checkboxes, provide "Select All" and "Select None" options, then allow
   individual item toggling (using Inquirer.js checkbox prompts)

2. **Partial Synchronization Handling (A)**: Show warning message listing
   missing hierarchies, then proceed with only the matching hierarchies
   automatically

3. **Hierarchy Matching Strategy (B)**: Match by delivery key AND schema ID to
   prevent type mismatches

4. **Locale Strategy (A)**: Ask once globally and apply the same strategy to all
   hierarchies

5. **Progress Display (C)**: Show both overall progress bar and current
   hierarchy details

6. **Failure Handling (B)**: Continue with remaining hierarchies and report
   failures at the end

7. **Target Filtering (A)**: No additional filtering on target - only exact
   matches by delivery key + schema ID

8. **Missing Hierarchies Report (C)**: Include delivery key, schema ID, name,
   and content item count from source

9. **Dry-Run Support (A)**: Full dry-run mode support following project pattern

10. **Final Confirmation (A)**: Show summary of all selected hierarchies and ask
    to confirm

### 3.2 Functional Requirements

#### FR-1: Source Selection with Multiple Item Selection

**Description**: Allow users to select multiple source hierarchies after
filtering

**Acceptance Criteria**:

- Reuse existing filtering logic from `promptForContentItem`
- Display filtered results with checkbox selection
- Include "✓ Select All" option at the top
- Support individual selection/deselection
- Validate at least one hierarchy is selected
- Return selected hierarchies with their associated data (allItems for tree
  building)

#### FR-2: Exact Matching by Delivery Key + Schema ID

**Description**: Match source hierarchies to target hierarchies using strict
criteria

**Acceptance Criteria**:

- For each source hierarchy, search target repository for content item with:
  - Same delivery key (body.\_meta.deliveryKey)
  - Same schema ID (body.\_meta.schema)
- If match found, prepare for synchronization
- If match not found, add to missing hierarchies report
- No user interaction required for matching logic

#### FR-3: Missing Hierarchies Report

**Description**: Generate detailed report of hierarchies that don't exist in
target

**Acceptance Criteria**:

- Report includes for each missing hierarchy:
  - Source delivery key
  - Source schema ID
  - Source hierarchy name (label)
  - Count of content items in source hierarchy tree
- Report shown to user before final confirmation
- Report saved to temp folder with timestamp
- Report included in final operation summary

#### FR-4: Sequential Synchronization

**Description**: Synchronize matched hierarchies one by one

**Acceptance Criteria**:

- Each matched hierarchy pair processed sequentially
- Reuse existing `syncHierarchy` action for each pair
- Same locale strategy applied to all hierarchies
- Same configuration (updateContent, publishAfterSync) for all
- Progress indicators show current hierarchy and overall progress
- Failures logged but don't stop processing of remaining hierarchies

#### FR-5: Global Locale Strategy

**Description**: Apply single locale strategy to all hierarchies

**Acceptance Criteria**:

- Prompt once using existing `promptForLocaleStrategy`
- Support all existing strategies: keep, remove, replace
- Apply consistently across all hierarchy synchronizations
- Display selected strategy in configuration summary

#### FR-6: Comprehensive Progress Reporting

**Description**: Provide detailed progress visibility during bulk operations

**Acceptance Criteria**:

- Overall progress bar showing X of Y hierarchies
- Current hierarchy details (name, delivery key)
- Individual operation progress (creates, removes)
- Summary at the end with success/failure counts
- Detailed error messages for failures

#### FR-7: Dry-Run Mode

**Description**: Support preview mode without executing changes

**Acceptance Criteria**:

- Follow existing dry-run pattern from sync-hierarchy
- Generate sync plans for all matched hierarchies
- Display what would be synchronized for each
- Show aggregate statistics (total creates, removes across all hierarchies)
- No API modifications during dry-run
- Ask for confirmation to proceed with live execution after dry-run review

#### FR-8: Final Confirmation with Summary

**Description**: Show comprehensive summary before execution

**Acceptance Criteria**:

- Display list of all selected source hierarchies
- Show matched target hierarchies
- List missing hierarchies (if any)
- Display configuration: locale strategy, update content, publish after sync
- Show aggregate operation scope (total items across all hierarchies)
- Require explicit confirmation to proceed
- Default answer: No/False

---

## 4. Technical Design

### 4.1 File Structure

```
src/commands/bulk-sync-hierarchies/
├── index.ts                              # Barrel export
├── bulk-sync-hierarchies.ts             # Command orchestrator
├── bulk-sync-hierarchies.test.ts        # Unit tests
├── prompts/
│   ├── index.ts                         # Barrel export
│   ├── prompt-for-multiple-hierarchies.ts      # Multi-select prompt
│   └── prompt-for-multiple-hierarchies.test.ts # Tests
└── utils.ts                              # Helper functions (optional)

src/services/actions/
├── bulk-sync-hierarchies.ts             # Action executor
└── bulk-sync-hierarchies.test.ts       # Unit tests
```

### 4.2 Component Responsibilities

#### Command: `runBulkSyncHierarchies`

**Responsibilities**:

- User interaction orchestration
- Source hub/repo/content filtering
- Multiple hierarchy selection
- Target hub/repo selection
- Hierarchy matching coordination
- Missing hierarchies report generation
- Configuration gathering (locale, publish, dry-run)
- Final confirmation
- Action invocation
- Progress monitoring
- Results summary display

**Does NOT**:

- Execute API operations
- Build hierarchy trees
- Generate sync plans
- Transform content

#### Action: `bulkSyncHierarchies`

**Responsibilities**:

- Sequential synchronization execution
- Calling `syncHierarchy` for each matched pair
- Progress tracking across all hierarchies
- Error aggregation
- Result compilation
- Failure resilience (continue on errors)

**Does NOT**:

- Handle user prompts
- Display UI elements
- Make matching decisions

#### Prompt: `promptForMultipleHierarchies`

**Responsibilities**:

- Display filtered hierarchies with checkboxes
- Provide "Select All" option
- Handle selection logic
- Validate selection (at least one item)
- Return selected items array

**Does NOT**:

- Fetch content items (receives pre-filtered list)
- Build hierarchy trees
- Match hierarchies

### 4.3 Data Flow

```
1. Source Selection
   ├─ promptForHub → sourceHub
   ├─ promptForRepository → sourceRepo
   ├─ promptForContentItem (filtering) → filteredItems, allItems
   └─ promptForMultipleHierarchies → selectedSourceHierarchies[]

2. Target Selection
   ├─ promptForHub → targetHub
   └─ promptForRepository → targetRepo

3. Hierarchy Matching
   ├─ For each source hierarchy:
   │  ├─ Search target allItems by deliveryKey + schemaId
   │  ├─ If found → matchedPairs[]
   │  └─ If not found → missingHierarchies[]
   └─ Build source trees for matched hierarchies

4. Configuration
   ├─ promptForConfirmation (update content)
   ├─ promptForLocaleStrategy (global)
   ├─ promptForConfirmation (publish after sync)
   └─ promptForDryRun

5. Summary & Confirmation
   ├─ Display selected hierarchies
   ├─ Display missing hierarchies report
   ├─ Display configuration
   ├─ Save missing hierarchies report to temp folder
   └─ promptForConfirmation (final)

6. Execution
   └─ bulkSyncHierarchies action
      ├─ For each matchedPair:
      │  ├─ Build target tree
      │  ├─ Call syncHierarchy action
      │  ├─ Track result (success/failure)
      │  └─ Update progress
      └─ Return aggregated results

7. Final Report
   ├─ Display success/failure counts
   ├─ Display missing hierarchies summary
   └─ Show detailed errors if any
```

### 4.4 Key Interfaces

```typescript
// Command Types
type SourceHierarchy = {
  item: Amplience.ContentItem;
  allItems: Amplience.ContentItem[]; // For tree building
  contentCount?: number; // For reporting
};

type MatchedHierarchyPair = {
  source: SourceHierarchy;
  target: {
    item: Amplience.ContentItem;
    allItems: Amplience.ContentItem[];
  };
};

type MissingHierarchy = {
  deliveryKey: string;
  schemaId: string;
  name: string;
  contentCount: number;
};

type BulkSyncSummary = {
  totalSelected: number;
  totalMatched: number;
  totalMissing: number;
  missingHierarchies: MissingHierarchy[];
};

// Action Types
type BulkSyncHierarchiesOptions = {
  sourceService: AmplienceService;
  targetService: AmplienceService;
  targetRepositoryId: string;
  matchedPairs: MatchedHierarchyPair[];
  updateContent: boolean;
  localeStrategy: LocaleStrategy;
  publishAfterSync: boolean;
  isDryRun: boolean;
};

type BulkSyncResult = {
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

### 4.5 Prompt Implementation

```typescript
// src/commands/bulk-sync-hierarchies/prompts/prompt-for-multiple-hierarchies.ts
export async function promptForMultipleHierarchies(
  filteredItems: Amplience.ContentItem[]
): Promise<Amplience.ContentItem[]> {
  const choices = [
    {
      name: '✓ Select All',
      value: 'SELECT_ALL',
    },
    new inquirer.Separator(),
    ...filteredItems.map(item => ({
      name: `${item.label} (${item.body._meta?.deliveryKey || 'no-key'}) - ${item.body._meta?.schema || 'no-schema'}`,
      value: item.id,
    })),
  ];

  const { selectedIds } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedIds',
    message: `Select hierarchies to synchronize (${filteredItems.length} found):`,
    choices,
    validate: (answer: string[]) => {
      if (answer.length === 0) {
        return 'You must select at least one hierarchy.';
      }
      return true;
    },
  });

  // Handle "Select All"
  if (selectedIds.includes('SELECT_ALL')) {
    return filteredItems;
  }

  return filteredItems.filter(item => selectedIds.includes(item.id));
}
```

### 4.6 Reusable Code

**From sync-hierarchy**:

- `promptForHub` - Hub selection
- `promptForRepository` - Repository selection
- `promptForContentItem` - Initial filtering (source selection)
- `promptForLocaleStrategy` - Locale handling
- `promptForDryRun` - Dry-run mode
- `promptForConfirmation` - User confirmations
- `HierarchyService.buildHierarchyTreeFromItems` - Tree building
- `HierarchyService.generateSyncPlan` - Plan generation
- `syncHierarchy` action - Individual sync execution

**From other commands**:

- `promptForItemsToRecreate` pattern - Multi-select with "Select All"
- `createProgressBar` - Progress tracking
- `displayTable` - Report display

---

## 5. Edge Cases & Error Handling

### 5.1 Edge Cases

| Scenario                                                               | Handling                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| All source hierarchies missing in target                               | Show warning, display missing report, allow user to cancel operation |
| Some hierarchies missing in target                                     | Show partial match warning, proceed with matched pairs only          |
| No hierarchies selected                                                | Validation prevents this, show error if attempted                    |
| Target hierarchy has different schema ID despite matching delivery key | Not matched (strict schema ID + delivery key matching)               |
| Source hierarchy with no children                                      | Still synchronized (single root item)                                |
| Very large number of hierarchies (>100)                                | Initial `promptForContentItem` filtering prevents this               |
| Duplicate delivery keys in source selection                            | Allowed by design (user might intentionally select)                  |
| Network failure during bulk operation                                  | Continue with remaining hierarchies, report failure for affected one |
| Target hierarchy in use/locked                                         | Report error for that hierarchy, continue with others                |

### 5.2 Error Handling Strategy

1. **Pre-execution Validation**
   - Validate hub configurations
   - Validate repository access
   - Validate at least one hierarchy selected
   - Validate at least one match found (or warn)

2. **During Execution**
   - Wrap each hierarchy sync in try-catch
   - Log error details
   - Continue with next hierarchy
   - Aggregate all errors

3. **Post-execution Reporting**
   - Display success count
   - Display failure count
   - List all errors with hierarchy identification
   - Save detailed report to temp folder

---

## 6. User Experience Flow

### Step-by-Step Interaction

```
🔄 Starting Bulk Hierarchy Synchronization
==========================================

📍 Step 1: Select SOURCE hierarchies
? Select a hub: › DEV
? Select a repository: › Content Repository
? Filter by schema ID (leave blank for any): › hierarchy
? Filter by label (partial match, leave blank for any): ›
? Filter by delivery key (partial match, leave blank for any): ›
Searching for content items...
Found 5 matching hierarchies

? Select hierarchies to synchronize (5 found):
  ✓ Select All
  ──────────────
  ☑ Main Navigation (nav-main) - https://schema.com/navigation
  ☑ Footer Links (nav-footer) - https://schema.com/navigation
  ☑ Product Categories (cat-products) - https://schema.com/category
  ☐ Help Center (help-center) - https://schema.com/category
  ☐ Blog Structure (blog-main) - https://schema.com/hierarchy

✅ Selected 3 hierarchies for synchronization

🎯 Step 2: Select TARGET hub & repository
? Select a hub: › PROD
? Select a repository: › Content Repository

🔍 Step 3: Matching hierarchies...
Searching target repository for matching hierarchies...

✅ Matched: 2 hierarchies found in target
  • nav-main → nav-main (https://schema.com/navigation)
  • nav-footer → nav-footer (https://schema.com/navigation)

⚠️  Missing: 1 hierarchy not found in target
  • cat-products (https://schema.com/category)
    Name: Product Categories
    Content items in source: 12

📋 Missing hierarchies report saved to: reports/missing-hierarchies-2025-12-16-14-30-45.md

⚙️  Step 4: Configuration Options
? Update content of existing items (body comparison)? › No
? Select locale strategy for delivery keys: › Keep original locale
? Publish content items after synchronization? › Yes
? Run in dry-run mode (preview changes without executing)? › No

✅ Configuration:
  • Structure only (no content updates)
  • Locale: Keep original
  • Publish after sync
  • EXECUTE (not dry-run)

📊 Step 5: Summary
Source Hub: DEV / Content Repository
Target Hub: PROD / Content Repository

Hierarchies to synchronize: 2
  1. Main Navigation (nav-main)
     Schema: https://schema.com/navigation
     Source items: 8

  2. Footer Links (nav-footer)
     Schema: https://schema.com/navigation
     Source items: 5

Missing hierarchies: 1
  • Product Categories (cat-products) - 12 items

Total operations across all hierarchies: ~26 content items

? Do you want to proceed with these changes? › No / Yes
✅ Confirmed. Proceeding with bulk synchronization...

🏗️  Step 6: Building Hierarchies
Building hierarchy trees for 2 matched pairs...
✅ All hierarchy trees built

🚀 Step 7: Executing Bulk Synchronization
Progress: 1/2 hierarchies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 50%

Current: Main Navigation (nav-main)
  📋 Generating synchronization plan...
  ✅ Plan: 2 to create, 1 to remove
  🆕 Creating 2 items...
  🗑️  Removing 1 items...
  ✅ Hierarchy synchronization completed successfully!

Progress: 2/2 hierarchies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

Current: Footer Links (nav-footer)
  📋 Generating synchronization plan...
  ✅ Plan: 1 to create, 0 to remove
  🆕 Creating 1 items...
  ✅ Hierarchy synchronization completed successfully!

✅ Bulk Synchronization Complete!

📊 Final Summary:
  • Total selected: 3 hierarchies
  • Matched & processed: 2 hierarchies
  • Missing in target: 1 hierarchy
  • Successfully synchronized: 2 hierarchies
  • Failed: 0 hierarchies
  • Total items created: 3
  • Total items removed: 1

⚠️  Reminder: 1 hierarchy not found in target (see report)

Detailed results:
  ✅ Main Navigation (nav-main): 2 created, 1 removed
  ✅ Footer Links (nav-footer): 1 created, 0 removed

📄 Missing hierarchies report: reports/missing-hierarchies-2025-12-16-14-30-45.md
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Command Tests** (`bulk-sync-hierarchies.test.ts`):

- Hub selection flow
- Repository selection flow
- Multiple hierarchy selection
- Hierarchy matching logic
- Missing hierarchies report generation
- Configuration gathering
- Error handling
- Cancellation scenarios

**Action Tests** (`bulk-sync-hierarchies.test.ts`):

- Sequential synchronization execution
- Success result aggregation
- Failure handling and continuation
- Progress tracking
- Dry-run mode behavior

**Prompt Tests** (`prompt-for-multiple-hierarchies.test.ts`):

- "Select All" functionality
- Individual selection
- Validation (at least one selected)
- Empty list handling

### 7.2 Integration Scenarios

1. **Happy Path**: All selected hierarchies match in target
2. **Partial Match**: Some hierarchies missing in target
3. **All Missing**: No hierarchies found in target
4. **Mixed Success**: Some sync operations succeed, others fail
5. **Dry-Run**: No API modifications, proper plan display
6. **Locale Strategies**: All three strategies (keep, remove, replace)
7. **Large Hierarchies**: Multiple levels deep with many children

### 7.3 Test Coverage Goals

- Unit test coverage: >80%
- All user interaction paths covered
- All error scenarios tested
- Mock external dependencies (AmplienceService, HierarchyService)

---

## 8. Documentation Requirements

### 8.1 Command Documentation

**File**: `docs/bulk-sync-hierarchies.md`

**Sections**:

- Feature overview
- Use cases
- How it works (step-by-step)
- Configuration options
- Missing hierarchies report format
- Matching criteria explanation
- Best practices
- Troubleshooting
- Examples

### 8.2 User Guidance

- Clear messaging about matching criteria (delivery key + schema ID)
- Warnings about missing hierarchies
- Explanation of why hierarchies might not match
- Recommendations for handling missing hierarchies
- Dry-run best practices

### 8.3 Code Documentation

- JSDoc comments for all public functions
- Inline comments for complex matching logic
- Type definitions with descriptions
- Examples in function documentation

---

## 9. Success Criteria

### 9.1 Functional Success

- [ ] Users can select multiple source hierarchies using checkbox UI
- [ ] Hierarchies matched by delivery key + schema ID
- [ ] Missing hierarchies reported with full details
- [ ] Report saved to temp folder with timestamp
- [ ] All matched hierarchies synchronized successfully
- [ ] Failures don't stop processing of remaining hierarchies
- [ ] Overall and per-hierarchy progress displayed
- [ ] Final summary shows all results

### 9.2 Non-Functional Success

- [ ] Performance: Processes 10 hierarchies with ~100 items each in <5 minutes
- [ ] Error resilience: Continues after individual failures
- [ ] User experience: Clear progress and status indicators
- [ ] Code quality: Follows project patterns and conventions
- [ ] Test coverage: >80% for new code
- [ ] Documentation: Complete and clear

### 9.3 Integration Success

- [ ] Registered in main command list
- [ ] Exported from commands barrel
- [ ] Integrated with main index.ts switch statement
- [ ] Documentation added to main README.md
- [ ] No breaking changes to existing commands

---

## 10. Implementation Checklist

### Phase 1: Command Structure

- [ ] Create command directory structure
- [ ] Implement command orchestrator skeleton
- [ ] Add command to main index exports
- [ ] Register in command switch statement

### Phase 2: Prompts

- [ ] Implement `promptForMultipleHierarchies`
- [ ] Write tests for multi-select prompt
- [ ] Integrate with existing prompts

### Phase 3: Matching Logic

- [ ] Implement hierarchy matching by deliveryKey + schemaId
- [ ] Build missing hierarchies report structure
- [ ] Implement report saving to temp folder
- [ ] Write tests for matching logic

### Phase 4: Action Implementation

- [ ] Create `bulkSyncHierarchies` action
- [ ] Implement sequential synchronization loop
- [ ] Add progress tracking
- [ ] Implement error aggregation
- [ ] Write action unit tests

### Phase 5: Integration

- [ ] Connect command to action
- [ ] Implement progress reporting
- [ ] Add final summary display
- [ ] Test end-to-end flow

### Phase 6: Documentation

- [ ] Write command documentation
- [ ] Update main README
- [ ] Add inline code comments
- [ ] Create usage examples

### Phase 7: Testing

- [ ] Complete unit test coverage
- [ ] Manual testing with real data
- [ ] Edge case validation
- [ ] Performance testing

---

## 11. Dependencies & Risks

### 11.1 Dependencies

- **Internal**: Requires no changes to existing commands or actions
- **External**: Amplience API must support hierarchical content queries
- **Libraries**: Inquirer.js for checkbox prompts

### 11.2 Risks

| Risk                                          | Impact | Likelihood | Mitigation                                         |
| --------------------------------------------- | ------ | ---------- | -------------------------------------------------- |
| Performance degradation with many hierarchies | High   | Medium     | Add hierarchy count warnings, recommend batching   |
| API rate limiting during bulk operations      | High   | Low        | Implement rate limiting, add delays between syncs  |
| Memory usage with large hierarchies           | Medium | Low        | Process hierarchies sequentially, clear references |
| User confusion about matching criteria        | Medium | Medium     | Clear documentation, warning messages              |
| Partial failures difficult to recover         | Medium | Low        | Detailed error reporting, resume capability        |

### 11.3 Assumptions

- Source hierarchies are properly formed with valid delivery keys and schema IDs
- Target repository is accessible and writeable
- Network connectivity stable for duration of bulk operation
- Users understand hierarchy concept and matching criteria
- Hierarchies don't have circular references

---

## 12. Future Enhancements (Out of Scope)

1. **Resume Failed Operations**: Ability to retry only failed hierarchies from
   previous run
2. **Parallel Synchronization**: Process multiple hierarchies concurrently (with
   rate limiting)
3. **Auto-Create Missing Hierarchies**: Option to create root items in target if
   missing
4. **Custom Matching Rules**: Allow users to define alternative matching
   strategies
5. **Batch Size Control**: Let users specify how many hierarchies to process at
   once
6. **Hierarchy Preview**: Visual tree preview before synchronization
7. **Conflict Resolution**: Interactive handling of content conflicts
8. **Scheduling**: Schedule bulk sync operations for off-peak hours

---

**END OF DOCUMENT**

This PRD provides a complete specification for implementing the
`bulk-sync-hierarchies` command. The design leverages existing patterns and
code, ensures proper error handling, and follows the established architecture of
the application. Implementation can proceed with confidence that all
requirements, edge cases, and technical considerations have been addressed.
