# Functionality: Archive Content Type Schemas

This functionality is designed to safely archive content type schemas from an
Amplience hub, along with their dependent content types and content items. The
tool provides a comprehensive archiving solution that maintains data integrity
by handling dependencies in the correct order.

## Purpose

The primary purpose is to automate the process of archiving unused or obsolete
content type schemas while ensuring that all dependent resources are properly
archived first. This helps maintain a clean content management environment and
prevents orphaned content or broken references.

## Problems it solves

- **Dependency Management**: Automatically identifies and archives dependent
  content items and content types before archiving schemas, preventing broken
  references.
- **Manual Process Complexity**: Eliminates the complex manual process of
  identifying all dependencies and archiving them in the correct order.
- **Data Integrity**: Ensures that content relationships remain intact during
  the archiving process.
- **Safe Operations**: Provides dry-run functionality to preview what will be
  archived before making any changes.
- **Bulk Operations**: Allows archiving multiple schemas and their dependencies
  in a single operation.
- **Error Prevention**: Prevents common errors like trying to archive schemas
  that still have active content items or content types.

## How it works

1. **Hub Selection**: The user is prompted to select a hub from the configured
   hubs in the environment settings.

2. **Configuration Options**: The user can configure several options:
   - Whether to include already archived schemas in the search
   - Schema ID filter (regex pattern) to target specific schemas
   - Dry-run mode to preview changes without making them

3. **Schema Discovery**: The tool fetches all content type schemas from the
   selected hub and applies any specified filters.

4. **Schema Selection**: The user is presented with a list of available schemas
   and can select which ones to archive (with multi-select support).

5. **Dependency Analysis**: For each selected schema, the tool:
   - Identifies all content types that use the schema
   - Finds all content items that are instances of those content types
   - Maps the complete dependency tree

6. **Operation Preview**: The tool displays a summary showing:
   - Number of schemas to be archived
   - Number of dependent content types
   - Number of dependent content items
   - Operation mode (dry-run or execute)

7. **User Confirmation**: A final confirmation prompt is shown before proceeding
   with the actual archiving.

8. **Archiving Process**: If confirmed, the tool archives resources in the
   correct dependency order:
   - **Step 1**: Archive all dependent content items (both hierarchical and
     non-hierarchical)
   - **Step 2**: Archive all dependent content types
   - **Step 3**: Archive the selected content type schemas

9. **Content Item Handling**: The tool intelligently handles different types of
   content items:
   - **Hierarchical Items**: Uses `archiveContentItemWithDescendants` to
     maintain hierarchy integrity
   - **Non-hierarchical Items**: Uses standard `archiveContentItem` for
     individual items
   - **Repository Detection**: Automatically finds the correct repository for
     each content item

10. **Progress Tracking**: Detailed progress bars show the status of each
    archiving phase with real-time updates.

11. **Results Summary**: The tool provides comprehensive reporting of:
    - Number of content items archived (successful/failed)
    - Number of content types archived (successful/failed)
    - Number of schemas archived (successful/failed)
    - Detailed error messages for any failures

## Technical Implementation

### Architecture

The command follows a clean separation of concerns pattern:

- **Command Layer** (`archive-content-type-schemas.ts`): Handles all user
  interactions, prompts, and orchestration
- **Action Layer** (`services/actions/archive-content-type-schemas.ts`):
  Contains pure business logic with no UI dependencies
- **Service Layer** (`AmplienceService`): Provides abstracted API access to
  Amplience resources

### Key Features

- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Error Handling**: Robust error handling with detailed error messages
- **Dependency Resolution**: Intelligent dependency tree analysis
- **Progress Reporting**: Real-time progress tracking with visual indicators
- **Dry-Run Support**: Safe preview mode for testing operations
- **Batch Processing**: Efficient handling of multiple resources
- **Memory Management**: Optimized for large datasets

### Data Flow

```text
User Input → Command Orchestrator → Action Layer → Amplience Service → Amplience API
    ↓              ↓                    ↓               ↓
Progress ← UI Updates ← Business Logic ← Service Results ← API Responses
```

### Error Recovery

- **Partial Failures**: Continues processing remaining items even if some fail
- **Detailed Logging**: Provides specific error messages for debugging
- **Rollback Safety**: Dry-run mode allows testing before execution
- **Validation**: Pre-flight checks ensure operations can succeed

## Usage Examples

### Basic Usage

```bash
npm run archive-content-type-schemas
```

### Typical Workflow

1. Select hub from configured environments
2. Choose whether to include archived schemas
3. Apply schema ID filter (optional, e.g., `^legacy-.*` for schemas starting
   with "legacy-")
4. Choose dry-run mode for initial testing
5. Select schemas from the filtered list
6. Review dependency summary
7. Confirm operation
8. Monitor progress and review results

### Best Practices

- **Always use dry-run first**: Test the operation to understand what will be
  archived
- **Filter strategically**: Use regex patterns to target specific schema groups
- **Archive in batches**: For large numbers of schemas, consider archiving in
  smaller groups
- **Verify dependencies**: Review the dependency analysis before confirming
- **Monitor progress**: Watch for any failures and address them individually if
  needed

## Safety Features

- **Dry-Run Mode**: Preview all changes before execution
- **Dependency Validation**: Ensures proper archiving order
- **User Confirmation**: Multiple confirmation steps prevent accidental
  execution
- **Error Isolation**: Failures in individual items don't stop the entire
  operation
- **Comprehensive Logging**: Detailed audit trail of all operations
