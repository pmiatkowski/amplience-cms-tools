# Amplience CMS Tools

A comprehensive command-line interface tool for automating bulk operations
within Amplience CMS. This tool provides efficient content management operations
that are not available through the standard Amplience UI, featuring interactive
prompts, advanced filtering, and detailed reporting.

## 🚀 Features

- **Multi-Hub Support**: Work with multiple Amplience environments (DEV,
  PLAYGROUND, PROD)
- **Comprehensive Bulk Operations**: 11 specialized commands for different
  content management tasks
- **Two-Layer Architecture**: Clean separation between user interface (commands)
  and business logic (actions)
- **Advanced Filtering**: Filter content items by schema ID, status, publication
  state, and delivery key patterns
- **Safe Operations**: Built-in dry-run mode with explicit confirmation for live
  execution
- **Detailed Reporting**: Generate comprehensive Markdown reports for all
  operations
- **Interactive CLI**: User-friendly prompts and progress indicators
- **Amplience DC-CLI Integration**: Leverages official Amplience tooling for
  schema operations
- **Cross-Hub Operations**: Support for content migration and synchronization
  between different hubs

## 📋 Prerequisites

- Node.js v22.0.0 or higher
- npm (comes with Node.js)
- Access to Amplience CMS with appropriate API credentials

## 🛠️ Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd amplience-cms-tools
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and fill in your Amplience API credentials for each
   environment.

## 🔧 Configuration

### Authentication Methods

The tool supports two authentication methods:

1. **OAuth Credentials (Client ID + Client Secret)** - Recommended for service
   accounts and per-hub access control
2. **Personal Access Token (PAT)** - Recommended for individual users and
   simplified configuration

Both methods are equally secure. Choose the one that best fits your workflow.

#### OAuth Credentials Configuration

```env
# Hub Configuration Pattern: AMP_HUB_<HUBNAME>_<PROPERTY>

# Development Environment (OAuth)
AMP_HUB_DEV_CLIENT_ID=your_dev_client_id
AMP_HUB_DEV_CLIENT_SECRET=your_dev_client_secret
AMP_HUB_DEV_HUB_ID=your_dev_hub_id
AMP_HUB_DEV_HUB_NAME=DEV
AMP_HUB_DEV_EXT_URL=https://dev.amplience.net

# Production Environment (OAuth)
AMP_HUB_PROD_CLIENT_ID=your_prod_client_id
AMP_HUB_PROD_CLIENT_SECRET=your_prod_client_secret
AMP_HUB_PROD_HUB_ID=your_prod_hub_id
AMP_HUB_PROD_HUB_NAME=PROD
AMP_HUB_PROD_EXT_URL=https://prod.amplience.net
```

#### Personal Access Token (PAT) Configuration

PAT authentication uses a **single generic token** that works across all
configured hubs:

```env
# Single PAT Token for all hubs
PAT_TOKEN=your_personal_access_token_here

# Development Environment
AMP_HUB_DEV_HUB_ID=your_dev_hub_id
AMP_HUB_DEV_HUB_NAME=DEV
AMP_HUB_DEV_EXT_URL=https://dev.amplience.net

# Production Environment
AMP_HUB_PROD_HUB_ID=your_prod_hub_id
AMP_HUB_PROD_HUB_NAME=PROD
AMP_HUB_PROD_EXT_URL=https://prod.amplience.net
```

**Important:** When `PAT_TOKEN` is set, it applies to **all** configured hubs.
The token must have permissions for all hubs you want to manage.

#### Mixed Configuration

You can use different authentication methods across environments. If `PAT_TOKEN`
is not set, the tool falls back to OAuth credentials per hub:

```env
# Development with OAuth
AMP_HUB_DEV_CLIENT_ID=your_dev_client_id
AMP_HUB_DEV_CLIENT_SECRET=your_dev_client_secret
AMP_HUB_DEV_HUB_ID=your_dev_hub_id
AMP_HUB_DEV_HUB_NAME=DEV
AMP_HUB_DEV_EXT_URL=https://dev.amplience.net

# Production also with OAuth (no PAT_TOKEN set)
AMP_HUB_PROD_CLIENT_ID=your_prod_client_id
AMP_HUB_PROD_CLIENT_SECRET=your_prod_client_secret
AMP_HUB_PROD_HUB_ID=your_prod_hub_id
AMP_HUB_PROD_HUB_NAME=PROD
AMP_HUB_PROD_EXT_URL=https://prod.amplience.net
```

