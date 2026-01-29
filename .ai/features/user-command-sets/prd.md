# PRD: User Command Sets

> **Status**: Draft
> **Created**: 2026-01-29
> **Last Updated**: 2026-01-29

---

## Overview

User Command Sets is a feature that enables users to define, configure, and execute collections of CLI commands as named sets. This allows users to bundle frequently-used command sequences for different workflows (e.g., "staging deployment", "content cleanup", "full sync") without needing to remember and execute individual commands in the correct order each time.

## Problem Statement

Currently, users must manually execute each CLI command individually, remembering the sequence and purpose of each operation. For complex workflows involving multiple commands, this is time-consuming, error-prone, and requires users to recall which commands are needed for specific tasks. There is no way to save and reuse command configurations for recurring workflows.

## Goals

- Enable users to define reusable command sets via JSON configuration
- Provide flexibility between fully pre-configured (hands-off) and interactive (prompted) execution modes
- Integrate seamlessly with the existing CLI menu structure
- Support both technical users (direct JSON editing) and casual users (CLI management commands)
- Provide clear feedback during multi-command execution with aggregate results

## Non-Goals

- Parallel command execution (all commands run sequentially)
- Hot-reloading of configuration changes (requires app restart)
- GUI-based command set builder
- Cloud storage or synchronization of command sets
- Scheduled/automated execution of command sets

## Functional Requirements

### FR-1: JSON Configuration File

The system must support a JSON configuration file for defining command sets:

- File location configurable via environment variable with sensible default
- On first run, if file doesn't exist, create an example/template file
- File must be validated on application load (fail fast with specific errors for invalid command references)

### FR-2: Command Set Definition Structure

Each command set in the JSON configuration must support:

- Unique name identifier
- Description (optional but recommended)
- Array of commands (can be empty)
- Each command can optionally include a parameters object for pre-configured execution

### FR-3: Command Set Menu Integration

Add "User Sets" as a top-level menu item in the existing CLI menu structure:

- Displayed alongside existing commands
- Entering "User Sets" shows a submenu listing all defined sets
- Each set displays: name + description + command count

### FR-4: Execution Mode Selection

When executing a command set, prompt the user to choose execution mode:

- **Run all**: Execute all commands in sequence without pausing
- **Step-by-step**: Pause after each command for user confirmation to continue

### FR-5: Parameter Handling

Commands within a set must support two parameter modes:

- **Interactive**: If no parameters defined in JSON, prompt user during execution
- **Pre-configured**: If parameters object present in JSON, use those values
- Mixed mode per set: Some commands interactive, others pre-configured within the same set

### FR-6: Parameter Validation

For pre-configured commands:

- Validate that all required parameters are provided
- Fail validation with clear error messages indicating which parameters are missing
- Validation occurs at set load time, not execution time

### FR-7: Error Handling During Execution

When a command in a set fails (error, exception, or user cancels):

- Pause execution and prompt user with options: Continue / Stop / Retry
- User choice determines whether to proceed with remaining commands

### FR-8: Results Display

After set execution completes:

- Aggregate all command results
- Display a summary showing success/failure status of each command
- Show overall set execution status

### FR-9: Empty Command Sets

- Allow empty command sets to be defined (commands array can be empty)
- When an empty set is executed, display "No commands" message
- Do not treat as an error

### FR-10: Command Set Management

Support hybrid management approach:

- CLI commands for creating/editing/deleting sets
- Direct JSON file editing for power users
- Both methods produce the same result

### FR-11: Configuration Reload Behavior

- Configuration file is read on application startup only
- Changes to the JSON file require application restart to take effect
- No hot-reloading support

## Technical Considerations

Based on the existing tech stack:

- **Runtime**: Node.js v22+ with TypeScript 5+
- **CLI Framework**: Integrate with existing Inquirer.js prompts
- **Configuration**: Use environment variable (e.g., `COMMAND_SETS_PATH`) for file location, with dotenv for loading
- **Logging**: Use Winston for execution logging
- **Progress**: Use cli-progress for multi-command execution feedback
- **Architecture**: Follow Command → Action pattern:
  - New command: `src/commands/user-command-sets/`
  - New action: `src/services/actions/user-command-sets.ts`
- **Integration Points**:
  - Export from `src/commands/index.ts`
  - Add case to `src/index.ts` main menu
  - Create `docs/user-command-sets.md` documentation
- **Testing**: Unit tests with Vitest for configuration parsing and validation

## Acceptance Criteria

- [ ] AC-1: Environment variable `COMMAND_SETS_PATH` configures JSON file location
- [ ] AC-2: Example JSON file created on first run if configuration file doesn't exist
- [ ] AC-3: Invalid JSON or unknown command references cause application to fail fast with descriptive errors
- [ ] AC-4: "User Sets" appears as top-level menu item showing all defined sets
- [ ] AC-5: Each set in the menu displays name, description, and command count
- [ ] AC-6: User can choose "run all" or "step-by-step" execution mode
- [ ] AC-7: Commands with parameters in JSON use those values without prompting
- [ ] AC-8: Commands without parameters in JSON prompt user interactively
- [ ] AC-9: Missing required parameters in pre-configured mode fail validation with clear error
- [ ] AC-10: Command failures prompt user to Continue/Stop/Retry
- [ ] AC-11: Execution summary displayed after set completion
- [ ] AC-12: Empty command sets execute with "No commands" message
- [ ] AC-13: Application restart required to pick up JSON file changes
- [ ] AC-14: CLI management commands available for set CRUD operations

## Open Questions

None - all requirements clarified through two rounds of clarification.
