# Functionality: Copy Content Type Schemas

This functionality is designed to copy content type schemas from a source
Amplience hub to a target hub, ensuring that the structure, validation rules,
and definitions for content are consistent across multiple environments. The
tool uses the Amplience DC-CLI for the actual schema operations.

## Purpose

The primary purpose is to automate the process of keeping content type schemas
aligned across different environments, such as development, testing, and
production. This ensures that content models are identical, which is critical
for a stable and predictable content management workflow.

## Problems it solves

- **Manual Errors**: It eliminates the risk of human error that occurs when
  manually copying and pasting schema definitions between hubs.
- **Environment Drift**: It prevents inconsistencies between environments (e.g.,
  a field exists in DEV but not in PROD), which can lead to content authoring
  issues or application errors.
- **Time Consumption**: It saves significant time compared to the manual process
  of identifying differences and updating each schema one by one.
- **Deployment Risk**: It reduces the risk associated with promoting schema
  changes, providing a reliable and repeatable method for updates.

## How it works

1. **DC-CLI Dependency Check**: The tool first verifies that the Amplience
   DC-CLI is available locally in the project dependencies.

2. **Hub Selection**: The user is prompted to select a source hub and a target
   hub from the configured hubs in the environment settings.

3. **Configuration Options**: The user can configure several options:
   - Schema ID filter (regex pattern) to target specific schemas
   - Whether to include archived schemas from the source
   - Whether to validate schemas before processing
   - Dry-run mode to preview changes without making them

4. **Schema Export**: The tool exports all schemas from the source hub using
   DC-CLI export functionality to a temporary directory.

5. **Filtering**: If filters are applied, the exported schemas are filtered
   based on the specified criteria (schema ID patterns, archived status).

6. **Schema Validation** (optional): Each schema is validated for required
   fields ($id, title, type) and structural correctness before processing.

7. **Schema Selection**: The user is presented with a list of available schemas
   and can select which ones to synchronize (or select all).

8. **Synchronization Process**: For each selected schema:
   - The tool checks if the schema already exists in the target hub
   - If it exists, the schema is updated using DC-CLI import
   - If it doesn't exist, the schema is created using DC-CLI create
   - The tool ensures proper $id field alignment between config and schema files

9. **Progress Tracking**: A progress bar shows the status of schema processing.

10. **Results Summary**: The tool provides a detailed summary of:
    - Number of schemas created
    - Number of schemas updated
    - Any failed operations with error details

## Technical Implementation

- Uses the `@amplience/dc-cli` package as a dependency
- Operates through temporary file exports and imports
- Supports both interactive mode and programmatic context mode
- Includes comprehensive error handling and validation
- Provides dry-run capability for safe testing
