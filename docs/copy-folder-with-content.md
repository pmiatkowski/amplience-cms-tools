# Functionality: Copy Folder with Content

This functionality is designed to duplicate a folder, including all of its
sub-folders and content items, from a source hub/repository to a destination
hub/repository. The source and destination can be different hubs, enabling
cross-hub content duplication and migration scenarios.

## Purpose

The primary purpose is to create an exact replica of a folder structure and its
contained assets in a new location across different Amplience hubs. This is
essential for tasks like setting up staging environments, migrating content
between environments, duplicating content for different campaigns, or
reorganizing content across different hubs without manual effort.

## Problems it solves

- **Manual Duplication Effort**: Eliminates the time-consuming and error-prone
  process of manually recreating folders and copying each content item one by
  one across different hubs.
- **Cross-Hub Content Migration**: Enables seamless content migration between
  different Amplience hubs (e.g., from development to staging, or staging to
  production).
- **Content Staging**: Simplifies the process of preparing content in a staging
  area before moving it to a live or production environment.
- **Inconsistent Structures**: Ensures that the duplicated folder structure and
  content are identical to the source, maintaining consistency across different
  hubs and repositories.
- **Bulk Operations**: Handles large-scale folder and content duplication that
  would be impractical to perform manually through the Amplience UI.

## How it works

The command follows a structured workflow with user prompts and progress
tracking:

### 1. Source Selection

- Prompts the user to select the source hub from available configured hubs
- Lists available repositories in the selected source hub
- Prompts for the specific source repository
- Displays available folders and prompts for the specific folder to copy

### 2. Target Selection

- Prompts the user to select the target hub (can be different from source)
- Lists available repositories in the selected target hub
- Prompts for the target repository where content will be copied
- Prompts for the parent folder in the target repository (or repository root)

### 3. Analysis and Confirmation

- Analyzes the source folder structure to count subfolders and content items
- Fetches all content items from the source folder and its subfolders
- Displays a comprehensive summary including:
  - Source and target locations
  - Number of subfolders to be created
  - Total number of content items to be copied
- Prompts for user confirmation before proceeding

### 4. Execution with Progress Tracking

- **Step 1**: Creates the main folder in the target location
- **Step 2**: Recursively recreates the entire subfolder structure with progress
  tracking
- **Step 3**: Recreates all content items with proper folder assignments and
  progress tracking
- Provides detailed feedback on success/failure rates and any errors encountered

The system maintains a folder mapping between source and target folder IDs to
ensure content items are placed in the correct corresponding folders in the
target location.
