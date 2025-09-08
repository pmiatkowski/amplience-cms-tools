# Tech Stack & Guidelines - Amplience CMS Tools

## 1. Project Overview

This document defines the technology stack and technical guidelines for the
Amplience CMS Tools project. The project is a Node.js command-line application
designed to automate bulk operations within the Amplience CMS, addressing the
need for efficient content management that is not available through the standard
UI. This document serves as a reference for developers working on the project,
outlining architectural patterns, coding standards, and development practices.

## 2. Technology Stack

- **Runtime Environment**: Node.js v22+
- **Programming Language**: TypeScript v5+
- **Package Manager**: npm
- **CLI Interaction**: Inquirer.js
- **HTTP Client**: Native Node.js `fetch`
- **Logging**: Winston
- **Environment Variables**: dotenv
- **Progress Indicators**: cli-progress
- **Testing Framework**: Vitest
- **Code Formatter**: Prettier
- **TS Runner**: tsx

## 3. Folder Structure

The project adopts a structured layout to separate concerns. File and folder
names use the kebab-case convention.

```text
amplience-cms-tools/
├── .ai/
├── coverage/
├── docs/
├── reports/
├── src/
│   ├── commands/
│   │   ├── shared/              # Shared command utilities
│   │   └── {command-name}/      # Individual command directories
│   ├── prompts/
│   ├── services/
│   │   ├── actions/
│   ├── utils/
│   ├── app-config.ts
│   └── index.ts
├── temp_export_*/
├── tests/
├── types/
├── .editorconfig
├── .env.example
├── .gitignore
├── .npmrc
├── .nvmrc
├── .prettierrc.json
├── eslint.config.mjs
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

## 4. Command Pattern and Structure

All commands follow a consistent two-layer architecture pattern to ensure
maintainability and code organization.

### 4.1. Architecture Overview

The project uses a **Command → Action** architecture pattern:

- **Commands Layer** (`src/commands/`): User interface orchestration
- **Actions Layer** (`src/services/actions/`): Business logic execution

**Commands are responsible for:**

- User interaction and prompts
- Input validation and confirmation
- Context gathering (hub, repository, filters)
- Progress monitoring and user feedback
- Calling the appropriate action with collected context

**Actions are responsible for:**

- Core business logic implementation
- API interactions with Amplience services
- Data transformation and processing
- Error handling and retry logic
- Actual execution of operations

### 4.2. Directory Structure Pattern

Each command must follow this directory structure:

```text
src/commands/{command-name}/
├── index.ts                    # Barrel export (mandatory)
├── {command-name}.ts          # Command orchestrator (mandatory)
├── prompts/                   # Command-specific prompts (optional)
└── utils.ts                   # Command-specific utilities (optional)

src/commands/shared/            # Shared command utilities
├── index.ts                   # Barrel export (mandatory)
├── location-selection.ts      # Common location selection logic
├── content-operations.ts      # Shared content operations
└── {other-shared-utilities}.ts # Additional shared utilities