Or use PAT for all hubs:

```env
# Single PAT token for all environments
PAT_TOKEN=your_personal_access_token_here

# Development Environment
AMP_HUB_DEV_HUB_ID=your_dev_hub_id
AMP_HUB_DEV_HUB_NAME=DEV
AMP_HUB_DEV_EXT_URL=https://dev.amplience.net

# Production Environment
AMP_HUB_PROD_HUB_ID=your_prod_hub_id
AMP_HUB_PROD_HUB_NAME=PROD
AMP_HUB_PROD_EXT_URL=https://prod.amplience.net
```

**Authentication Priority:**

- If `PAT_TOKEN` is set, it takes precedence for all hubs (OAuth credentials are
  ignored)
- If `PAT_TOKEN` is not set, OAuth credentials (CLIENT_ID + CLIENT_SECRET) are
  required per hub

**Hub URL Configuration:**

Each hub can optionally have an EXT_URL property that points to the hub's
Amplience extensions interface:

```env
AMP_HUB_<HUBNAME>_EXT_URL=https://your-hub.amplience.net
```

- The URL must be a valid HTTPS URL

### Configuration Features

**Key Benefits:**

- **Auto-Discovery**: No need to maintain a central list of hubs
- **Flexible Authentication**: Choose OAuth or PAT based on your needs
- **Simplified PAT Setup**: Single token for all hubs reduces configuration
  complexity
- **Reduced Errors**: Misconfigurations are automatically detected

**Rate Limiting Configuration:**

The tool automatically handles API rate limits (HTTP 429 responses) with
configurable retry behavior:

```env
# Retry Configuration (optional)
RETRIES_COUNT=3           # Maximum number of retry attempts (default: 3)
RETRY_AWAIT_TIME=60       # Base wait time in seconds before retry (default: 60)
```

- When a rate limit is encountered, the tool will automatically retry the
  request
- If the API provides a `Retry-After` header, that value is used
- Otherwise, exponential backoff is applied: `RETRY_AWAIT_TIME * (2 ^ attempt)`
- After `RETRIES_COUNT` attempts, the operation will fail with an error

**Migration from Previous Version:**

If you're upgrading from a previous version that used `AMP_HUBS`, simply:

1. Remove the `AMP_HUBS` variable from your `.env` file
2. Rename your hub variables from `AMP_<HUBNAME>_*` to `AMP_HUB_<HUBNAME>_*`
3. Choose your authentication method:
   - For PAT: Set `PAT_TOKEN` and configure HUB_ID/HUB_NAME for each hub
   - For OAuth: Configure CLIENT_ID/CLIENT_SECRET/HUB_ID/HUB_NAME per hub

## 🚀 Usage

### Production Mode

```bash
npm start
```

### Available Scripts

- `npm start` - Run the CLI tool
- `npm test` - Run the test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix auto-fixable linting errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking
- `npm run build` - Validate TypeScript compilation

## 🎯 Available Commands

The CLI tool provides 16 specialized commands for different bulk operations:

### 1. VSE Management

**Command**: VSE Management
**Documentation**: [vse-management.md](docs/vse-management.md)

Provides operations for managing Visual Studio Edition (VSE) visualization settings
across multiple content types. **Bulk Update Visualizations** operation enables
efficient updates to visualization configurations with support for:

- Content type selection via API regex filtering or JSON file
- Visualization configuration from JSON file with hub-specific URL replacement
- Dry-run mode for previewing changes before execution
- Progress tracking and detailed markdown reports
- Sequential processing with error handling on individual failures

### 2. Clean Repository

**Command**: Clean Repository  
**Documentation**: [clean-repository.md](docs/clean-repository.md)

Performs comprehensive cleanup of a repository by archiving content items with
support for hierarchical structures and complex filtering options.

### 3. Cleanup Folder

**Command**: Cleanup Folder
**Documentation**: [cleanup-folder.md](docs/cleanup-folder.md)

Moves all content items from a folder to a designated deleted folder, archives
them, and removes empty folder structures systematically.

### 4. Copy Folder with Content

**Command**: Copy Folder with Content  
**Documentation**: [copy-folder-with-content.md](docs/copy-folder-with-content.md)

Duplicates a complete folder structure and its content from source to
destination, supporting cross-hub content migration and duplication.

### 5. List Folder Tree Structure

**Command**: List folder tree structure
**Documentation**: [list-folder-tree.md](docs/list-folder-tree.md)

