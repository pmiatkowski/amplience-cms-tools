# Implementation Plan: User Command Sets

> **Status**: Planning  
> **Created**: 2026-01-29  
> **PRD Version**: 2026-01-29  
> **Approach**: Test-Driven Development (TDD)

---

## Summary

**Total Phases**: 5  
**Estimated Scope**: Medium

This implementation follows strict TDD principles: tests are written before implementation code for each task. Each task follows the Red-Green-Refactor cycle.

---

## Phase 1: Configuration Foundation

**Goal**: Establish JSON configuration loading, validation, and schema definitions with full test coverage

### Tasks

- [x] Task 1.1: Write tests for command set schema types and validation (define expected structure)
- [x] Task 1.2: Implement command set TypeScript types in `types/amplience.d.ts`
- [x] Task 1.3: Write tests for configuration file path resolution (env var + default)
- [x] Task 1.4: Implement configuration path resolver utility
- [x] Task 1.5: Write tests for JSON file loading and parsing (valid, invalid, missing cases)
- [x] Task 1.6: Implement JSON configuration loader service
- [x] Task 1.7: Write tests for command reference validation (valid/invalid command names)
- [x] Task 1.8: Implement command reference validator
- [x] Task 1.9: Write tests for example template generation
- [x] Task 1.10: Implement example template generator (creates default JSON on first run)

### Deliverables

- Configuration schema defined and typed
- JSON file loading with validation
- Environment variable configuration (`COMMAND_SETS_PATH`)
- Example file auto-generation
- Fail-fast behavior for invalid configurations

### Dependencies

- None

### TDD Notes

- Start with schema validation tests to define the contract
- Tests should cover: valid config, missing file, malformed JSON, invalid command references
- See `coding-rules/testing/index.md` for test patterns
- **Documentation**: All public functions must include JSDoc with `@param` and `@example` tags per coding standards

---

## Phase 2: Core Execution Engine

**Goal**: Build the command execution infrastructure with parameter handling

### Tasks

- [x] Task 2.1: Write tests for command parameter modes (interactive vs pre-configured detection)
- [x] Task 2.2: Implement parameter mode detection logic
- [x] Task 2.3: Write tests for parameter validation (missing required params)
- [x] Task 2.4: Implement parameter validation for pre-configured commands
- [x] Task 2.5: Write tests for single command execution wrapper
- [x] Task 2.6: Implement single command execution wrapper
- [x] Task 2.7: Write tests for execution result aggregation
- [x] Task 2.8: Implement execution result collector and summary generator
- [x] Task 2.9: Write tests for empty command set handling
- [x] Task 2.10: Implement empty set execution with "No commands" message

### Deliverables

- Parameter mode detection (interactive/pre-configured)
- Parameter validation with clear error messages
- Single command execution wrapper
- Result aggregation for summary display
- Empty set handling

### Dependencies

- Phase 1 complete (configuration loading)

### TDD Notes

- Focus on edge cases: empty params, partial params, unknown params
- Test result aggregation with mixed success/failure scenarios
- See `coding-rules/testing/index.md` for async testing patterns
- **Documentation**: All public functions must include JSDoc with `@param` and `@example` tags per coding standards

---

## Phase 3: Execution Modes & Error Handling

**Goal**: Implement "run all" vs "step-by-step" modes with error recovery

### Tasks

- [x] Task 3.1: Write tests for execution mode selection prompt
- [x] Task 3.2: Implement execution mode prompt (`src/commands/user-command-sets/prompts/prompt-for-execution-mode.ts`)
- [x] Task 3.3: Write tests for "run all" sequential execution
- [x] Task 3.4: Implement "run all" mode executor
- [x] Task 3.5: Write tests for "step-by-step" execution with pause/continue
- [x] Task 3.6: Implement "step-by-step" mode executor
- [x] Task 3.7: Write tests for error handling (Continue/Stop/Retry prompt)
- [x] Task 3.8: Implement error recovery prompt and handler
- [x] Task 3.9: Write tests for user cancellation handling
- [x] Task 3.10: Implement graceful cancellation flow

### Deliverables

- Execution mode selection prompt
- "Run all" sequential execution
- "Step-by-step" execution with confirmation
- Error handling with Continue/Stop/Retry options
- User cancellation support

### Dependencies

- Phase 2 complete (execution engine)

### TDD Notes

- Mock Inquirer.js prompts for testing user interactions
- Test cancellation at various stages of execution
- See existing prompt tests for patterns (e.g., `prompt-for-dry-run.test.ts`)
- **Documentation**: All public functions must include JSDoc with `@param` and `@example` tags per coding standards
- **Error Handling Docs**: Document the Continue/Stop/Retry decision flow rationale in code comments (explain 'why' not 'what')

