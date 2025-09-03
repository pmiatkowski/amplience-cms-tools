import inquirer from 'inquirer';
import { FolderTreeNode } from '~/services/actions/list-nested-subfolders';

/**
 * Create hierarchical folder choices for inquirer prompt
 */
export function createHierarchicalFolderChoices(
  tree: FolderTreeNode[]
): Array<{ name: string; value: string }> {
  const choices: Array<{ name: string; value: string }> = [];

  // Add Repository Root option at the top
  choices.push({ name: '🏠 Repository Root (show all folders)', value: 'ROOT' });

  if (tree.length > 0) {
    // Add hierarchical folder choices
    addTreeNodesToChoices(tree, choices, 0);
  }

  return choices;
}


export async function promptForSelectedFolder(
  folderChoices: Array<{ name: string; value: string }>
): Promise<string> {
  const { selectedFolder } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFolder',
      message: 'Select a parent folder to start from:',
      choices: folderChoices,
      pageSize: 15, // Show more options at once
    },
  ]);

  return selectedFolder;
}

/**
 * Recursively add tree nodes to choices with proper indentation
 */
function addTreeNodesToChoices(
  nodes: FolderTreeNode[],
  choices: Array<{ name: string; value: string }>,
  depth: number
): void {
  nodes.forEach(node => {
    const indent = '  '.repeat(depth);
    const folderIcon = node.children.length > 0 ? '📁' : '📄';
    const childCount = node.children.length > 0 ? ` (${node.children.length} subfolders)` : '';

    choices.push({
      name: `${indent}${folderIcon} ${node.name}${childCount}`,
      value: node.id,
    });

    // Recursively add children
    if (node.children.length > 0) {
      addTreeNodesToChoices(node.children, choices, depth + 1);
    }
  });
}
