# Implementation Plan: VSE Bulk Visualizations

> **Status**: Planning
> **Created**: 2026-01-16
> **PRD Version**: 2026-01-16

---

## Summary

**Total Phases**: 5
**Estimated Scope**: Medium
**Testing Approach**: TDD - write tests before implementation for all business logic

---

## Phase 1: Foundation & Command Structure

**Goal**: Establish VSE Management parent command with basic sub-command structure and file handling

### Tasks

- [x] Task 1.1: Write unit tests for JSON file parsing and validation (content types list, visualization config)
- [x] Task 1.2: Create utility functions for JSON file parsing (content types list array, visualization config object)
- [x] Task 1.3: Write unit tests for environment variable validation (`AMP_HUB_*_VISUALISATION_APP_URL`, default file paths)
- [x] Task 1.4: Create environment validation utility functions
- [x] Task 1.5: Create `src/commands/vse-management/` directory structure with `index.ts`, `vse-management.ts`
- [x] Task 1.6: Write tests for VSE Management parent command prompt selection
- [x] Task 1.7: Implement parent command orchestrator with sub-command selection prompt (follow `manage-extensions` pattern)
- [x] Task 1.8: Create `src/commands/vse-management/bulk-update-visualizations/` sub-command directory structure
- [x] Task 1.9: Create barrel exports for vse-management command

### Deliverables

- VSE Management parent command appears in main CLI menu
- Sub-command directory structure ready for bulk visualizations
- JSON file parsing utilities tested and working
- Environment variable validation working
- All code has corresponding unit tests

### Dependencies

- None

---

## Phase 2: Content Type Selection

**Goal**: Implement both content type selection methods (API filtering and file-based)

### Tasks

- [x] Task 2.1: Write unit tests for regex pattern filtering logic against content type URIs
- [x] Task 2.2: Implement content type filtering utility function
- [x] Task 2.3: Write unit tests for prompt-for-content-type-selection-method (API vs File)
- [x] Task 2.4: Create prompt for selection method choice in `prompts/` subdirectory
- [x] Task 2.5: Write unit tests for prompt-for-regex-pattern (with AMP_DEFAULT_SCHEMA_ID default)
- [x] Task 2.6: Create prompt for regex pattern input
- [x] Task 2.7: Write unit tests for prompt-for-content-types-file (with AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE default)
- [x] Task 2.8: Create prompt for file path input
- [x] Task 2.9: Write unit tests for content type multiselect prompt formatting `[label] (contentTypeUri)`
- [x] Task 2.10: Create multiselect prompt for content types from API results
- [x] Task 2.11: Write integration tests for complete content type selection flow (API + File methods)
- [x] Task 2.12: Integrate selection logic into bulk-update-visualizations command

### Deliverables

- Users can select content types via API filtering with regex
- Users can select content types via JSON file
- Default values from environment variables work correctly
- Multiselect prompt displays content types in required format
- All selection logic fully tested

### Dependencies

- Phase 1 complete (JSON parsing, env validation)

---

## Phase 3: Visualization Configuration & URL Replacement

**Goal**: Parse visualization config and implement URL origin replacement with hub-specific URLs

### Tasks

- [x] Task 3.1: Write unit tests for visualization config JSON structure validation
- [x] Task 3.2: Implement visualization config validation function
- [x] Task 3.3: Write unit tests for `{{ORIGIN_REPLACE}}` placeholder replacement logic (preserve paths, query params, other template vars)
- [x] Task 3.4: Create URL replacement utility function
- [x] Task 3.5: Write unit tests for hub-specific URL retrieval from environment (`AMP_HUB_<HUBNAME>_VISUALISATION_APP_URL`)
- [x] Task 3.6: Implement hub URL retrieval function with error handling
- [x] Task 3.7: Write unit tests for prompt-for-visualization-config-file (with AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE default)
- [x] Task 3.8: Create prompt for visualization config file path
- [x] Task 3.9: Write unit tests for confirmation summary display (content types, parsed config, hub name, count)
- [x] Task 3.10: Create confirmation summary utility and prompt
- [x] Task 3.11: Write integration tests for complete config parsing and URL replacement flow
- [x] Task 3.12: Integrate visualization config handling into bulk-update-visualizations command

### Deliverables

- Visualization config JSON parsed and validated
- URL replacement working correctly with placeholder
- Hub-specific environment variable validation functional
- Confirmation summary displays all required information
- All URL replacement logic fully tested

### Dependencies

- Phase 1 complete (env validation utilities)
- Phase 2 complete (content type selection)

---

## Phase 4: Bulk Update & Progress Tracking

**Goal**: Implement the core action for bulk content type updates with progress tracking and error handling

### Tasks

- [x] Task 4.1: Write unit tests for action function signature and context object structure
- [x] Task 4.2: Create action file `src/services/actions/bulk-update-content-type-visualizations.ts` with type definitions
- [x] Task 4.3: Write unit tests for PATCH request formatting (content type visualization update)
- [x] Task 4.4: Implement PATCH request logic using AmplienceService
- [x] Task 4.5: Write unit tests for error collection during partial failures (collect errors, continue processing)
- [x] Task 4.6: Implement error handling that continues processing all content types
- [x] Task 4.7: Write unit tests for progress tracking integration (mock progress bar)
- [x] Task 4.8: Integrate progress bar using `createProgressBar()` utility
- [x] Task 4.9: Write integration tests for bulk update action with AmplienceService mocks
- [x] Task 4.10: Integrate action into bulk-update-visualizations command with progress tracking
- [x] Task 4.11: Write end-to-end test for complete command flow (mocked API calls)