Visualizes repository folder hierarchy in multiple formats (tree, table, JSON)
with detailed statistics and navigation options.

### 6. Recreate Content Items

**Command**: Recreate Content Items  
**Documentation**: [recreate-content-items.md](docs/recreate-content-items.md)

Recreates content items across different hubs, repositories, and folders with
comprehensive filtering, hierarchy handling, and locale management.

### 7. Recreate Folder Structure

**Command**: Recreate Folder Structure
**Documentation**: [recreate-folder-structure.md](docs/recreate-folder-structure.md)

Replicates folder hierarchies from source to target locations without content,
perfect for environment setup and structural consistency.

### 8. Copy Content Type Schemas

**Command**: Copy Content Type Schemas  
**Documentation**: [copy-content-type-schemas.md](docs/copy-content-type-schemas.md)

Copies content type schemas between hubs using Amplience DC-CLI, ensuring
consistent content models across environments with optional content type
synchronization.

### 9. Archive Content Type Schemas

**Command**: Archive Content Type Schemas
**Documentation**: [archive-content-type-schemas.md](docs/archive-content-type-schemas.md)

Archives content type schemas and their dependencies (content types and content
items) in the correct dependency order to maintain data integrity and prevent
orphaned content.

### 10. Copy Content Types

**Command**: Copy Content Types  
**Documentation**: [copy-content-types.md](docs/copy-content-types.md)

Compares and creates missing content types between hubs with proper schema
validation and repository assignments.

### 11. Sync Content Type Properties

**Command**: Sync Content Type Properties
**Documentation**: [sync-content-type-properties.md](docs/sync-content-type-properties.md)

Synchronizes content types with their schemas on a target hub, ensuring content
types reflect the latest schema versions with flexible filtering options.

### 12. Sync Hierarchy

**Command**: Sync Hierarchy  
**Documentation**: [sync-hierarchy.md](docs/sync-hierarchy.md)

Synchronizes content item hierarchies between hubs, comparing source and target
hierarchical structures to create, remove, or update items while preserving
parent-child relationships and handling locale strategies for delivery keys.

### 13. Bulk Sync Hierarchies

**Command**: Bulk Sync Hierarchies
**Documentation**: [bulk-sync-hierarchies.md](docs/bulk-sync-hierarchies.md)

Synchronize multiple content item hierarchies from source to target
hub/repository in a single operation. Features multi-select interface, automatic
matching by delivery key and schema ID, missing hierarchies reporting, and
sequential processing with comprehensive error handling.

### 14. Update Delivery Keys Locale

**Command**: Update Delivery Keys Locale  
**Documentation**: [update-delivery-keys-locale.md](docs/update-delivery-keys-locale.md)

Performs bulk updates to delivery key locale segments with support for
prefix/suffix patterns and optional publishing workflow.

### 15. Manage Extensions

**Command**: Manage Extensions
**Documentation**: [export-extensions.md](docs/export-extensions.md) |
[import-extensions.md](docs/import-extensions.md)

Provides a submenu for extension management operations with two capabilities:

**Export Extensions**: Bulk export extensions from a hub with intelligent
regex-based filtering and flexible handling of existing exports. Includes three
export modes: full overwrite, selective overwrite (matching only), and
incremental addition (get missing only). Features file validation, preview mode,
and configurable default filters.

**Import Extensions**: Bulk import extensions to a hub with automatic
hub-specific field updates (hub IDs and URL origins). Uses temporary directory
workflow to preserve source files, supports regex-based filtering, file
validation, and preview mode. Ideal for cross-environment deployment and
migration scenarios.

Future enhancements will add delete capabilities.

### 16. User Command Sets

**Command**: User Sets
**Documentation**: [user-command-sets.md](docs/user-command-sets.md)

Create and execute predefined sequences of CLI commands, allowing users to
bundle commonly used operations into reusable sets. Features include:

- **Configuration-based**: Define command sets in `command-sets.json`
- **Execution modes**: "Run all" for automated execution or "Step-by-step" for
  controlled workflows
- **Error recovery**: Continue, Stop, or Retry options when commands fail
- **Auto-generation**: Example configuration created on first use
- **CRUD operations**: Create, edit, and delete command sets through the CLI

Example configuration:

```json
{
  "version": "1.0",
  "commandSets": [
    {
      "name": "Daily Sync",
      "description": "Sync prod to dev",
      "commands": [
        { "command": "sync-hierarchy" },
        { "command": "copy-content-types" }
      ]
    }
  ]
}
```

