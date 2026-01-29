# Functionality: User Command Sets

This functionality provides a system for creating and executing predefined
sequences of CLI commands, allowing users to bundle commonly used operations
into reusable sets that can be executed in a single workflow.

## Core logic

The functionality is implemented as a self-contained command module that reads
JSON configuration files defining command sets, validates command references
against the available CLI commands, and provides interactive execution with
both "run all" and "step-by-step" modes including error recovery options.

## Purpose

The primary purpose is to streamline repetitive workflows by allowing users to
define custom command sequences that match their specific use cases, reducing
the need to manually navigate menus and enter parameters for common multi-step
operations.

## Problems it solves

- **Repetitive Menu Navigation**: Eliminates the need to repeatedly select the
  same commands from menus when performing routine operations, saving time and
  reducing fatigue.
- **Workflow Consistency**: Ensures consistent execution of multi-step
  operations by defining the exact sequence of commands and their order,
  reducing human error.
- **Knowledge Sharing**: Allows experienced users to create command sets that
  can be shared with team members, codifying best practices and standard
  operating procedures.
- **Context Switching**: Reduces cognitive load by automating sequences of
  operations, allowing users to focus on results rather than remembering
  individual command steps.

## How it works

- The user selects "User Sets" from the main CLI menu
- Configuration is loaded from `command-sets.json` (or custom path via
  `COMMAND_SETS_PATH` environment variable)
- If no configuration exists, an example file is automatically created
- Available command sets are displayed showing name, description, and command
  count
- User selects a command set to execute
- User chooses execution mode: "Run all" or "Step-by-step"
- Commands execute sequentially with progress feedback
- If errors occur, user can choose to Continue, Stop, or Retry
- Execution summary displays success/failure counts and duration

## Configuration

### Configuration File Location

The configuration file location is determined by:

1. `COMMAND_SETS_PATH` environment variable (if set)
2. Default: `command-sets.json` in the current working directory

### Configuration Format

```json
{
  "version": "1.0",
  "commandSets": [
    {
      "name": "Daily Content Sync",
      "description": "Synchronize content from production to development",
      "commands": [
        {
          "command": "sync-hierarchy",
          "description": "Sync content hierarchy structure"
        },
        {
          "command": "copy-content-types",
          "description": "Copy any missing content types"
        }
      ]
    },
    {
      "name": "Schema Update Workflow",
      "description": "Update schemas and sync related content types",
      "commands": [
        {
          "command": "copy-content-type-schemas",
          "description": "Copy updated schemas"
        },
        {
          "command": "sync-content-type-properties",
          "description": "Sync content type settings with schemas"
        }
      ]
    }
  ]
}
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Configuration format version (currently "1.0") |
| `commandSets` | Yes | Array of command set definitions |
| `commandSets[].name` | Yes | Display name for the command set |
| `commandSets[].description` | No | Optional description shown in menu |
| `commandSets[].commands` | Yes | Array of command entries (can be empty) |
| `commandSets[].commands[].command` | Yes | Valid CLI command name |
| `commandSets[].commands[].description` | No | Optional description for the command |
| `commandSets[].commands[].parameters` | No | Pre-configured parameters (future) |

### Valid Command Names

The following command names can be used in command sets:

- `manage-extensions`
- `vse-management`
- `sync-hierarchy`
- `bulk-sync-hierarchies`
- `copy-content-type-schemas`
- `sync-content-type-properties`
- `copy-content-types`
- `copy-folder-with-content`
- `recreate-content-items`
- `recreate-folder-structure`
- `cleanup-folder`
- `clean-repo`
- `archive-content-type-schemas`
- `list-folder-tree`
- `update-locale`

## Execution Modes

### Run All Mode

Executes all commands in the set sequentially without pausing between commands.
Best for well-tested workflows where you're confident all commands will succeed.

### Step-by-Step Mode

Pauses after each command completion and prompts to continue or stop. Useful
for:

- First-time execution of a new command set
- Debugging workflow issues
- Operations requiring verification between steps

## Error Handling

When a command fails during execution, you're prompted with three options:

| Option | Behavior |
|--------|----------|
| **Continue** | Skip the failed command and proceed with the next one |
| **Stop** | End execution immediately |
| **Retry** | Attempt to run the failed command again |

## Managing Command Sets

Command sets can be managed through the CLI interface:

### Creating a New Set

1. Select "User Sets" from the main menu
2. Choose "Create new set"
3. Enter the set name and optional description
4. Add commands by selecting from the available commands list

### Editing an Existing Set

1. Select "User Sets" from the main menu
2. Choose "Edit set"
3. Select the set to edit
4. Options available:
   - Edit name
   - Edit description
   - Add commands
   - Remove commands

### Deleting a Set

1. Select "User Sets" from the main menu
2. Choose "Delete set"
3. Select the set to delete
4. Confirm deletion

Note: Alternatively, you can edit the `command-sets.json` file directly using
any text editor.

## Best Practices

### Naming Conventions

- Use descriptive names that indicate the workflow purpose
- Include environment context if applicable (e.g., "Prod to Dev Sync")
- Keep names concise but meaningful

### Command Organization

- Order commands logically based on dependencies
- Group related operations together
- Consider creating separate sets for different use cases rather than one
  large set

### Testing

- Test new command sets in step-by-step mode first
- Use dry-run mode for individual commands when available
- Document the expected behavior in the description field

## Example Workflows

### Environment Synchronization

```json
{
  "name": "Sync Prod to Dev",
  "description": "Complete production to development sync",
  "commands": [
    { "command": "copy-content-type-schemas", "description": "Sync schemas first" },
    { "command": "copy-content-types", "description": "Ensure content types exist" },
    { "command": "sync-hierarchy", "description": "Sync content hierarchies" }
  ]
}
```

### Schema Deployment

```json
{
  "name": "Deploy Schema Changes",
  "description": "Deploy schema updates and sync content types",
  "commands": [
    { "command": "copy-content-type-schemas", "description": "Deploy new schemas" },
    { "command": "sync-content-type-properties", "description": "Update content type settings" }
  ]
}
```

### Cleanup Operations

```json
{
  "name": "Repository Cleanup",
  "description": "Clean up old content and empty folders",
  "commands": [
    { "command": "cleanup-folder", "description": "Remove old content items" },
    { "command": "clean-repo", "description": "Archive remaining items" }
  ]
}
```

## Troubleshooting

### Configuration File Not Found

If you see "Configuration file not found", ensure:

1. `command-sets.json` exists in your current directory, or
2. `COMMAND_SETS_PATH` environment variable points to a valid file

### Invalid Command Reference

If you see "Unknown command" errors:

1. Check the command name matches exactly one of the valid command names
2. Verify there are no typos or extra spaces
3. Command names are case-sensitive

### Empty Command Set

If a command set has no commands:

1. Add commands using the edit functionality
2. Or manually add commands to the JSON configuration

### Execution Errors

If commands fail during execution:

1. Check the error message for details
2. Verify you have proper access to the target hub
3. Ensure prerequisites are met (e.g., schemas exist before content types)
