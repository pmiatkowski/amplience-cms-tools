# Functionality: Copy Content Types

The "Copy Content Types" functionality is a self-contained command module that
orchestrates the process of comparing and creating missing content types between
different Amplience hubs.

## Purpose

The primary purpose is to ensure that content types are consistent across
different environments, such as development, staging, and production. This
functionality specifically focuses on creating missing content types in the
target hub and assigning them to appropriate repositories.

## Problems it solves

- **Environment Drift:** Prevents inconsistencies where content types exist in
  source environments but are missing in target environments, which can lead to
  deployment failures and broken content item references.
- **Manual Content Type Creation:** Eliminates the need for manual, error-prone
  creation of content types across multiple hubs, saving time and reducing risk.
- **Schema-Content Type Synchronization:** Ensures content types are properly
  created after schemas have been synchronized, with proper validation and
  repository assignments.
- **Deployment Bottlenecks:** Streamlines the promotion of content type changes
  through different stages of a project lifecycle.

## How it works

1. **Hub Selection:** The user selects a source hub and a target hub from
   configured hub connections.

2. **Optional Schema Synchronization:** The tool offers to run content type
   schema synchronization first to ensure all required schemas exist in the
   target hub.

3. **Content Type Discovery:** The tool fetches all ACTIVE content types from
   the source hub and compares them with content types in the target hub to
   identify missing ones.

4. **Content Type Selection:** The user is presented with a list of missing
   content types and can select which ones to synchronize (with a "Select All"
   option available).

5. **Schema Validation:** For selected content types, the tool validates that:
   - Required schemas exist in the target hub
   - Schemas are suitable for content type creation (have required properties
     like title, description, type=object, and extend core content type)

6. **Repository Mapping Strategy:** The user chooses between:
   - **Automatic mapping:** Finds target repositories with matching names to
     source repositories
   - **Manual mapping:** Allows individual selection of target repositories for
     each content type

7. **Sync Plan Generation:** The tool creates a detailed plan showing which
   content types will be created and which repositories they will be assigned
   to.

8. **Execution:** Upon confirmation, the tool:
   - Creates each content type in the target hub
   - Assigns the created content types to their mapped repositories
   - Provides detailed success/failure reporting for each operation
