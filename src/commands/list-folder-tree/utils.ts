import { FolderTreeNode } from '~/services/actions/list-nested-subfolders';


/**
 * Calculate maximum depth of the tree
 */
export function calculateMaxDepth(nodes: FolderTreeNode[]): number {
  if (nodes.length === 0) {
    return 0;
  }

  let maxDepth = 1;

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = 1 + calculateMaxDepth(node.children);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  }

  return maxDepth;
}




/**
 * Count folders that have children
 */
export function countFoldersWithChildren(node: FolderTreeNode): number {
  let count = 0;

  if (node.children && node.children.length > 0) {
    count = 1;
    for (const child of node.children) {
      count += countFoldersWithChildren(child);
    }
  }

  return count;
}




/**
 * Display folder tree with ASCII art indentation
 */
export function displayFolderTree(nodes: FolderTreeNode[], depth: number = 0): void {
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const prefix = '  '.repeat(depth) + (isLast ? '└── ' : '├── ');

    console.log(`${prefix}${node.name} (${node.id})`);

    if (node.children && node.children.length > 0) {
      displayFolderTree(node.children, depth + 1);
    }
  });
}


/**
 * Find a node by ID in the tree
 */
export function findNodeById(node: FolderTreeNode, id: string): FolderTreeNode | null {
  if (node.id === id) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}
