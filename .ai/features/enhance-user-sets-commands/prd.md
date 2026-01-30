# PRD: Enhance User Command Sets

> **Status**: Draft
> **Created**: 2026-01-30
> **Last Updated**: 2026-01-30

---

## Overview

This feature enhances the User Command Sets functionality by adding two improvements: (1) allowing users to selectively pick which commands to execute from a command set rather than running all commands, and (2) gracefully handling missing configuration files by offering to create an example file when the environment variable path exists but the file does not.

## Problem Statement

Currently, the User Command Sets feature has two limitations:

1. **All-or-nothing execution**: Users must either run all commands in a set ("Run all") or step through every command one-by-one ("Step-by-step"). There's no option to quickly select a subset of commands from a larger set, forcing users to either create separate command sets for different scenarios or manually skip unwanted commands in step-by-step mode.

2. **Poor missing file handling**: When `COMMAND_SETS_PATH` environment variable is set but the file doesn't exist, the system throws an error. Users have no guidance on how to create the file, making the initial setup confusing.

## Goals

- Enable users to pick specific commands from a command set before execution
- Maintain flexibility by allowing users to choose execution mode (parallel/sequential) for their selected commands
- Improve first-time user experience when configuration file is missing
- Provide clear guidance when users decline automatic file creation

## Non-Goals

- Persisting command selections for reuse (users select each time)
- Adding command filtering/search capabilities beyond the multi-select list
- Modifying the command set JSON structure or schema
- Adding command reordering within the selection interface

## Functional Requirements

### FR-1: Add "Pick Commands" Execution Mode Option

After selecting a command set, present a third execution mode option alongside the existing "Run all" and "Step-by-step" modes. The new option should be clearly labeled to indicate selective command execution (e.g., "Pick commands to run").

### FR-2: Multi-Select Command Picker Interface

When "Pick commands" mode is selected, display a multi-select list (using Inquirer.js checkbox prompt) showing all commands from the selected command set. Each list item should display the command name followed by its description from the JSON config (e.g., `sync-hierarchy - Sync content hierarchy structure`).

### FR-3: Secondary Execution Mode for Selected Commands

After the user picks their commands, prompt them to choose how to execute the selected subset:

- "Run selected" - Execute all selected commands sequentially without individual confirmations
- "Step-by-step selected" - Execute selected commands one-by-one with confirmation between each

### FR-4: Graceful Missing File Handling

When `COMMAND_SETS_PATH` environment variable is set but the specified file does not exist:

- Do not throw an error immediately
- Prompt the user: "Would you like to create an example command set file?"
- If user accepts, create the file using the existing `generateExampleConfig()` function (two command sets with 2 commands each)

### FR-5: Helpful Decline Message

When the user declines to create the example file:

- Display a helpful message with instructions on how to create the file manually
- Include the expected file path and basic structure guidance
- Return to the main menu gracefully (do not exit with error)

## Technical Considerations

### Technology Stack Integration

- **CLI Interaction**: Use Inquirer.js checkbox prompt for multi-select command picking
- **Runtime**: Node.js v22+ with TypeScript
- **Existing Patterns**: Follow the Command → Action architecture pattern

### Integration Points

- Modify `promptForExecutionMode()` in `src/commands/user-command-sets/prompts/` to include the new "Pick commands" option
- Create new prompt function `promptForCommandSelection()` for the multi-select interface
- Update `runUserCommandSets()` orchestrator to handle the new execution flow
- Modify `initializeCommandSetConfig()` or create wrapper logic in the command to handle the graceful file creation prompt

### Architectural Constraints

- Commands handle UI/UX and prompts; actions handle business logic execution
- The existing `executeRunAll()` and `executeStepByStep()` action functions should work with filtered command lists without modification
- File path resolution continues to use `getCommandSetConfigPath()` function

### Dependencies

- Existing `generateExampleConfig()` function provides the example file content
- Existing execution actions (`executeRunAll`, `executeStepByStep`) accept command sets - will need to work with filtered command arrays

## Acceptance Criteria

- [ ] AC-1: Execution mode prompt shows three options: "Run all", "Step-by-step", and "Pick commands"
- [ ] AC-2: Selecting "Pick commands" displays a multi-select checkbox list of all commands in the selected set
- [ ] AC-3: Each command in the picker shows format: `{command-name} - {description}`
- [ ] AC-4: After picking commands, user is prompted to choose "Run selected" or "Step-by-step selected"
- [ ] AC-5: Selected commands execute correctly using chosen secondary mode
- [ ] AC-6: When COMMAND_SETS_PATH is set but file missing, user is prompted to create example file
- [ ] AC-7: Accepting file creation generates the standard example config at the specified path
- [ ] AC-8: Declining file creation shows helpful manual creation instructions and returns to main menu
- [ ] AC-9: All new prompt functions follow existing naming conventions (`prompt-for-*.ts`)
- [ ] AC-10: Feature works correctly when only one command is selected

## Open Questions

None - all requirements have been clarified through the clarification process.
