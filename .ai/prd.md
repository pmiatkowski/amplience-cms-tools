# Product Requirements Document (PRD) - Amplience CLI Tool

## 1. Product Overview

This document specifies the requirements for a Node.js Command Line Interface
(CLI) tool designed to streamline and automate content management in the
Amplience CMS. The application will complement the existing Amplience user
interface by providing functionalities that are not currently available, with a
particular focus on bulk operations.

In its first version (MVP), the tool will focus on two main commands:

1.  Bulk updating the `deliveryKey` for a filtered group of `content-items`.
2.  Bulk cleaning of `content-items` within a repository, which includes
    un-archiving, clearing the `deliveryKey`, unpublishing, and re-archiving
    selected items.

Key product features include an interactive interface, advanced filtering
options, a secure `dryRun` mechanism that operates by default for modification
actions, and detailed reporting of every operation performed.

## 2. User Problem

Developers and content managers working with Amplience CMS often face the need
to perform bulk changes on hundreds or thousands of `content-items`. The
standard Amplience user interface does not offer efficient tools for this type
of operation, forcing teams to perform repetitive, time-consuming, and
error-prone manual tasks or create one-off scripts.

The main problems the application solves are:

1.  The lack of a global and safe way to update attributes, such as
    `deliveryKey`, for a large number of items simultaneously. This leads to a
    significant loss of productivity, especially during data migrations, content
    structure refactoring, or global changes in naming strategy.
2.  The complexity and manual effort required to "reset" or clean up content
    items in a repository. Tasks like un-archiving, removing delivery keys,
    unpublishing, and re-archiving items one-by-one are inefficient and prone to
    error, especially when preparing an environment or cleaning up test data.

## 3. Functional Requirements

- `FR-001`: Authentication: The application must support per-hub authentication.
  After the user selects a hub, the application must use the dedicated
  `client_id` and `client_secret` for that hub (stored in `.env` files) to
  generate an access token (Bearer). The token should be cached for the duration
  of the session or until it expires.
- `FR-002`: Multi-Hub Support: The system must allow configuration and work with
  multiple Amplience hubs. The list of available environments (e.g., DEV,
  PLAYGROUND) is defined in the `AMP_HUBS` variable in the `.env` file, and
  access data for each hub is stored in dedicated variables (e.g.,
  `AMP_DEV_CLIENT_ID`, `AMP_DEV_HUB_SECRET`).
- `FR-003`: Interactive CLI Interface: The user must be able to interactively
  select a hub, then a repository, and provide filtering criteria using
  selection menus and text fields.
- `FR-004`: Advanced Filtering: The application must allow filtering of
  `content-items` using a combination (logical "AND") of the following criteria:
  - Schema ID (supports full regular expressions).
  - Content status (`ACTIVE`, `ARCHIVED`, `DELETED`).
  - Publication status (`NONE`, `EARLY`, `LATEST`, `UNPUBLISHED`).
  - `deliveryKey` (supports full regular expressions, e.g., to find empty ones
    or those matching a pattern).
- `FR-005`: Bulk `deliveryKey` Update: The main function of the tool must be to
  bulk change a predefined `locale` prefix pattern (e.g., `en-US`, `pl-pl`) in
  the `deliveryKey` attribute to a new value provided by the user.
- `FR-006`: `dryRun` Mode: The default mode of operation for any data-modifying
  operation must be `dryRun`. In this mode, the application simulates changes
  and displays a preview of them without saving them in Amplience.
- `FR-007`: Execution Confirmation: After the `dryRun` is complete, the
  application must explicitly ask the user for consent to perform the actual
  changes ("LIVE EXECUTE?"), with a default negative answer.
- `FR-008`: Pagination and Caching: The application must automatically manage
  pagination when fetching data from the API to collect all matching items. The
  fetched data must be cached for the duration of a single session to avoid
  re-fetching it when moving from `dryRun` to "live" execution.
- `FR-009`: Reporting: After each operation (both `dryRun` and "live"), a
  detailed report in Markdown format must be generated. The reports will be
  saved in a dedicated `reports/` folder with a filename containing a timestamp.
- `FR-010`: Error Handling: API errors during the data fetching stage should
  terminate the application. Errors occurring during the update of individual
  items in bulk mode should not interrupt the entire process but must be
  precisely reported in the final file.
- `FR-011`: Performance Management: The application must allow configuration of
  the delay between consecutive API requests in the `.env` file to avoid
  exceeding rate limits.
- `FR-012`: Progress Indicators: Long-running operations, such as data fetching
  and updating, must be visualized with a progress bar.
- `FR-013`: Bulk Publishing: After a successful update operation, the
  application must offer the user the option to publish all successfully
  modified content items. This action requires explicit user confirmation.
