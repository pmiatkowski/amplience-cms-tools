# Tech Foundation Plan - Amplience CLI Tool

## 1. Project Overview

This document outlines the foundational technical plan for the Amplience CLI
Tool. The project is a Node.js command-line application designed to automate
bulk operations within the Amplience CMS, addressing the need for efficient
content management that is not available through the standard UI. The initial
version (MVP) will focus on bulk updating the `deliveryKey` of content items
based on a rich set of filters.

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

The project will adopt a structured layout to separate concerns. File and folder
names will use the kebab-case convention.

```
amplience-tools/
├── .ai/
│   ├── prd.md
│   └── tech-stack.md
├── reports/
│   └── .gitkeep
├── src/
│   ├── commands/
│   │   ├── clean-repository/
│   │   │   ├── prompts/
│   │   │   │   ├── prompt-for-include-hierarchy-descendants.ts
│   │   │   │   └── index.ts
│   │   │   ├── clean-repository.ts
│   │   │   └── index.ts
│   │   ├── cleanup-folder/
│   │   │   ├── prompts/
│   │   │   │   ├── prompt-for-cleanup-options.ts
│   │   │   │   └── index.ts
│   │   │   ├── cleanup-folder.ts
│   │   │   └── index.ts
│   │   ├── copy-folder-with-content/
│   │   │   ├── copy-folder-with-content.ts
│   │   │   └── index.ts
│   │   ├── list-folder-tree/
│   │   │   ├── prompts/
│   │   │   │   ├── prompt-for-start-from.ts
│   │   │   │   ├── prompt-for-selected-folder.ts
│   │   │   │   ├── prompt-for-output-format.ts
│   │   │   │   └── index.ts
│   │   │   ├── list-folder-tree.ts
│   │   │   ├── utils.ts
│   │   │   └── index.ts
│   │   ├── recreate-content-items/
│   │   │   ├── prompts/
│   │   │   │   ├── prompt-for-recreation-filters.ts
│   │   │   │   ├── prompt-for-items-to-recreate.ts
│   │   │   │   ├── prompt-for-target-locale.ts
│   │   │   │   └── index.ts
│   │   │   ├── recreate-content-items.ts
│   │   │   ├── utils.ts
│   │   │   └── index.ts
│   │   ├── recreate-folder-structure/
│   │   │   ├── recreate-folder-structure.ts
│   │   │   └── index.ts
│   │   ├── sync-content-type-schemas/
│   │   │   ├── sync-content-type-schemas.ts
│   │   │   └── index.ts
│   │   ├── update-delivery-keys-locale/
│   │   │   ├── prompts/
│   │   │   │   ├── prompt-for-publish-updated-items.ts
│   │   │   │   └── index.ts
│   │   │   ├── update-delivery-keys-locale.ts
│   │   │   ├── utils.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── prompts/
│   │   ├── prompt-for-cleanup-filters.ts
│   │   ├── prompt-for-command.ts
│   │   ├── prompt-for-confirmation.ts
│   │   ├── prompt-for-content-item.ts
│   │   ├── prompt-for-dry-run.ts
│   │   ├── prompt-for-filters.ts
│   │   ├── prompt-for-folder.ts
│   │   ├── prompt-for-hub.ts
│   │   ├── prompt-for-include-archived.ts
│   │   ├── prompt-for-items-to-clean.ts
│   │   ├── prompt-for-locale-strategy.ts
│   │   ├── prompt-for-locale.ts
│   │   ├── prompt-for-repository.ts
│   │   ├── prompt-for-schema-id-filter.ts
│   │   ├── prompt-for-schemas-to-archive.ts
│   │   ├── prompt-for-schemas-to-sync.ts
│   │   ├── prompt-for-validate-schemas.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── amplience-service.ts
│   │   ├── cache-service.ts
│   │   ├── report-service.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── create-progress-bar.ts
│   │   ├── display-table.ts
│   │   └── index.ts
│   ├── app-config.ts
│   └── index.ts
├── types/
│   ├── amplience.d.ts
│   └── global.d.ts
├── .editorconfig
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .nvmrc
├── .npmrc
├── .prettierrc.json
├── package.json
├── tech-foundation-plan.md
├── tsconfig.json
└── vitest.config.ts
```