Set `COMMAND_SETS_PATH` environment variable to use a custom configuration file
location.

## 📊 Common Features Across All Commands

- **Interactive Hub Selection**: Choose from configured Amplience environments
- **Repository Selection**: Select target repositories within chosen hubs
- **Advanced Filtering**: Filter content by schema ID, status, publication
  state, and patterns
- **Dry Run Preview**: Review planned changes before execution
- **Safe Execution**: Explicit confirmation required for live updates
- **Progress Tracking**: Real-time progress indicators for long operations
- **Detailed Reporting**: Comprehensive Markdown reports saved to `reports/`
  directory
- **Error Handling**: Robust error handling with detailed failure reporting

## 📊 Reports

All operations generate detailed reports in the `reports/` directory with:

- Operation summary and filters used
- Success/failure counts and timing
- Detailed item-by-item results
- Error messages for failed operations

## 🔒 Security

- **Environment Variables**: Sensitive credentials stored in `.env` files
- **Token Management**: Automatic token refresh and secure storage
- **Dry Run Default**: All operations default to simulation mode
- **Explicit Confirmation**: Live execution requires user confirmation

## 🧪 Testing & Coverage

### Run Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
```

### Generate Coverage Reports

```bash
npm run test:coverage       # Generate coverage reports
npm run coverage:open       # Open HTML coverage report in browser
npm run coverage:report     # Process and analyze coverage (via scripts/process-coverage.ts)
```

**Coverage Thresholds:** 80% for lines, statements, functions, and branches

The coverage system generates multiple report formats:

- **HTML Report** (`coverage/index.html`) - Interactive, line-by-line coverage
  view
- **Terminal Output** - Color-coded summary with file-level details
- **JSON Reports** (`reports/coverage-report-*.json`) - Detailed analysis for
  CI/CD

Reports are excluded from version control but saved locally for analysis.

## 📝 Development

### Technology Stack

- **Runtime Environment**: Node.js v22+
- **Programming Language**: TypeScript v5+
- **Architecture**: Command-Action pattern with clear separation of concerns
- **CLI Interaction**: Inquirer.js
- **Progress Indicators**: cli-progress
- **Logging**: Winston
- **Environment Variables**: dotenv
- **Testing Framework**: Vitest
- **Code Formatter**: Prettier
- **Linting**: ESLint
- **TypeScript Runner**: tsx
- **Amplience Integration**: @amplience/dc-cli

### Code Style

This project uses:

- **ESLint** for code quality with TypeScript support
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Kebab-case** file naming convention
- **Barrel exports** for clean imports
- **Path aliases** (`~/*` → `src/*`) for cleaner imports

### Scripts Reference

#### Development & Code Quality

- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Fix auto-fixable linting errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking

#### Testing & Coverage

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:coverage:watch` - Run tests with coverage in watch mode
- `npm run test:coverage:ui` - Run tests with coverage UI
- `npm run coverage:report` - Process coverage and generate detailed report
- `npm run coverage:open` - Open HTML coverage report in browser

For detailed coverage documentation, see
[docs/coverage-reports.md](./docs/coverage-reports.md).

## 📦 Release & Versioning

This project uses automated semantic releases. The version is determined by the
**Pull Request Title** when merged into `main`.

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Examples

- **Patch** (`v1.0.0` → `v1.0.1`):
  - `fix: correct error message in cleanup command`
- **Minor** (`v1.0.0` → `v1.1.0`):
  - `feat: add new sync-hierarchy command`
- **Major** (`v1.0.0` → `v2.0.0`):
  - `feat!: remove support for legacy config` (Note the `!`)
- **No Release**:
  - `docs: update installation guide`
  - `chore: update dependencies`

## 🤝 Contributing

1. Follow the established code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all commands include comprehensive documentation in `docs/`

## 🆘 Support

For issues, feature requests, or questions:

1. Check existing documentation in the `docs/` folder
2. Review generated reports for operation details
3. Contact the development team

## 📚 Additional Resources

- [Amplience Documentation](https://amplience.com/docs)
- [Amplience DC-CLI Documentation](https://github.com/amplience/dc-cli)
- Individual command documentation in the `docs/` folder

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.

## TODO

- Add reporting for each action
- Add task feature for predefined operations (actions will require context
  parameters first)

## Known Issues

- None currently reported.
