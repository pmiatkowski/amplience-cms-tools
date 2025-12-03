# Sync Content Type Properties

## Overview

The **Sync Content Type Properties** command synchronizes content types with
their schemas on a target hub. This ensures that content types reflect the
latest version of their associated schemas by calling the
`dc-cli content-type sync` command for each content type.

## Use Cases

- **Schema Updates**: After updating content type schemas, synchronize all
  affected content types to reflect the changes
- **Selective Sync**: Synchronize only content types matching specific schema
  URIs using regex patterns
- **Status-based Sync**: Synchronize only active, archived, or all content types
- **Post-Schema Copy**: Automatically sync content types after copying schemas
  between hubs

## Features

- **Flexible Filtering**: Filter content types by schema URI pattern (regex) and
  status (ACTIVE/ARCHIVED/ALL)
- **Progress Feedback**: Visual progress bar showing synchronization progress
- **Error Handling**: Detailed error reporting for failed synchronizations
- **Programmatic Access**: Reusable function that can be called from other
  commands
- **Confirmation**: User confirmation before executing bulk synchronization

## Command Flow

1. **Hub Selection**: Select the target hub where content types should be
   synchronized
2. **Schema Filter** (Optional): Provide a regex pattern to filter content types
   by their schema URI
3. **Status Filter**: Choose which content types to sync (Active only, Archived
   only, or All)
4. **Content Type Listing**: Retrieves and filters content types from the target
   hub
5. **Confirmation**: Displays filtered content types and asks for confirmation
6. **Synchronization**: Executes `dc-cli content-type sync` for each content
   type with progress feedback
7. **Results**: Shows summary of successful and failed synchronizations

## Usage

### Interactive Mode

Run the command from the main menu:

```bash
npm start
# Select: "Sync content-type properties (Synchronizes content types with their schemas)"
```

### Programmatic Usage

The command exposes a reusable `syncContentTypeProperties` function:

```typescript
import { syncContentTypeProperties } from './commands/sync-content-type-properties';

// Sync all active content types
const result = await syncContentTypeProperties({
  context: {
    targetHub: myHubConfig,
    statusFilter: 'ACTIVE',
    skipConfirmations: true,
  },
});

// Sync content types matching a schema pattern
const result = await syncContentTypeProperties({
  context: {
    targetHub: myHubConfig,
    schemaIdFilter: 'https://schema.example.com/.*',
    statusFilter: 'ALL',
    skipConfirmations: false,
  },
});
```

## Integration with Copy Content Type Schemas

This command is automatically offered as an optional step when copying content
type schemas. After successfully importing schemas to a target hub, you'll be
prompted:

> Do you want to synchronize the content types for the selected schemas after
> they are created in the target hub?

If you answer "Yes", the system will:

1. Wait briefly for schema indexing to complete
2. Filter content types to only those using the newly copied schemas
3. Synchronize those content types automatically

## Parameters

### Context Object (for programmatic use)

| Parameter           | Type                              | Required | Description                                    |
| ------------------- | --------------------------------- | -------- | ---------------------------------------------- |
| `targetHub`         | `Amplience.HubConfig`             | Yes      | Target hub configuration                       |
| `schemaIdFilter`    | `string`                          | No       | Regex pattern to filter by schema URI          |
| `statusFilter`      | `'ACTIVE' \| 'ARCHIVED' \| 'ALL'` | No       | Content type status filter (default: 'ACTIVE') |
| `skipConfirmations` | `boolean`                         | No       | Skip user confirmation prompts                 |

### Return Object

```typescript
{
  success: boolean;                    // Overall operation success
  processedContentTypes: string[];     // Successfully synced content type IDs
  failedContentTypes: Array<{          // Failed synchronizations
    contentTypeId: string;
    error: string;
  }>;
  totalCount: number;                  // Total content types processed
}
```

## Example Scenarios

### Scenario 1: Sync All Active Content Types

After making schema changes, sync all active content types:

1. Run command
2. Select target hub
3. Leave schema filter empty (press Enter)
4. Select "Active only"
5. Confirm synchronization

### Scenario 2: Sync Specific Schema Family

Sync only content types for a specific schema namespace:

1. Run command
2. Select target hub
3. Enter schema filter: `https://schema.example.com/blog/.*`
4. Select "Active only"
5. Review filtered content types
6. Confirm synchronization

### Scenario 3: Automated Post-Copy Sync

When using the "Copy content-type-schemas" command:

1. Copy schemas completes successfully
2. System prompts to sync content types
3. Answer "Yes"
4. System automatically syncs only affected content types

## Error Handling

- **dc-cli Not Available**: Checks for local dc-cli installation before
  proceeding
- **No Hubs Configured**: Validates hub configuration in .env file
- **No Content Types Found**: Warns if no content types match the filter
  criteria
- **Individual Failures**: Continues processing remaining content types if one
  fails
- **Detailed Error Report**: Shows which content types failed and why

## Best Practices

1. **Filter Appropriately**: Use schema filters to limit scope and reduce
   processing time
2. **Active Content Types**: Usually only active content types need
   synchronization
3. **Test First**: Use dry-run mode in copy-content-type-schemas to preview
   which schemas will be copied
4. **Wait for Indexing**: When syncing after schema copy, the system
   automatically waits for indexing
5. **Monitor Errors**: Review failed synchronizations and retry if needed

## Technical Details

- Uses `dc-cli content-type list --json` to retrieve content types
- Executes `dc-cli content-type sync {id} --json` for each content type
- Supports Windows and Unix-based systems
- Progress feedback via cli-progress library
- Regex filtering uses case-insensitive matching

## Related Commands

- **Copy Content Type Schemas**: Often used before this command
- **Copy Content Types**: Creates new content types (doesn't sync existing ones)
- **Archive Content Type Schemas**: Archives schemas and their content types

## Notes

- This command synchronizes **existing** content types with their schemas
- It does **not** create new content types (use "Copy Content Types" for that)
- Content types must exist on the target hub before synchronization
- Schema updates must be published before synchronizing content types
- Archived content types can be synchronized if needed (use status filter)
