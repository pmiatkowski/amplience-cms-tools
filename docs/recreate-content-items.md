# Functionality: Recreate Content Items

This functionality facilitates the recreation of content items across different
hubs, repositories, and folders within the Amplience CMS. It provides
comprehensive filtering capabilities, automatic hierarchy handling, and flexible
locale management for migrating or duplicating specific content across
environments.

## Purpose

The primary purpose is to enable the migration, duplication, or restoration of
specific content items from one Amplience location (hub/repository/folder) to
another. It provides a controlled way to move content with full hierarchy
preservation without manually recreating each item.

## Problems it solves

- **Manual Content Migration:** Eliminates the time-consuming and error-prone
  process of manually copying and pasting content between different hubs,
  repositories, or folders (e.g., from a development environment to a production
  environment).
- **Lack of Bulk Duplication:** Addresses the absence of a native bulk
  duplication feature for specific, filtered sets of content items within the
  Amplience UI.
- **Content Seeding:** Simplifies the process of seeding a new environment with
  a subset of existing content for testing or development purposes.
- **Localization Setup:** Facilitates the creation of content in new locales by
  copying it from an existing locale and assigning a new target locale.
- **Hierarchy Management:** Automatically handles complex content hierarchies by
  including all descendant items and maintaining proper parent-child
  relationships.
- **Cross-Environment Content Sync:** Enables content synchronization between
  different Amplience hubs and repositories while preserving folder structure.

## How it works

The recreation process follows a comprehensive step-by-step workflow:

### 1. Source Selection

- Select the source hub from available configurations
- Choose the source repository within the selected hub
- Select a specific folder or use the repository root as the source location

### 2. Content Filtering and Selection

- Apply detailed filters to narrow down content items:
  - **Schema ID filter:** Target specific content types
  - **Status filter:** Include active, archived, or both
  - **Publishing status filter:** Filter by publication state (none, early,
    latest, unpublished)
  - **Delivery key pattern:** Match specific delivery key patterns
  - **Root hierarchy only:** Include only top-level hierarchy items (descendants
    are automatically included)
- Review filtered results and manually select specific items to recreate
- Option to select all filtered items at once

### 3. Target Location Selection

- Select the target hub (can be the same or different from source)
- Choose the target repository within the selected hub
- Optionally select a target folder or use the repository root

### 4. Locale Configuration

- Choose from available locale options:
  - Keep source locale(s) unchanged
  - Select a specific target locale from available repository locales
  - Set no locale for recreated items

### 5. Hierarchy Processing

- Automatically discovers and includes all hierarchy descendants for selected
  root items
- Maintains proper processing order to ensure parent items are created before
  children
- Preserves hierarchy relationships in the target location

### 6. Execution and Verification

- Displays a comprehensive recreation summary before execution
- Processes items with progress tracking
- Handles folder mapping between source and target locations
- Provides detailed success/failure reporting

The system intelligently handles complex scenarios including cross-hub
migration, folder structure preservation, and automatic hierarchy descendant
inclusion to ensure complete and accurate content recreation.
