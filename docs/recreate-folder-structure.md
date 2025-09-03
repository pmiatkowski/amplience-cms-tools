# Functionality: Recreate Folder Structure

This functionality is designed to replicate a folder hierarchy from a specific
source folder to a target location within Amplience. It exclusively copies the
folder structure, intentionally omitting any content items contained within
those folders.

## Purpose

The primary purpose is to automate the setup of a predefined folder structure in
a new or existing Amplience repository. This is essential for maintaining
consistency across different environments, such as development, testing, and
production, without the need for manual folder creation.

## Problems it solves

- **Manual Effort and Inconsistency**: Eliminates the time-consuming and
  error-prone task of manually creating complex folder hierarchies through the
  user interface.
- **Environment Setup**: Streamlines the process of preparing new repositories
  or hubs, ensuring they adhere to a standardized organizational structure from
  the outset.
- **Structural Integrity**: Guarantees that the folder structure from a specific
  source folder is an exact replica in the target location, which is crucial for
  workflows and integrations that depend on specific folder paths.

## How it works

- The user is prompted to select the source hub and repository from which to
  copy the structure.
- The user selects a specific source folder (not the entire repository) to copy
  its subfolder structure.
- The user then selects the target hub and repository where the structure will
  be created.
- The user can optionally select a target parent folder, or create the structure
  at the repository root.
- The tool analyzes the source folder's nested subfolder structure and displays
  a preview of what will be created.
- After user confirmation, it systematically recreates the subfolder hierarchy
  in the target location, preserving all parent-child relationships.
- The operation provides real-time progress feedback and detailed results
  including success/failure counts and error details.
- Throughout the process, content items are ignored, ensuring only the empty
  folder structure is duplicated.
