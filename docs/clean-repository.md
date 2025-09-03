# Functionality: Clean Repository

This functionality provides a powerful and automated way to perform a
comprehensive cleanup of a specified content repository within the Amplience
CMS. It is designed to handle bulk archival of content items, including complex
hierarchical structures, while preserving the items in an organized manner.

## Purpose

The primary purpose of this functionality is to maintain the health,
organization, and performance of an Amplience repository by archiving obsolete,
temporary, or unwanted content in bulk. It automates a task that would be
exceedingly time-consuming and error-prone if performed manually through the
user interface.

## Problems it solves

- **Repository Clutter:** Over time, repositories can become filled with
  outdated, test, or irrelevant content, making it difficult for users to find
  what they need and potentially slowing down system performance. This tool
  provides an efficient way to organize this content by moving it to a dedicated
  cleanup area.
- **Inefficient Manual Cleanup:** Cleaning up a large number of content items,
  especially those linked in a parent-child hierarchy, is a tedious and slow
  process via the standard UI. This functionality automates the entire
  operation.
- **Complex Hierarchy Management:** The Amplience UI does not provide a simple
  way to clean up a parent item and all its descendants in a single action. This
  tool specifically addresses that gap by allowing users to include entire
  content trees in the cleanup operation.

## How it works

- The user initiates the `Clean Repository` command from the main menu.
- They are prompted to select the target hub and the specific repository to be
  cleaned.
- The user can apply various filters to target specific content items based on:
  - Schema ID (with regex support)
  - Content status (ACTIVE, INACTIVE, ARCHIVED)
  - Publishing status (LATEST, NONE, EARLY, DRAFT, SCHEDULED)
- The user is then asked to confirm whether the cleanup should include
  hierarchical descendants of the items targeted for cleanup.
- The system displays a preview table showing all items that match the filter
  criteria, allowing the user to review before proceeding.
- The user can then interactively select which specific items to clean from the
  filtered list.
- Upon final confirmation, the tool proceeds to clean the selected content items
  according to the defined scope.
- The cleanup process for each item follows these steps:
  1. **Unarchive if needed:** If the item is already archived, it gets
     unarchived first
  2. **Move to \_\_deleted folder:** Items are moved to a special `__deleted`
     folder for organization
  3. **Clear delivery key:** The delivery key is removed from the content
  4. **Unpublish if needed:** Published items are unpublished
  5. **Archive:** Finally, the item is archived
- A comprehensive report is generated showing the success/failure status of each
  step for every processed item.
