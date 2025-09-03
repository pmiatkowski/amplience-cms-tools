# Amplience CLI Tool

A comprehensive command-line interface tool for automating bulk operations
within Amplience CMS. This tool provides efficient content management operations
that are not available through the standard Amplience UI, featuring interactive
prompts, advanced filtering, and detailed reporting.

## 🚀 Features

- **Multi-Hub Support**: Work with multiple Amplience environments (DEV,
  PLAYGROUND, PROD)
- **Comprehensive Bulk Operations**: 9 specialized commands for different
  content management tasks
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

The tool requires environment-specific configuration in the `.env` file:

```env
# Available hubs
AMP_HUBS=DEV,PLAYGROUND,PROD

# Environment credentials
AMP_DEV_CLIENT_ID=your_dev_client_id
AMP_DEV_CLIENT_SECRET=your_dev_client_secret
AMP_DEV_HUB_ID=your_dev_hub_id
AMP_DEV_HUB_NAME=your_dev_hub_readable_name

# Additional environments...
```

## 🚀 Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Available Scripts

- `npm start` - Run the CLI tool
- `npm run dev` - Run in development mode with hot-reloading
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

The CLI tool provides 9 specialized commands for different bulk operations:

### 1. Clean Repository

**Command**: Clean Repository  
**Documentation**: [clean-repository.md](docs/clean-repository.md)

Performs comprehensive cleanup of a repository by archiving content items with
support for hierarchical structures and complex filtering options.

### 2. Cleanup Folder

**Command**: Cleanup Folder  
**Documentation**: [cleanup-folder.md](docs/cleanup-folder.md)

Moves all content items from a folder to a designated deleted folder, archives
them, and removes empty folder structures systematically.

### 3. Copy Folder with Content

**Command**: Copy Folder with Content  
**Documentation**: [copy-folder-with-content.md](docs/copy-folder-with-content.md)

Duplicates a complete folder structure and its content from source to
destination, supporting cross-hub content migration and duplication.

### 4. List Folder Tree Structure

**Command**: List folder tree structure  
**Documentation**: [list-folder-tree.md](docs/list-folder-tree.md)

Visualizes repository folder hierarchy in multiple formats (tree, table, JSON)
with detailed statistics and navigation options.

### 5. Recreate Content Items

**Command**: Recreate Content Items  
**Documentation**: [recreate-content-items.md](docs/recreate-content-items.md)

Recreates content items across different hubs, repositories, and folders with
comprehensive filtering, hierarchy handling, and locale management.

### 6. Recreate Folder Structure

**Command**: Recreate Folder Structure  
**Documentation**: [recreate-folder-structure.md](docs/recreate-folder-structure.md)

Replicates folder hierarchies from source to target locations without content,
perfect for environment setup and structural consistency.

### 7. Sync Content Type Schemas

**Command**: Sync Content Type Schemas  
**Documentation**: [sync-content-type-schemas.md](docs/sync-content-type-schemas.md)

Synchronizes content type schemas between hubs using Amplience DC-CLI, ensuring
consistent content models across environments.

### 8. Sync Content Types

**Command**: Sync Content Types  
**Documentation**: [sync-content-types.md](docs/sync-content-types.md)

Compares and creates missing content types between hubs with proper schema
validation and repository assignments.

### 9. Update Delivery Keys Locale

**Command**: Update Delivery Keys Locale  
**Documentation**: [update-delivery-keys-locale.md](docs/update-delivery-keys-locale.md)

Performs bulk updates to delivery key locale segments with support for
prefix/suffix patterns and optional publishing workflow.

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

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## 📝 Development

### Technology Stack

- **Runtime Environment**: Node.js v22+
- **Programming Language**: TypeScript v5+
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

- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Fix auto-fixable linting errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking

## 🗂️ Project Structure

```text
amplience-cms-tools/
├── src/
│   ├── commands/                    # Command implementations
│   │   ├── clean-repository/        # Repository cleanup
│   │   ├── cleanup-folder/          # Folder cleanup
│   │   ├── copy-folder-with-content/# Cross-hub content duplication
│   │   ├── list-folder-tree/        # Folder structure visualization
│   │   ├── recreate-content-items/  # Content item recreation
│   │   ├── recreate-folder-structure/# Folder structure duplication
│   │   ├── sync-content-type-schemas/# Schema synchronization
│   │   ├── sync-content-types/      # Content type synchronization
│   │   └── update-delivery-keys-locale/# Delivery key locale updates
│   ├── prompts/                     # Shared interactive prompts
│   ├── services/                    # Business logic and API services
│   └── utils/                       # Utility functions and helpers
├── types/                          # TypeScript type definitions
├── tests/                          # Test files
├── reports/                        # Generated operation reports
├── docs/                           # Detailed command documentation
└── temp_export_*/                  # Temporary export directories
```

## 🤝 Contributing

1. Follow the established code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all commands include comprehensive documentation in `docs/`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for
details.

## 🆘 Support

For issues, feature requests, or questions:

1. Check existing documentation in the `docs/` folder
2. Review generated reports for operation details
3. Contact the development team

## 📚 Additional Resources

- [Amplience Documentation](https://amplience.com/docs)
- [Amplience DC-CLI Documentation](https://github.com/amplience/dc-cli)
- Individual command documentation in the `docs/` folder

## TODO

- Simplify environment configuration and management - Drop `AMP_HUBS` and
  instead use `AMP_HUB_<HUB_NAME>` pattern to auto-detect hubs.
- In hierarchy synchronization, when item needs to be removed, it should be
  removed as in the clean-repository procedure - including removing delivery
  key, dropping from hierarchy, unpublishing, moving to deleted folder,
  archiving.
- Refactor files structure (put in separate folders) and add tests in
  `__tests__` folder in each module.