### Deliverables

- Bulk update action handles PATCH requests via AmplienceService
- Progress bar displays during bulk operations
- Partial failures handled gracefully (continue processing)
- Errors collected with full context
- Action fully tested with mocked API calls
- Command orchestration complete and tested

### Dependencies

- Phase 3 complete (visualization config and URL replacement)
- Existing `AmplienceService` and `createProgressBar()` utilities

---

## Phase 5: Reports, Dry-run & Integration

**Goal**: Add markdown reporting, dry-run mode, and integrate command into main CLI

### Tasks

- [x] Task 5.1: Write unit tests for report structure and content formatting
- [x] Task 5.2: Implement markdown report generation following existing CLI report patterns
- [x] Task 5.3: Write unit tests for dry-run mode flag handling (skip API calls, show preview)
- [x] Task 5.4: Implement dry-run mode in action (conditional API execution)
- [x] Task 5.5: Write unit tests for prompt-for-dry-run (follows existing CLI patterns)
- [x] Task 5.6: Create dry-run prompt in bulk-update-visualizations command
- [x] Task 5.7: Write integration tests for dry-run flow (no API calls made)
- [x] Task 5.8: Integrate dry-run logic into command orchestration
- [x] Task 5.9: Write integration tests for report generation (both dry-run and live modes)
- [x] Task 5.10: Add command export to `src/commands/index.ts`
- [x] Task 5.11: Add command case to `src/index.ts` switch statement
- [x] Task 5.12: Create documentation file `docs/vse-management.md` following existing patterns
- [x] Task 5.13: Update main README.md with VSE Management command description
- [x] Task 5.14: Write end-to-end integration test for complete workflow (dry-run + live execution)

### Deliverables

- Markdown reports generated after all operations
- Dry-run mode fully functional (no actual changes made)
- VSE Management command accessible from main CLI menu
- Complete documentation in docs folder
- README.md updated
- All acceptance criteria from PRD validated

### Dependencies

- Phase 4 complete (bulk update action working)
- Existing report generation utilities

---

## Notes

### TDD Implementation Approach

Following the project's TDD methodology as specified in coding rules:

1. **Write Tests First**: For each task involving logic implementation, write unit tests before writing the implementation code
2. **Test Structure**: Use Vitest with Arrange-Act-Assert pattern
3. **Co-location**: Place all test files next to source files (`{filename}.test.ts`)
4. **Test Coverage Focus**: Business logic, API interactions, data transformations, error handling
5. **Mock External Dependencies**: Mock AmplienceService, dotenv, file system operations, Inquirer prompts

### Coding Standards References

**Key rules applied to this implementation:**

- **Testing Standards** ([testing/index.md](../../../memory/coding-rules/testing/index.md)): Co-location strategy, TDD approach, one test file per source file
- **Command-Action Pattern** ([tech-stack.md](../../../memory/tech-stack.md)): Commands handle UI/prompts, actions handle business logic
- **File Naming**: Kebab-case for all files (e.g., `bulk-update-content-type-visualizations.ts`)
- **Barrel Exports**: Use `index.ts` files for clean exports, no test files for barrel exports
- **Import Aliases**: Use `~/` prefix for imports (e.g., `import { AmplienceService } from '~/services'`)
- **Error Handling**: Continue processing on partial failures, collect detailed error context
- **Progress Tracking**: Use existing `createProgressBar()` utility for bulk operations

### API Integration

- All API calls through existing `AmplienceService` class
- Use `PATCH /content-types/{contentTypeId}` endpoint for visualization updates
- Authentication already handled by AmplienceService (OAuth and PAT support)

### Environment Variables Pattern

```env
# Default configuration paths
AMP_DEFAULT_SCHEMA_ID=https://schema.example.com/.*
AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE=./config/content-types.json
AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE=./config/visualizations.json

# Hub-specific visualization URLs
AMP_HUB_DEV_VISUALISATION_APP_URL=https://vse.dev.example.com
AMP_HUB_PROD_VISUALISATION_APP_URL=https://vse.prod.example.com
```

### JSON File Formats

**Content Types List** (`content-types.json`):
```json
[
  "https://schema.example.com/type1.json",
  "https://schema.example.com/type2.json"
]
```

**Visualization Configuration** (`visualizations.json`):
```json
{
  "visualizations": [
    {
      "label": "Preview",
      "templatedUri": "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}",
      "default": true
    },
    {
      "label": "Live View",
      "templatedUri": "{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}"
    }
  ]
}
```

### Implementation Risks

- **Content type API structure validation**: Exact structure of visualization objects in content types needs validation during Phase 3
- **Partial update behavior**: Need to verify PATCH endpoint behavior when only updating visualizations property
- **URL replacement edge cases**: Complex templatedUri values with multiple template variables need careful testing

### Success Metrics

All acceptance criteria from PRD must pass:
- AC-1 to AC-15 covering command access, selection methods, URL replacement, progress tracking, error handling, and reporting
