# Functionality: List Folder Tree

Visualizes the folder structure of a repository. It can start from the root or a
selected folder and output the hierarchy in multiple formats, helping users
understand the repository's organization.

## Purpose

The primary purpose is to provide users with a clear, hierarchical
representation of the folder structure within a specified Amplience repository.
This helps in navigating and understanding the organization of content, which is
not easily visible in the Amplience UI.

## Problems it solves

- **Lack of Overview:** The standard Amplience interface does not offer a simple
  way to view the entire folder hierarchy at a glance, making it difficult to
  understand the content architecture.
- **Manual Documentation:** It eliminates the need for manually documenting or
  diagramming the folder structure for planning, auditing, or migration
  purposes.
- **Onboarding and Discovery:** It helps new team members quickly grasp how
  content is organized within a repository.

## Output Formats

The tool provides four different visualization options:

- **Tree visualization:** ASCII art representation showing the hierarchical
  structure with visual indentation and connecting lines
- **Table format:** Tabular display showing folder ID, name, and whether it
  contains subfolders
- **Raw JSON output:** Complete structured data for programmatic use or further
  processing
- **All formats:** Displays all three formats above in sequence

## Summary Statistics

After displaying the folder structure, the tool provides useful analytics:

- Total number of folders found
- Count of root-level folders
- Maximum nesting depth of the folder structure
- Number of folders that contain subfolders

## How it works

- The user initiates the command by selecting "List folder tree structure" from
  the main menu.
- It prompts the user to select the Amplience hub and repository they wish to
  inspect.
- It asks the user whether to display the tree from the repository root or from
  a specific parent folder.
- If a specific folder is chosen, it fetches the complete folder structure and
  presents a hierarchical list of available folders for selection (including a
  "ROOT" option to return to repository root).
- It prompts the user to choose an output format (tree, table, raw JSON, or all
  formats).
- After confirmation, the tool fetches the folder data from the Amplience API
  using recursive calls to build the complete folder hierarchy.
- It processes the data to build a hierarchical tree structure with parent-child
  relationships.
- Finally, it displays the formatted output according to the user's selected
  format, along with summary statistics about the folder structure.
