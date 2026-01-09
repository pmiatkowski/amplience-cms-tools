# Context

## Relevant Files

- `src/utils/dc-cli-executor.ts` — Core utility for executing dc-cli commands
  with builder pattern, handles PAT and OAuth authentication
- `src/commands/archive-content-type-schemas/archive-content-type-schemas.ts` —
  Example command pattern: hub selection → filtering → user confirmation →
  action execution
- `src/commands/copy-content-type-schemas/copy-content-type-schemas.ts` —
  Example using dc-cli executor: validates schemas, exports from source, imports
  to target
- `src/commands/list-folder-tree/list-folder-tree.ts` — Simpler command example:
  hub → repository → prompt flow → display results
- `src/commands/index.ts` — Barrel export for all commands

## Code Snippets

### DcCliCommandBuilder Pattern

```typescript
// From dc-cli-executor.ts - Builder pattern for dc-cli commands
const result = await createDcCliCommand()
  .withHub(selectedHub)
  .withCommand('content-type-schema export')
  .withArgs('./export-dir')
  .execute();
```

### Command Structure Pattern

```typescript
// All commands follow this pattern:
export async function runCommandName(): Promise<void> {
  // 1. Load hub configs
  const hubs = getHubConfigs();

  // 2. Select hub
  const selectedHub = await promptForHub(hubs);

  // 3. Get user inputs (filters, options, etc.)
  const options = await promptForOptions();

  // 4. Display summary and confirm
  const confirmed = await promptForConfirmation('...');
  if (!confirmed) return;

  // 5. Execute action (via service or dc-cli)
  await performAction(selectedHub, options);
}
```

### dc-cli Command Examples from EXTENSION.md

```bash
# Export all extensions
dc-cli extension export ./export-dir --clientId "..." --clientSecret "..." --hubId "..."

# Export specific extensions
dc-cli extension export ./export-dir --id foo --id bar --clientId "..." --clientSecret "..."

# Import extensions
dc-cli extension import ./export-dir --clientId "..." --clientSecret "..." --hubId "..."

# Delete extensions
dc-cli extension delete --id foo --clientId "..." --clientSecret "..." --hubId "..."
```

## Business Logic

### dc-cli Extension Commands Available

- **export** — Exports extensions from a hub to filesystem (supports --id for
  specific extensions, --force to overwrite)
- **import** — Imports extensions from filesystem to a hub
- **delete** — Deletes extensions from a hub (supports --id for specific
  extensions, --force to skip confirmation)

### Common Command Patterns

- All commands start with hub selection (`promptForHub`)
- Operations should support filtering (e.g., by ID, regex pattern)
- User confirmation required before destructive operations
- Dry-run mode should be available for preview
- Progress indicators for long-running operations
- Clear console output with emojis (✅ ❌ 🔍 📋 etc.)

### Authentication Handling

- `DcCliCommandBuilder` automatically detects PAT vs OAuth config
- PAT: uses `patToken` field
- OAuth: uses `clientId` and `clientSecret` fields
- Hub ID always required

## Technical Constraints

### Stack

- TypeScript project
- Node.js with `child_process.exec` for dc-cli execution
- Uses promisify for async command execution
- dc-cli installed in local `node_modules/.bin/`

### dc-cli Integration

- Commands executed via `DcCliCommandBuilder` class
- Windows support: checks for `.cmd` extension
- Command output includes stdout/stderr
- Long commands truncated in logs (200 char limit)

### Existing Utilities Available

- `createDcCliCommand()` — Factory for builder pattern
- `checkDcCliAvailability()` — Verify dc-cli is installed
- `getDcCliPath()` — Get path to local dc-cli binary
- `createProgressBar()` — Progress indicators
- `displayTable()` — Tabular output formatting

### File System Operations

- Export operations write to specified directory
- Import operations read from specified directory
- Support for JSON schema validation (see copy-content-type-schemas example)

## Notes

### Command Registration

- New commands must be added to `src/commands/index.ts` barrel export
- Command typically organized in folder: `command-name/command-name.ts` with
  `index.ts` re-export

### Prompt Organization

- Complex commands have `prompts/` subfolder
- Simple prompts can use shared ones from `~/prompts`
- Hierarchical selections supported (see list-folder-tree)

### Testing Pattern

- Test files: `*.test.ts` in same folder as implementation
- Unit tests for utilities and business logic
- Integration-style tests for full command flows

### Extension-Specific Considerations

- Extensions are identified by ID (string)
- Multiple IDs can be specified for batch operations
- Force flag bypasses confirmations (use with caution)
- Extensions export to/import from JSON files in specified directory
