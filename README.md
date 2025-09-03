# Amplience CLI Tool

A powerful command-line interface tool for automating bulk operations within Amplience CMS. This tool addresses the need for efficient content management operations that are not available through the standard Amplience UI.

## 🚀 Features

- **Multi-Hub Support**: Work with multiple Amplience environments (DEV, PLAYGROUND, PROD)
- **Bulk Operations**: Perform mass updates on content items efficiently
- **Advanced Filtering**: Filter content items by schema ID, status, publication state, and delivery key patterns
- **Safe Operations**: Built-in dry-run mode with explicit confirmation for live execution
- **Detailed Reporting**: Generate comprehensive Markdown reports for all operations
- **Interactive CLI**: User-friendly prompts and progress indicators

## 📋 Prerequisites

- Node.js v22.0.0 or higher
- npm (comes with Node.js)
- Access to Amplience CMS with appropriate API credentials

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd amplience-tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and fill in your Amplience API credentials for each environment.

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

### Available Commands

- `npm start` - Run the CLI tool
- `npm run dev` - Run in development mode with hot-reloading
- `npm test` - Run the test suite
- `npm run lint` - Check code quality
- `npm run format` - Format code with Prettier

## 🎯 Current Features (MVP)

### Bulk Delivery Key Updates

The initial version focuses on bulk updating `deliveryKey` attributes for filtered content items:

1. **Interactive Hub Selection**: Choose from configured Amplience environments
2. **Repository Selection**: Select the target repository within the chosen hub
3. **Advanced Filtering**: Filter content items by:
   - Schema ID (regex support)
   - Content status (ACTIVE, ARCHIVED, DELETED)
   - Publication status (NONE, EARLY, LATEST, UNPUBLISHED)
   - Delivery key patterns (regex support)
4. **Dry Run Preview**: Review planned changes before execution
5. **Safe Execution**: Explicit confirmation required for live updates
6. **Progress Tracking**: Real-time progress indicators for long operations
7. **Detailed Reporting**: Comprehensive Markdown reports saved to `reports/` directory

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

### Code Style

This project uses:
- **ESLint** for code quality
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Kebab-case** file naming convention

### Scripts

- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Fix auto-fixable linting errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking

## 🗂️ Project Structure

```
amplience-tools/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── services/          # Business logic and API services
│   └── utils/             # Utility functions and helpers
├── types/                 # TypeScript type definitions
├── tests/                 # Test files
├── reports/               # Generated operation reports
├── docs/                  # Project documentation
└── .ai/                   # AI assistant context files
```

## 🤝 Contributing

1. Follow the established code style and conventions
2. Write tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, feature requests, or questions:
1. Check existing documentation
2. Review generated reports for operation details
3. Contact the development team
