# Implementation Plan: Enhance User Command Sets

> **Status**: Planning  
> **Created**: 2026-01-30  
> **PRD Version**: 2026-01-30

---

## Summary

**Total Phases**: 3  
**Estimated Scope**: Medium

---

## Phase 1: Add "Pick Commands" Execution Mode

**Goal**: Enable users to selectively choose which commands to execute from a command set

### Tasks

> **Note**: Tasks are ordered for clarity. During execution, TDD practice applies - write tests before or alongside implementation.

- [x] Task 1.1: Update existing `promptForExecutionMode()` tests to cover new "Pick commands" option
- [x] Task 1.2: Add "Pick commands" as third option in `promptForExecutionMode()` function in `src/commands/user-command-sets/prompts/prompt-for-execution-mode.ts`
- [x] Task 1.3: Write unit tests for `promptForCommandSelection()` following co-location pattern
- [x] Task 1.4: Create new `promptForCommandSelection()` function in `src/commands/user-command-sets/prompts/prompt-for-command-selection.ts` using Inquirer.js checkbox prompt
- [x] Task 1.5: Write unit tests for `promptForSelectedExecutionMode()` following co-location pattern
- [x] Task 1.6: Create new `promptForSelectedExecutionMode()` function in `src/commands/user-command-sets/prompts/prompt-for-selected-execution-mode.ts` for "Run selected" vs "Step-by-step selected" choice
- [x] Task 1.7: Export new prompts from barrel file `src/commands/user-command-sets/prompts/index.ts`
- [x] Task 1.8: Update `runUserCommandSets()` orchestrator in `src/commands/user-command-sets/user-command-sets.ts` to handle the new "pick-commands" execution flow

### Deliverables

- Users can select "Pick commands" as execution mode
- Multi-select checkbox interface displays commands with format `{name} - {description}`
- After picking commands, users choose "Run selected" or "Step-by-step selected"
- Selected commands execute correctly with chosen secondary mode

### Dependencies

- None

---

## Phase 2: Graceful Missing File Handling

**Goal**: Improve first-time user experience when COMMAND_SETS_PATH is set but file doesn't exist

### Tasks

- [x] Task 2.1: Create new `promptForCreateExampleFile()` function in `src/commands/user-command-sets/prompts/prompt-for-create-example-file.ts`
- [x] Task 2.2: Create utility function `displayManualCreationInstructions()` in `src/commands/user-command-sets/user-command-sets.ts` for helpful decline message
- [x] Task 2.3: Update `runUserCommandSets()` to check if COMMAND_SETS_PATH is set and file missing, then prompt user
- [x] Task 2.4: Integrate with existing `generateExampleConfig()` and `writeCommandSetConfig()` from `command-set-config-service.ts`
- [x] Task 2.5: Export new prompt from barrel file `src/commands/user-command-sets/prompts/index.ts`
- [x] Task 2.6: Write unit tests for `promptForCreateExampleFile()` following co-location pattern
- [x] Task 2.7: Write unit tests for `displayManualCreationInstructions()` in `user-command-sets.test.ts`
- [x] Task 2.8: Update `runUserCommandSets()` tests to cover missing file scenarios

### Deliverables

- When COMMAND_SETS_PATH is set but file missing, user is prompted to create example file
- Accepting creates the standard example config at the specified path
- Declining shows helpful instructions and returns to main menu gracefully (no error)

### Dependencies

- None (can be implemented in parallel with Phase 1)

---

## Phase 3: Testing & Documentation

**Goal**: Ensure comprehensive test coverage and update documentation

### Tasks

- [x] Task 3.1: Add integration-level tests for full "pick commands" flow in `user-command-sets.test.ts`
- [x] Task 3.2: Add integration-level tests for missing file handling in `user-command-sets.test.ts`
- [x] Task 3.3: Update `docs/user-command-sets.md` to document the new "Pick commands" feature
- [x] Task 3.4: Update `docs/user-command-sets.md` to document graceful file creation behavior
- [x] Task 3.5: Verify all acceptance criteria (AC-1 through AC-10) are met with manual testing

### Deliverables

- All new functionality has comprehensive unit test coverage
- Documentation reflects new features
- All acceptance criteria verified

### Dependencies

- Phase 1 complete
- Phase 2 complete

---

## Notes

### Implementation Details

**Command Selection Format**: Each command in the picker should show `{command-name} - {description}` format. Example:

- `sync-hierarchy - Sync content hierarchy structure`
- `copy-content-types - Copy any missing content types`

**Execution Flow for Pick Commands**:

1. User selects command set
2. User selects "Pick commands" execution mode
3. Multi-select checkbox displays all commands
4. User picks desired commands (at least one required)
5. User selects secondary mode: "Run selected" or "Step-by-step selected"
6. Commands execute using existing `executeRunAll()` or `executeStepByStep()` with filtered list

**Missing File Detection Logic**:

- Check if `COMMAND_SETS_PATH` env var is set AND not empty
- If set, check if file exists at that path
- If file doesn't exist → prompt for creation
- If env var not set → use default path behavior (auto-create at `./command-sets.json`)

### Coding Standards References

- **Testing**: All new prompt files require co-located test files (`{filename}.test.ts`) - see `coding-rules/testing/index.md`
- **File Naming**: Use `prompt-for-*.ts` pattern for new prompt files - see `tech-stack.md` section 4.4
- **Architecture**: Commands handle UI/prompts, actions handle business logic - see `tech-stack.md` section 4.1
- **Named Exports**: Use named exports only, no default exports - see `coding-rules/index.md`
- **Barrel Exports**: Export new prompts from `index.ts` barrel file - see `coding-rules/index.md`

### Risks

- **Minimal Risk**: Feature builds on existing well-tested patterns (Inquirer prompts, execution actions)
- **Single Command Selection**: AC-10 requires verification that picking only one command works correctly