## 4. Key Files

- **`src/index.ts`**: The main entry point of the application. Responsible for
  initializing the CLI.
- **`src/app-config.ts`**: Handles loading and validation of environment
  variables from `.env` files using `dotenv`.
- **`src/commands/`**: Command modules organized in individual folders:
  - **`clean-repository/`**: Repository cleanup with hierarchy handling
  - **`cleanup-folder/`**: Folder cleanup operations
  - **`copy-folder-with-content/`**: Folder and content duplication
  - **`list-folder-tree/`**: Folder hierarchy visualization
  - **`recreate-content-items/`**: Content item recreation between hubs
  - **`recreate-folder-structure/`**: Folder structure recreation
  - **`sync-content-type-schemas/`**: Schema synchronization
  - **`update-delivery-keys-locale/`**: Delivery key locale updates
- **`src/commands/*/prompts/`**: Command-specific interactive prompts
- **`src/prompts/`**: Shared interactive prompts across commands, including:
  - `prompt-for-cleanup-filters.ts`: Prompts for cleanup operation filters
  - `prompt-for-command.ts`: Main command selection prompt
  - `prompt-for-confirmation.ts`: General confirmation prompts
  - `prompt-for-content-item.ts`: Content item selection prompts
  - `prompt-for-dry-run.ts`: Dry run confirmation prompts
  - `prompt-for-filters.ts`: General filtering prompts
  - `prompt-for-folder.ts`: Folder selection prompts
  - `prompt-for-hub.ts`: Hub selection prompts
  - `prompt-for-include-archived.ts`: Archive inclusion prompts
  - `prompt-for-items-to-clean.ts`: Item cleanup selection prompts
  - `prompt-for-locale-strategy.ts`: Locale strategy selection prompts
  - `prompt-for-locale.ts`: Locale selection prompts
  - `prompt-for-repository.ts`: Repository selection prompts
  - `prompt-for-schema-id-filter.ts`: Schema ID filtering prompts
  - `prompt-for-schemas-to-archive.ts`: Schema archival selection prompts
  - `prompt-for-schemas-to-sync.ts`: Schema synchronization selection prompts
  - `prompt-for-validate-schemas.ts`: Schema validation prompts
- **`src/services/amplience-service.ts`**: Encapsulates all communication with
  the Amplience API using native `fetch`.
- **`src/services/cache-service.ts`**: Manages the simple in-memory cache for
  the session.
- **`src/services/report-service.ts`**: Manages the creation and saving of
  Markdown reports.
- **`src/utils/create-progress-bar.ts`**: Creates and manages CLI progress bars
  for long-running operations.
- **`src/utils/display-table.ts`**: Formats and displays tabular data in the
  terminal.
- **`src/services/index.ts`**: Barrel export file that re-exports all service
  classes for simplified imports.
- **`src/utils/index.ts`**: Barrel export file that re-exports all utility
  functions for simplified imports (`createProgressBar`, `displayTable`).
- **`src/commands/index.ts`**: Barrel export file that re-exports all command
  handlers for simplified imports.
- **`src/prompts/index.ts`**: Barrel export file that re-exports all shared
  prompt functions for simplified imports.
- **`.nvmrc`**: Specifies the required Node.js version (`v22`).
- **`.npmrc`**: Configured to enforce the Node.js version specified in
  `package.json`.
- **`.editorconfig`**: Defines and maintains consistent coding styles between
  different editors and IDEs.
- **`.prettierrc.json`**: Configuration file for Prettier.
- **`package.json`**: Defines project metadata, dependencies, and scripts.
- **`tsconfig.json`**: TypeScript compiler configuration, including path aliases
  (`~/*` → `src/*`).
- **`vitest.config.ts`**: Configuration file for the Vitest testing framework.

## 5. Global Types

A dedicated `types/` directory will store TypeScript declaration files
(`.d.ts`). These files will define types that are available globally across the
project without the need for explicit imports, as configured in `tsconfig.json`.

### Type File Structure and Usage

All type files in the `types/` directory must follow the ambient declaration
pattern using `declare global` blocks. This ensures types are globally available
without requiring explicit imports.

