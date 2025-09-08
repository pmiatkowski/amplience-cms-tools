// Utility functions for working with folder tree structures

/**
 * Count total number of folders in a folder tree structure
 */
export function countTotalFolders(folderTree: FolderTreeNode[]): number {
  let count = 0;

  function countRecursively(nodes: FolderTreeNode[]): void {
    for (const node of nodes) {
      count++;
      if (node.children && node.children.length > 0) {
        countRecursively(node.children);
      }
    }
  }

  countRecursively(folderTree);

  return count;
}

/**
 * Find all descendants of a hierarchy root item by traversing the hierarchy tree
 */
export function findAllDescendants(rootId: string, allItems: Amplience.ContentItem[]): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>();

  function findChildren(parentId: string): void {
    if (visited.has(parentId)) return; // Prevent infinite loops
    visited.add(parentId);

    for (const item of allItems) {
      if (item.hierarchy?.parentId === parentId) {
        descendants.push(item.id);
        findChildren(item.id); // Recursively find children of this child
      }
    }
  }

  findChildren(rootId);

  return descendants;
}

export type FolderTreeNode = {
  children?: FolderTreeNode[];
  id: string;
  name: string;
};

/**
 * Get all subfolder IDs from a folder tree structure
 */
export function getAllSubfolderIds(folderTree: FolderTreeNode[]): string[] {
  const ids: string[] = [];

  function collectIds(nodes: FolderTreeNode[]): void {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        collectIds(node.children);
      }
    }
  }

  collectIds(folderTree);

  return ids;
}
