# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Amplience CMS Tools is a CLI application for automating bulk operations in
Amplience CMS. It provides 13 specialized commands for content management tasks
not available through the standard Amplience UI.

**Key Technologies:**

- TypeScript 5+ with strict mode
- Node.js v22+ (specified in package.json engines)
- Vitest for testing
- Amplience DC-CLI integration for schema operations
- Inquirer.js for interactive prompts

## Development Commands

### Essential Commands

```bash
npm start                   # Run the CLI application
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage reports
npm run lint                # Check code quality
npm run lint:fix            # Fix auto-fixable linting errors
npm run format              # Format code with Prettier
npm run type-check          # Run TypeScript type checking
npm run build               # Validate TypeScript compilation
```

### Coverage & Reporting

```bash
npm run coverage:report     # Process coverage and generate detailed reports
npm run coverage:open       # Open HTML coverage report in browser
```

## Architecture

### Two-Layer Architecture

The codebase follows a clear **Command-Action** pattern with separation of
concerns:

1. **Commands Layer** (`src/commands/`)
   - User-facing CLI commands
   - Handle user interaction and prompts
   - Orchestrate workflow between prompts and actions
   - Located in `src/commands/<command-name>/`
   - Each command exports a main `run*` function

2. **Actions Layer** (`src/services/actions/`)
   - Core business logic implementations
   - Reusable operations independent of CLI
   - Handle API calls and data transformations
   - No user prompts or CLI interactions

### Key Services

**AmplienceService** (`src/services/amplience-service.ts`):

- Core API client for Amplience CMS
- Handles authentication (OAuth and PAT)
- Manages token refresh automatically
- All API requests go through this service
- One instance per hub

**FilterService** (`src/services/filter-service.ts`):

- Centralizes content filtering logic
- Filters by schema ID, status, publication state, delivery key patterns

**HierarchyService** (`src/services/hierarchy-service.ts`):

- Manages hierarchical content item relationships
- Handles parent-child structures

**ContentTypeService** (`src/services/content-type-service.ts`):

- Manages content types and schemas
- Handles schema validation and synchronization

### Directory Structure

```
src/
├── commands/                  # CLI command implementations
│   ├── <command-name>/       # Each command in its own directory
│   │   ├── index.ts          # Barrel export
│   │   ├── <command-name>.ts # Main command logic
│   │   └── prompts/          # Command-specific prompts
│   └── shared/               # Shared command utilities
├── services/
│   ├── actions/              # Business logic implementations
│   │   ├── archive-content-item.ts
│   │   ├── item-removal.ts
│   │   ├── sync-hierarchy.ts
│   │   └── ...
│   ├── amplience-service.ts  # Core API client
│   ├── filter-service.ts
│   ├── hierarchy-service.ts
│   └── content-type-service.ts
├── prompts/                  # Shared user prompts
├── utils/                    # Utility functions
│   ├── dc-cli-executor.ts   # Amplience DC-CLI integration
│   ├── create-progress-bar.ts
│   ├── display-table.ts
│   └── ...
├── types/                    # Global TypeScript types
│   ├── amplience.d.ts       # Amplience CMS types
│   └── global.d.ts
├── app-config.ts            # Hub configuration loader
└── index.ts                 # Application entry point
```

## Authentication

The tool supports two authentication methods (configured via `.env`):

1. **Personal Access Token (PAT)** - Single token for all hubs
   - Set `PAT_TOKEN` environment variable
   - Simpler configuration
   - Token doesn't expire in normal operation

2. **OAuth Client Credentials** - Per-hub authentication
   - Set `AMP_HUB_<HUBNAME>_CLIENT_ID` and `AMP_HUB_<HUBNAME>_CLIENT_SECRET`
   - More granular access control
   - Tokens auto-refresh (handled by AmplienceService)

**Hub Configuration Pattern:**