- **`types/amplience.d.ts`**: Contains type definitions for Amplience-specific
  objects like `ContentItem`, `Hub`, etc., wrapped in the `Amplience` namespace.
- **`types/global.d.ts`**: Contains general-purpose global types and environment
  variable definitions.

### Important Global Type Rules

1. **No Explicit Imports Required**: Types defined in the `types/` directory are
   automatically available throughout the project without import statements.

2. **Namespace Wrapping**: All custom types must be wrapped in appropriate
   namespaces within `declare global` blocks:

   ```typescript
   // ✅ Correct - Global ambient declaration
   declare global {
     namespace Amplience {
       interface ContentItem {
         id: string;
         label: string;
         // ...
       }
     }
   }

   // ❌ Incorrect - Would require explicit imports
   export interface ContentItem {
     id: string;
     label: string;
   }
   ```

3. **Usage in Code**: Reference global types directly using their namespace:

   ```typescript
   // ✅ Correct usage - no imports needed
   function processContent(item: Amplience.ContentItem): void {
     console.log(item.label);
   }

   // ❌ Incorrect - avoid explicit imports of global types
   import { ContentItem } from '../types/amplience';
   ```

4. **TypeScript Configuration**: The `tsconfig.json` is configured with:
   - `"include": ["types/**/*"]` to include all type files
   - `"typeRoots": ["./types", "./node_modules/@types"]` to recognize custom
     types
   - Global type files are automatically processed by TypeScript

## 6. Path Aliases and Import Strategy

To improve code readability and maintainability, the project will use path
aliases and barrel exports:

### Path Aliases

The TypeScript configuration will include a path alias `~/*` that points to the
`src/` directory, allowing for cleaner imports throughout the project:

```typescript
// Instead of relative imports like:
import { AmplienceService } from '../../../services/amplience-service';

// Use alias imports with ~/ pointing to src/:
import { AmplienceService } from '~/services/amplience-service';

// Other examples of the ~/ alias usage:
import { createProgressBar } from '~/utils/create-progress-bar';
import { promptForHub } from '~/prompts/prompt-for-hub';
```

### Index Barrel Files

Each directory containing multiple modules will include an `index.ts` file that
re-exports all public APIs, simplifying imports, for example:

- **`src/services/index.ts`**: Exports all service classes
- **`src/utils/index.ts`**: Exports utility functions (`createProgressBar`,
  `displayTable`)
- **`src/commands/index.ts`**: Exports all command handlers
- **`src/prompts/index.ts`**: Exports all shared prompt functions

This allows for clean grouped imports using the `~/` path alias which points to
the `src/` directory:

```typescript
// Instead of multiple import statements:
import { AmplienceService } from '~/services/amplience-service';
import { CacheService } from '~/services/cache-service';
import { ReportService } from '~/services/report-service';

// Use barrel imports with path alias:
import { AmplienceService, CacheService, ReportService } from '~/services';

// Utility imports:
import { createProgressBar, displayTable } from '~/utils';

// Prompt imports:
import { promptForHub, promptForRepository } from '~/prompts';
```

## 7. Linting and Code Style

- **Linter**: ESLint v9 will be used. The configuration in `.eslintrc.cjs` will
  enforce code quality and consistency.
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

As this is an internal tool, no compilation step is required. The application
will be run directly using `tsx`, a fast TypeScript runner.

- `"start"`: Executes the application's entry point: `tsx src/index.ts`.
- `"dev"`: Runs the application in development mode with hot-reloading:
  `tsx watch src/index.ts`.
- `"lint"`: Runs ESLint checks across the codebase.
- `"lint:fix"`: Automatically fixes ESLint errors where possible.
- `"format"`: Runs Prettier to format the entire codebase.

## 10. Testing Setup

- **Framework**: Vitest is configured for running unit and integration tests.
- **Configuration**: A `vitest.config.ts` file defines the test environment.
- **TypeScript Support**: Vitest provides native TypeScript and ESM support.
- **Test Script**: The `"test"` script in `package.json` will execute the test
  suite, and `"test:watch"` will run it in watch mode.

## 11. Deployment Considerations

This is a local CLI tool and is not intended for deployment. Execution is
handled by cloning the repository, installing dependencies via `npm install`,
and running the start script via `npm start`.
