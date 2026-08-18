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

### 3. Analysis and Preflight

- Analyzes the source folder structure to count subfolders and content items
- Fetches all content items from the source folder and its subfolders
- Discovers hierarchy descendants and content references recursively
- Matches references that already exist in the target hub
- Validates that every content type needed for selected, hierarchy, and
  unmatched referenced items is assigned to the target repository
- Checks every creation candidate for delivery keys already owned anywhere in
  the target hub

If assignments are missing, the command prints each content type URI, its
affected-item count, and a sub-list of item labels and IDs. Items without schema
metadata and failures to load repository assignments are reported separately.
The operation stops before confirmation, so no target folder, subfolder, or
content item is created. Incomplete source folder enumeration, subfolder content
loading, selected-item details, or hierarchy descendant loading also stops the
operation before target mutation.

Delivery-key validation starts with Amplience's official
`GET /hubs/{hubId}/delivery-keys/content-item` lookup, which quickly identifies
existing owners. If any candidate owner is unresolved directly, the command
performs one complete fallback inventory. It paginates all target-hub
repositories returned to the configured credential, then fetches full-body
`ACTIVE` and `ARCHIVED` items separately from every repository and compares
their delivery keys.

The inventory is fail-closed. Failure to list or paginate repositories, or to
fetch any repository's `ACTIVE` or `ARCHIVED` pages, blocks before confirmation,
folder creation, or content mutation. The error identifies the failed stage and
repository when available; partial inventory is not treated as success. The
inventory covers all repositories returned to the configured credential, not
repositories hidden from it by API ACLs.

Delivery keys are unique across the target hub, not just within the selected
repository or target folder. Duplicate source keys and owners found by either
stage block the operation. The output lists each key, its source items, and the
existing owner's label, ID, and repository. This catches content left by an
earlier partial run before a retry creates folders or items; existing owners are
not overwritten, deleted, or silently reused.

During fallback, progress is reported once per repository after its `ACTIVE` and
`ARCHIVED` scans finish. A completed validation reports one final delivery-key
completion; it does not print one console line per key.

Reference discovery is strict by default. A discovery failure blocks the
operation because the required content-type list may be incomplete. Set
`contentTypeValidation.abortOnReferenceDiscoveryFailure` to `false` in
`src/config.ts` to validate only known folder and hierarchy items, warn, and
continue with unresolved references nullified. Known validation failures always
block execution. Target matching and dependency-planning failures are not
discovery failures and cannot be bypassed by this setting.

### 4. Confirmation

- Displays a comprehensive summary including:
  - Source and target locations
  - Number of subfolders to be created
  - Folder and hierarchy item count
  - Recursively referenced item count
  - Total number of content items that may be created
- Prompts for user confirmation before proceeding

### 5. Execution with Progress Tracking

- **Step 1**: Creates the main folder in the target location
- **Step 2**: Recursively recreates the entire subfolder structure with progress
  tracking
- **Step 3**: Recreates all content items with proper folder assignments and
  progress tracking
- Creates folder, hierarchy, and recursively referenced items in reference
  dependency order, including references between items selected in the folder
- Adds each successful creation to the source-to-target ID map before preparing
  the next item, so content links use target-hub IDs
- Preserves hierarchy-root metadata during creation while deferring child-parent
  relationships until target IDs are available
- Keeps delivery keys applied by content creation; when a fallback assignment is
  required, it uses the created item's current version
- Repairs publication state for matched referenced items left incomplete by a
  prior partial run
- Stops dependent item creation when a required referenced item fails, avoiding
  follow-on schema errors caused by null required references
- Stops before content recreation if any target subfolder cannot be created, so
  items are not silently placed in the repository root
- Provides detailed feedback on success/failure rates for folder, hierarchy, and
  recursively referenced items
- Uses actual recreation results in the completion message and does not claim a
  successful folder copy when any content item creation failed
- Reports publication failures separately and does not claim a successful copy
  when recreated content could not be published as required

The system maintains a folder mapping between source and target folder IDs to
ensure content items are placed in the correct corresponding folders in the
target location.
