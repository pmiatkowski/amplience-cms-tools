# Functionality: Cleanup Folder

This functionality provides a comprehensive method for cleaning up and
organizing content within a specific folder or entire repository in the
Amplience CMS. It moves all content items to a designated deleted folder,
archives them, and removes empty folder structures in a systematic way.

## Purpose

The primary purpose is to automate the complete cleanup process of a selected
folder or repository root. It provides a structured approach to content
lifecycle management by moving content to a designated deleted area, archiving
it properly, and cleaning up the folder structure afterward.

## Problems it solves

- **Complex Multi-Step Cleanup Process**: It automates the typically manual and
  error-prone process of moving content items, handling their publication
  states, archiving them, and cleaning up folder structures.
- **Content Lifecycle Management**: It provides a systematic way to retire
  entire folders or repository sections while preserving content in an archived
  state within a designated deleted folder.
- **Folder Structure Maintenance**: It automatically removes empty folder
  hierarchies after content has been moved, maintaining a clean repository
  structure.

## How it works

- The user selects the "Cleanup Folder" command.
- The system prompts the user to choose the target Hub, Repository, and the
  specific Folder to be cleaned (or repository root for full repository
  cleanup).
- The user configures cleanup options including:
  - **Deleted Folder Name**: Name for the folder where items will be moved
    (default: "\_\_deleted")
  - **Clear Delivery Keys**: Whether to clear delivery keys before archiving
  - **Unpublish Items**: Whether to unpublish published items before archiving
  - **Unarchive Items**: Whether to temporarily unarchive already archived items
    for processing
- After reviewing the configuration and providing final confirmation, the system
  executes a comprehensive cleanup process:
  1. **Content Discovery**: Identifies all content items in the target folder
     and its subfolders
  2. **Content Relocation**: Moves all content items to the designated deleted
     folder, removing any hierarchy relationships
  3. **Content Archiving**: Archives all moved content items, handling
     publication states as configured
  4. **Folder Cleanup**: Deletes empty folders in reverse order (deepest first)
     to maintain referential integrity
- The operation provides detailed feedback showing the success/failure status of
  each step and generates comprehensive results including processed items and
  any errors encountered.