---

## Phase 4: Menu Integration & User Interface

**Goal**: Integrate with main CLI menu and build the command set selection interface

### Tasks

- [x] Task 4.1: Write tests for command set menu display (name, description, command count)
- [x] Task 4.2: Implement command set list formatter
- [x] Task 4.3: Write tests for command set selection prompt
- [x] Task 4.4: Implement command set selection prompt (`src/commands/user-command-sets/prompts/prompt-for-command-set.ts`)
- [x] Task 4.4b: Create prompts barrel export: `src/commands/user-command-sets/prompts/index.ts`
- [x] Task 4.5: Write tests for main command orchestrator
- [x] Task 4.6: Implement main command: `src/commands/user-command-sets/user-command-sets.ts`
- [x] Task 4.7: Create barrel export: `src/commands/user-command-sets/index.ts`
- [x] Task 4.8: Integrate into `src/commands/index.ts` exports
- [x] Task 4.9: Add "User Sets" case to `src/index.ts` main menu
- [x] Task 4.10: Update `src/prompts/prompt-for-command.ts` to include "User Sets" option

### Deliverables

- "User Sets" appears in main menu
- Command set list displays name, description, count
- Set selection navigates to execution
- Full CLI integration

### Dependencies

- Phase 3 complete (execution modes)

### TDD Notes

- Follow Command → Action architecture pattern
- Tests should verify menu item formatting
- Integration with existing prompt patterns
- **Documentation**: All public functions must include JSDoc with `@param` and `@example` tags per coding standards

---

## Phase 5: Management Commands & Polish

**Goal**: Add CLI commands for set CRUD and create documentation

### Tasks

- [x] Task 5.1: Write tests for "create set" CLI command
- [x] Task 5.2: Implement create set command/prompt
- [x] Task 5.3: Write tests for "edit set" CLI command
- [x] Task 5.4: Implement edit set command/prompt
- [x] Task 5.5: Write tests for "delete set" CLI command
- [x] Task 5.6: Implement delete set command/prompt
- [x] Task 5.7: Write tests for configuration file writing/updating
- [x] Task 5.8: Implement JSON file writer service
- [x] Task 5.9: Create documentation: `docs/user-command-sets.md`
- [x] Task 5.10: Update `README.md` with User Command Sets section

### Deliverables

- Create/Edit/Delete set CLI commands
- JSON file modification capabilities
- Complete documentation
- README updates

### Dependencies

- Phase 4 complete (menu integration)

### TDD Notes

- Test file write operations with temp files
- Verify JSON structure preservation on updates
- Documentation should include example JSON configurations
- **Documentation**: All public functions must include JSDoc with `@param` and `@example` tags per coding standards

---

## Notes

### Technical Considerations

- Configuration file read on startup only (no hot-reload per FR-11)
- Use existing Inquirer.js patterns from `src/prompts/`
- Follow Command → Action architecture per tech-stack.md
- Use Winston for logging, cli-progress for multi-command feedback

### TDD Implementation Pattern

Each task pair follows:

1. **Red**: Write failing test defining expected behavior
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Clean up while keeping tests green

### File Structure

```
src/commands/user-command-sets/
├── index.ts                          # Barrel export
├── user-command-sets.ts              # Main command orchestrator
├── user-command-sets.test.ts         # Command tests
├── prompts/
│   ├── index.ts                      # Prompts barrel
│   ├── prompt-for-command-set.ts
│   ├── prompt-for-command-set.test.ts
│   ├── prompt-for-execution-mode.ts
│   └── prompt-for-execution-mode.test.ts
└── utils.ts (optional)

src/services/actions/
├── user-command-sets.ts              # Core execution logic
└── user-command-sets.test.ts         # Action tests

src/services/
├── command-set-config-service.ts     # Config loading/validation
└── command-set-config-service.test.ts

src/utils/
├── command-set-validator.ts          # Validation utilities
└── command-set-validator.test.ts
```

### Coding Standards References

- Testing: Follow co-location strategy per `coding-rules/testing/index.md`
- Architecture: Command → Action pattern per `tech-stack.md` Section 4
- File naming: kebab-case per `coding-rules/index.md`
- Named exports only, no default exports
- Mock dotenv in tests to prevent env pollution
- **JSDoc**: All public APIs require JSDoc with `@param` and `@example` tags (no `@returns`/`@throws`)
- **Comments**: Focus on 'why' not 'what', especially for error handling decisions

### Risks & Mitigations

- **Risk**: Command mapping complexity between set config and actual commands
  - **Mitigation**: Create explicit command registry with validation
- **Risk**: Parameter schema differences across commands
  - **Mitigation**: Design flexible parameter passing, validate per-command