src/services/actions/
├── index.ts                   # Barrel export (mandatory)
└── {action-name}.ts          # Action executor (mandatory)
```

### 4.3. Shared Utilities Pattern

To reduce code duplication, common functionality used across multiple commands
should be extracted into shared utilities:

- **Location Selection**: Hub, repository, and folder selection logic shared via
  `commands/shared/location-selection.ts`
- **Content Operations**: Common content fetching and hierarchy analysis
  patterns shared via `commands/shared/content-operations.ts`
- **Folder Tree Operations**: Folder tree manipulation utilities in
  `utils/folder-tree.ts`
- **Progress Tracking**: Shared progress bar and display utilities in `utils/`

**Import Strategy for Shared Code:**

- Use `../shared` imports for command-level shared utilities
- Use `~/utils` imports for general-purpose utilities
- Follow the project's architectural constraints (utils layer cannot import from
  services)

### 4.4. File Naming Convention

- **Command Directory**: Use `kebab-case` (e.g., `sync-hierarchy`,
  `cleanup-folder`)
- **Command File**: Same name as directory (e.g., `sync-hierarchy.ts`)
- **Command Function**: `run{PascalCaseCommandName}()` (e.g.,
  `runSyncHierarchy()`)
- **Action File**: Use `kebab-case` (e.g., `sync-hierarchy.ts`,
  `cleanup-folder.ts`)
- **Action Function**: `{camelCaseActionName}()` (e.g., `syncHierarchy()`,
  `cleanupFolder()`)
- **Prompt Files**: Use `prompt-for-{descriptive-name}.ts` pattern
- **Utility Files**: Use `{descriptive-name}.ts` pattern

### 4.5. Integration Requirements

New commands must be integrated by:

1. Adding export to `src/commands/index.ts`
2. Adding import and case to `src/index.ts`
3. Creating documentation in `docs/{command-name}.md`
4. Updating main README.md

### 4.6. Best Practices

- **Clear Separation**: Commands handle UI/UX, actions handle business logic
- **Error Handling**: Commands show user-friendly messages, actions throw
  detailed errors
- **Confirmation Prompts**: Always ask for confirmation before destructive
  actions
- **Dry Run Support**: Both commands and actions must support dry-run mode
- **Context Passing**: Pass complete context objects to actions, not individual
  parameters
- **Code Reuse**: Extract common functionality into shared utilities to avoid
  duplication:
  - Common UI patterns → `commands/shared/`
  - General utilities → `utils/`
  - Respect architectural constraints when placing shared code

## 5. Global Types

A dedicated `types/` directory stores TypeScript declaration files (`.d.ts`)
that define types available globally across the project without explicit
imports, as configured in `tsconfig.json`.

### Type File Structure

- **`types/amplience.d.ts`**: Amplience-specific objects like `ContentItem`,
  `Hub`, etc., wrapped in the `Amplience` namespace
- **`types/global.d.ts`**: General-purpose global types and environment variable
  definitions
- **`types/index.d.ts`**: Additional type definitions and exports

### Key Rules

1. **No Explicit Imports Required**: Types are automatically available
   throughout the project
2. **Namespace Wrapping**: All custom types must be wrapped in appropriate
   namespaces within `declare global` blocks
3. **Global Usage**: Reference types directly using their namespace (e.g.,
   `Amplience.ContentItem`)
4. **TypeScript Configuration**: The `tsconfig.json` includes type files and
   recognizes custom types

## 6. Path Aliases and Import Strategy

The project uses path aliases and barrel exports to improve code readability and
maintainability.

### Path Aliases

The TypeScript configuration includes a path alias `~/*` that points to the
`src/` directory, enabling cleaner imports throughout the project. This
eliminates deep relative import paths.

### Index Barrel Files

Each directory containing multiple modules includes an `index.ts` file that
re-exports all public APIs:

- **`src/services/index.ts`**: Exports all service classes
- **`src/utils/index.ts`**: Exports utility functions
- **`src/commands/index.ts`**: Exports all command handlers
- **`src/commands/shared/index.ts`**: Exports shared command utilities
- **`src/prompts/index.ts`**: Exports all shared prompt functions

This allows for clean grouped imports using the `~/` path alias, reducing import
statement clutter and improving code organization.

## 7. Linting and Code Style

- **Linter**: ESLint v9 will be used. The configuration in `eslint.config.mjs`
  uses the flat config format and enforces code quality and consistency.
- **File Naming**: An ESLint plugin (`eslint-plugin-unicorn`) will be used to
  enforce the `kebab-case` file naming convention.
- **Formatter**: Prettier is configured via `.prettierrc.json` for automated
  code formatting.
- **Pre-commit Hook**: It is recommended to use a tool like Husky to run linting
  and formatting checks automatically before each commit.

## 8. Version Control

- **System**: Git.
- **`.gitignore`**: A comprehensive `.gitignore` file will be set up to exclude
  `node_modules`, `.env` files, build artifacts, and IDE-specific files. The
  `reports/` directory will also be excluded.

## 9. Build and Development Scripts

The application runs directly using `tsx`, a fast TypeScript runner, without
requiring compilation:

- **`start`**: Executes the application entry point
- **`dev`**: Runs with hot-reloading for development
- **`lint`**: Runs ESLint checks across the codebase
- **`lint:fix`**: Automatically fixes ESLint errors where possible
- **`format`**: Runs Prettier to format the entire codebase

## 10. Testing Setup

- **Framework**: Vitest configured for unit and integration tests
- **Configuration**: `vitest.config.ts` defines the test environment
- **TypeScript Support**: Native TypeScript and ESM support
- **Scripts**: `test` for single run, `test:watch` for watch mode

## 11. Deployment Considerations

This is a local CLI tool executed by cloning the repository, installing
dependencies via `npm install`, and running via `npm start`. No deployment
infrastructure is required.