- Auto-discovery from environment variables matching `AMP_HUB_*_HUB_ID`
- Each hub requires: `HUB_ID`, `HUB_NAME`
- OAuth requires additional: `CLIENT_ID`, `CLIENT_SECRET`
- If `PAT_TOKEN` is set, it takes precedence for all hubs
- Each hub can optionally include: `EXT_URL` (valid HTTPS URL pointing to the
  hub's Amplience extensions interfaces)

**Example Hub Configuration:**

```env
# OAut
AMP_HUB_DEV_CLIENT_ID=client_id_here
AMP_HUB_DEV_CLIENT_SECRET=client_secret_here
AMP_HUB_DEV_HUB_ID=hub_id_here
AMP_HUB_DEV_HUB_NAME=DEV
AMP_HUB_DEV_EXT_URL=https://dev.amplience.net

# PAT
PAT_TOKEN=token_here
AMP_HUB_PROD_HUB_ID=hub_id_here
AMP_HUB_PROD_HUB_NAME=PROD
AMP_HUB_PROD_EXT_URL=https://prod.amplience.net
```

See `src/app-config.ts` for implementation.

## Code Conventions

### File Naming

- Use **kebab-case** for all files: `my-file-name.ts`
- Test files: `my-file-name.test.ts`
- Index files for barrel exports: `index.ts`

### Import Aliases

- `~/` maps to `src/`
- Example: `import { AmplienceService } from '~/services/amplience-service'`
- Configured in `tsconfig.json` and `vitest.config.ts`

### Barrel Exports

- Each directory uses `index.ts` for clean exports
- Import from directory level: `import { foo } from '~/services'`

### TypeScript

- Strict mode enabled
- All compiler strict checks enabled
- Type safety is paramount - avoid `any`

## Testing

### Test Organization

- Tests live alongside source files: `*.test.ts`
- Also supported in `tests/` directory
- Use Vitest for all tests

### Coverage Thresholds

Current thresholds (from vitest.config.ts):

- Lines: 24%
- Statements: 24%
- Functions: 33%
- Branches: 70%

Coverage reports generated in `coverage/` directory.

## Working with Commands

### Adding a New Command

1. Create directory: `src/commands/<command-name>/`
2. Create main file: `<command-name>.ts` with `run<CommandName>()` function
3. Create `index.ts` for barrel export
4. Add command-specific prompts in `prompts/` subdirectory
5. Implement business logic in `src/services/actions/<action-name>.ts`
6. Update `src/commands/index.ts` to export new command
7. Update `src/index.ts` to add command to switch statement
8. Add command documentation in `docs/<command-name>.md`
9. Update main README.md with command description

### Command Structure Pattern

```typescript
export async function runMyCommand(): Promise<void> {
  // 1. Load hub configs
  const hubs = getHubConfigs();

  // 2. Select hub and create service
  const selectedHub = await promptForHub(hubs);
  const service = new AmplienceService(selectedHub);

  // 3. Get repositories
  const repos = await service.getRepositories();
  const selectedRepo = await promptForRepository(repos);

  // 4. Prompt for options
  const options = await promptForOptions();

  // 5. Fetch and filter data
  const items = await service.getAllContentItems(selectedRepo.id);
  const filtered = filterContentItems(items, options);

  // 6. Show preview and confirm
  displayTable(filtered);
  const confirmed = await promptForConfirmation('Proceed?');

  // 7. Execute action with progress bar
  const progress = createProgressBar(filtered.length);
  for (const item of filtered) {
    await performAction(service, item, options);
    progress.increment();
  }
  progress.stop();
}
```

## Amplience DC-CLI Integration

For schema operations, the tool uses Amplience's official DC-CLI:

- Executed via `src/utils/dc-cli-executor.ts`
- Commands run as child processes
- Used for schema import/export operations
- See `src/commands/copy-content-type-schemas/` for usage example

## Reports

All operations generate Markdown reports in `reports/` directory with:

- Operation summary and filters
- Success/failure counts and timing
- Item-by-item results
- Error details

Reports are excluded from version control.

## Common Patterns

### Progress Bars

```typescript
const progress = createProgressBar(total);
for (const item of items) {
  await processItem(item);
  progress.increment();
}
progress.stop();
```

### Filtering Content

```typescript
const filtered = filterContentItems(items, {
  schemaId: 'https://schema.example.com',
  status: ['ACTIVE'],
  publishingStatus: ['LATEST'],
  deliveryKeyPattern: 'prefix-*',
});
```

### Dry Run Pattern

Most commands support dry-run mode:

```typescript
const isDryRun = await promptForDryRun();
if (!isDryRun) {
  const confirmed = await promptForConfirmation('Proceed with live execution?');
  if (!confirmed) return;
}
```

## Release Process

- Uses semantic-release with conventional commits
- Version determined by **Pull Request Title** when merged to `main`
- Commit message format: `<type>: <description>`
  - `fix:` → patch (1.0.0 → 1.0.1)
  - `feat:` → minor (1.0.0 → 1.1.0)
  - `feat!:` → major (1.0.0 → 2.0.0)
- CHANGELOG.md auto-generated

## Important Implementation Notes

1. **Always use AmplienceService for API calls** - Don't make direct fetch calls
2. **Separate commands from actions** - Commands handle UI, actions handle logic
3. **Use progress bars for long operations** - Better UX for bulk operations
4. **Implement dry-run mode** - Safety first for destructive operations
5. **Generate reports** - All operations should produce detailed reports
6. **Handle errors gracefully** - Provide clear error messages
7. **Test with multiple hubs** - Consider cross-hub scenarios
8. **Respect hierarchies** - Many content items have parent-child relationships
9. **Handle publishing state** - Items may need unpublishing before archival
10. **Version conflicts** - Implement retry logic for concurrent modifications