- `FR-014`: Command Selection: On startup, the application must present the user
  with a choice of available commands to execute (e.g., "Update Delivery Keys
  Locale", "Clean Content Repository").
- `FR-015`: Content Item Cleanup: The application must provide a command to
  perform a multi-step cleanup process on selected content items. For each item,
  the process is:
  1. If the item's status is `ARCHIVED`, it must be un-archived.
  2. If the item has a `deliveryKey`, the `deliveryKey` must be cleared (set to
     an empty string).
  3. The item must be unpublished.
  4. The item must be archived.
- `FR-016`: Multi-Field Filtering for Cleanup: For the cleanup command, the
  application must support filtering by a single regular expression pattern that
  is tested against the item's `label`, `deliveryId`, and `deliveryKey`.
- `FR-017`: Interactive Item Selection: For the cleanup command, after filtering
  and displaying a preview table, the user must be presented with a multi-select
  list (checkboxes) of the filtered items. This list must include a "Select All"
  option.
- `FR-018`: Multi-Step Confirmation: For the cleanup command, after the user
  selects items for processing, they must be asked for a final, explicit
  confirmation before the cleanup operations begin.

## 4. Product Scope

The following functionalities are outside the scope of the MVP (Minimum Viable
Product) and will not be implemented in the first version of the product:

- Creating new `content-items`.
- Deleting `content-items`.
- Creating and managing folders in repositories.
- Modifying `content-item` attributes other than `deliveryKey` or status changes
  related to the cleanup command.

## 5. User Stories

### ID: US-001

- Title: Authentication to a selected hub
- Description: As a developer, after selecting a specific hub from the list, I
  want the application to automatically use its dedicated credentials from the
  `.env` file to obtain an access token, ensuring a secure and contextual
  connection to the API.
- Acceptance Criteria:
  1. After the user selects a hub, the application reads the corresponding
     variables from the `.env` file (e.g., `AMP_DEV_CLIENT_ID`,
     `AMP_DEV_HUB_SECRET`) based on the selected environment name.
  2. The application sends a request for an access token using the obtained
     credentials.
  3. The received token is stored and used in the `Authorization` header of all
     subsequent requests within the current session for that hub.
  4. If the token expires, the application automatically tries to obtain a new
     one.
  5. In case of authorization failure (e.g., incorrect data in `.env`), the
     application displays a clear error message and terminates.

### ID: US-002

- Title: Hub and repository selection
- Description: As a developer, after launching the application, I want to select
  a hub from an interactive list, and then a repository to work on, to ensure
  that all operations are performed in the correct context.
- Acceptance Criteria:
  1. Upon launch, the application reads the `AMP_HUBS` variable from the `.env`
     file and generates a list of available environments for selection.
  2. The user can select one hub using the keyboard.
  3. After successful authentication to the selected hub (according to US-001),
     the application fetches and displays a list of available repositories in
     it.
  4. The user can select one repository.
  5. The selected hub and repository are used in all subsequent operations.

### ID: US-003

- Title: Filtering content-items
- Description: As a developer, I want to define filtering criteria (schema ID,
  status, `deliveryKey`) to precisely select a group of `content-items` for an
  update.
- Acceptance Criteria:
  1. The application interactively prompts the user to provide filtering
     criteria.
  2. The user can provide a pattern (regexp) for `schemaId`.
  3. The user can select multiple statuses (`ACTIVE`, `ARCHIVED`) from a list.
  4. The user can provide a pattern (regexp) for `deliveryKey`.
  5. The application combines all provided criteria using the "AND" operator.
  6. A progress bar is shown while fetching data.

### ID: US-004

- Title: Previewing changes in `dryRun` mode
- Description: As a developer, I want the tool to default to `dryRun` mode and
  show me a preview of the planned changes, so I can verify the correctness of
  the operation before executing it.
- Acceptance Criteria:
  1. After filtering the items, the application simulates the `deliveryKey`
     change.
  2. A table with a preview of the changes is displayed in the console,
     containing at least the item `id`, the old `deliveryKey`, and the new
     `deliveryKey`.
  3. No data in Amplience is modified at this stage.
  4. The application displays a summary, e.g., "Found X items to change."

### ID: US-005

- Title: Confirmation and "live" execution of the operation
- Description: As a developer, after reviewing the `dryRun` preview, I want to
  be asked for explicit confirmation and then to provide the new `locale` prefix
  to run the actual data writing operation.
- Acceptance Criteria:
  1. After displaying the `dryRun` results, the application asks "Do you want to
     execute the changes live? (LIVE EXECUTE?)" with a default answer of "no".
  2. If the user answers affirmatively, the application prompts for the new
     `locale` prefix (e.g., `en-gb`).
  3. The application starts the update process, using the previously cached
     data.
  4. A progress bar is displayed during the update.
  5. If the user answers negatively, the application terminates without making
     any changes.

### ID: US-006

- Title: Generating an operation report
- Description: As a developer, I want a detailed report in Markdown format to be
  created in the `reports/` folder after each operation (both `dryRun` and
  "live"), so that I have a permanent record of the actions performed.
- Acceptance Criteria:
  1. After the operation is complete, a `.md` file is created in the `reports/`
     folder.
  2. The filename includes the date and time of the operation.
  3. The report includes a summary: filters used, number of successes, number of
     failures, total operation time.
  4. The report includes a detailed table with a list of all processed items,
     their `id`, old `deliveryKey`, new `deliveryKey`, and status (`SUCCESS` or
     `FAILED`).
  5. In case of an error, a report includes the error message returned by the
     API.

### ID: US-007

- Title: Handling errors for single items
- Description: As a developer, during a bulk update, I want an error on a single
  item not to interrupt the entire process, but to be recorded, and for the
  application to continue with the remaining items.
- Acceptance Criteria:
  1. If the API returns an error (e.g., 4xx, 5xx) while updating a single
     `content-item`, the loop is not interrupted.
  2. The error is caught.
  3. In the final report, the status for that item is marked as `FAILED`.
  4. In the final report, the comment column contains the error message from the
     API.
  5. The report summary correctly counts the number of failures.

### ID: US-008

- Title: Publish updated items
- Description: As a developer, after a successful bulk update, I want to be able
  to immediately publish all modified items, so that the changes are reflected
  live without requiring a separate manual action.
- Acceptance Criteria:
  1. After the "LIVE EXECUTE" update operation is complete, the application asks
     the user "Do you want to publish all successfully updated items?
     (PUBLISH?)" with a default answer of "no".
  2. If the user confirms, the application initiates a publish job for all items
     that were successfully updated in the previous step.
  3. A progress bar is displayed during the publishing process.
  4. The final report is updated to include the status of the publish operation
     for each item (e.g., `PUBLISH_SUCCESS` or `PUBLISH_FAILED`).
  5. If an error occurs during publishing an individual item, the process
     continues, and the error is logged in the report.
  6. If the user declines, the application finishes without publishing.

### ID: US-009

- Title: Select a command to run
- Description: As a developer, when I start the application, I want to be
  presented with a list of available commands so I can choose the specific bulk
  operation I need to perform.
- Acceptance Criteria:
  1. On startup, the application displays an interactive list of commands (e.g.,
     "Update Delivery Keys Locale", "Clean Content Repository").
  2. The user can select one command from the list.
  3. The application proceeds to the workflow specific to the selected command.

### ID: US-010

- Title: Filter items for cleanup
- Description: As a developer running the cleanup command, I want to filter
  content items by schema, status, and a general search term to quickly find the
  specific items I need to clean.
- Acceptance Criteria:
  1. After selecting the cleanup command and repository, the user is prompted
     for filters.
  2. The user can filter by schema ID (regexp) and content status (checkbox).
  3. The user can provide a single text/regexp pattern to search across the
     item's `label`, `deliveryId`, and `deliveryKey`.
  4. A preview table of filtered items is displayed in the console.

### ID: US-011

- Title: Select and confirm items for cleanup
- Description: As a developer, after filtering, I want to interactively select
  the specific items to be cleaned up from a list and give a final confirmation
  to prevent accidental data modification.
- Acceptance Criteria:
  1. After the preview table is shown, the user is prompted to continue.
  2. If continuing, the user is shown a multi-select list of all filtered items.
  3. Each item in the list is clearly identified (e.g., 'Item Label,
     a-delivery-id, a-delivery-key, ACTIVE, LATEST, schema-id').
  4. The list includes a "Select All" option that checks all items.
  5. After making a selection, the user is asked for a final confirmation before
     any changes are made.
  6. If the user does not confirm, the operation is cancelled.

### ID: US-012

- Title: Execute bulk cleanup on selected items
- Description: As a developer, once I confirm my selection, I want the tool to
  perform the cleanup operations on all chosen items and report on the outcome
  for each step.
- Acceptance Criteria:
  1. For each selected item, the application executes the cleanup sequence:
     un-archive (if needed), clear delivery key, unpublish, archive.
  2. A progress bar is displayed for the entire cleanup operation.
  3. Errors on a single item do not stop the process for other items.
  4. A final report is generated in Markdown, detailing the success or failure
     of each cleanup step (unarchive, clear key, unpublish, archive) for every
     processed item.
  5. The report summary includes totals for successfully cleaned items and
     failed items.

## 6. Success Metrics

- `SM-001`: Efficiency: The time required to update the `deliveryKey` for over
  1000 `content-items` must be reduced from potential hours of manual work to a
  few minutes using the tool. The time to clean 100 items should be similarly
  reduced.
- `SM-002`: Reliability: The success rate of bulk operations (ratio of successes
  to all attempts) must be > 99.9%.
- `SM-003`: Security: Zero accidental, unauthorized changes to production data,
  thanks to the mandatory `dryRun` mechanism and explicit user confirmation.
  Measured as a lack of reports of incorrect modifications caused by the tool.
- `SM-004`: Adoption: The tool is regularly used by at least one developer on
  the team for tasks related to bulk data updates within the first month of its
