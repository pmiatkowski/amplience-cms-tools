import { AmplienceService } from '../amplience-service';

/**
 * Tree node representing a folder with its children
 */
export type FolderTreeNode = {
  id: string;
  name: string;
  children: FolderTreeNode[];
  _links: Amplience.Folder['_links'];
};

/**
 * Gets all folders from a repository and builds parent-child relationships
 * @param service - The Amplience service instance
 * @param repositoryId - The content repository ID
 * @returns Promise with folders and parent-child mapping
 */
async function getAllRepositoryFoldersWithParents(
  service: AmplienceService,
  repositoryId: string
): Promise<FoldersWithParents> {
  const allFolders: Amplience.Folder[] = [];
  const parentChildMap = new Map<string, string[]>(); // parentId -> childIds[]

  // Get root level folders
  const rootFolders = await service.getAllFolders(repositoryId, () => {});
  allFolders.push(...rootFolders);

  // For each root folder, get all nested subfolders
  for (const rootFolder of rootFolders) {
    const { folders: subfolders, parentChildMap: subfoldersMap } =
      await getAllNestedSubfoldersWithParents(service, rootFolder.id);

    allFolders.push(...subfolders);

    // Add root folder as parent of its direct children if any subfolders exist
    if (subfolders.length > 0) {
      const directChildren = subfolders.filter(
        sf => !subfolders.some(other => subfoldersMap.get(other.id)?.includes(sf.id))
      );
      if (directChildren.length > 0) {
        parentChildMap.set(
          rootFolder.id,
          directChildren.map(child => child.id)
        );
      }
    }

    // Merge subfolder parent-child relationships
    for (const [parentId, childIds] of subfoldersMap.entries()) {
      parentChildMap.set(parentId, childIds);
    }
  }

  return { folders: allFolders, parentChildMap };
}

/**
 * Recursively gets all nested subfolders starting from a parent folder
 * @param service - The Amplience service instance
 * @param parentFolderId - The parent folder ID to start from
 * @returns Promise with folders and parent-child mapping
 */
async function getAllNestedSubfoldersWithParents(
  service: AmplienceService,
  parentFolderId: string
): Promise<FoldersWithParents> {
  const allFolders: Amplience.Folder[] = [];
  const parentChildMap = new Map<string, string[]>(); // parentId -> childIds[]
  const foldersToProcess: string[] = [parentFolderId];

  while (foldersToProcess.length > 0) {
    const currentFolderId = foldersToProcess.shift()!;

    try {
      // Get direct subfolders for current folder
      const subfolders = await service.getAllSubFolders(currentFolderId, () => {});

      if (subfolders.length > 0) {
        // Add subfolders to our collection
        allFolders.push(...subfolders);

        // Record parent-child relationship
        parentChildMap.set(
          currentFolderId,
          subfolders.map(folder => folder.id)
        );

        // Add subfolder IDs to processing queue for recursive traversal
        foldersToProcess.push(...subfolders.map(folder => folder.id));
      }
    } catch (error) {
      // Log error but continue processing other folders
      console.warn(`Failed to get subfolders for folder ${currentFolderId}:`, error);
    }
  }

  return { folders: allFolders, parentChildMap };
}

/**
 * Builds a hierarchical tree structure from folders and parent-child mapping
 * @param folders - Flat array of all folders
 * @param parentChildMap - Map of parent IDs to their child IDs
 * @param rootParentId - Optional root parent ID to filter top-level folders
 * @returns Hierarchical tree structure
 */
function buildFolderTree(
  folders: Amplience.Folder[],
  parentChildMap: Map<string, string[]>,
  rootParentId?: string
): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  // First pass: Create tree nodes for all folders
  folders.forEach(folder => {
    const treeNode: FolderTreeNode = {
      id: folder.id,
      name: folder.name,
      children: [],
      _links: folder._links,
    };
    folderMap.set(folder.id, treeNode);
  });

  // Second pass: Build the tree structure using parent-child mapping
  for (const [parentId, childIds] of parentChildMap.entries()) {
    const parentNode = folderMap.get(parentId);

    if (parentNode) {
      // Add children to parent node
      for (const childId of childIds) {
        const childNode = folderMap.get(childId);
        if (childNode) {
          parentNode.children.push(childNode);
        }
      }
    }

    // If this parent is our root parent, add its children as root folders
    if (parentId === rootParentId) {
      for (const childId of childIds) {
        const childNode = folderMap.get(childId);
        if (childNode) {
          rootFolders.push(childNode);
        }
      }
    }
  }

  // If no rootParentId specified, find folders that aren't children of any other folder
  if (!rootParentId) {
    const allChildIds = new Set<string>();
    for (const childIds of parentChildMap.values()) {
      childIds.forEach(id => allChildIds.add(id));
    }

    for (const folder of folders) {
      if (!allChildIds.has(folder.id)) {
        const node = folderMap.get(folder.id);
        if (node) {
          rootFolders.push(node);
        }
      }
    }
  }

  return rootFolders;
}

/**
 * Interface for folder collection with parent-child relationships
 */
type FoldersWithParents = {
  folders: Amplience.Folder[];
  parentChildMap: Map<string, string[]>;
};

/**
 * Lists all nested subfolders in a hierarchical structure
 * @param service - The Amplience service instance
 * @param repositoryId - The content repository ID
 * @param parentFolderId - Optional parent folder ID to start from (if not provided, lists from repository root)
 * @returns Promise with hierarchical folder structure
 */
export async function listNestedSubfolders(
  service: AmplienceService,
  repositoryId: string,
  parentFolderId?: string
): Promise<NestedSubfoldersResult> {
  const result: NestedSubfoldersResult = {
    raw: [],
    tree: [],
  };

  try {
    // Get all folders with their parent relationships tracked
    const { folders, parentChildMap } = parentFolderId
      ? await getAllNestedSubfoldersWithParents(service, parentFolderId)
      : await getAllRepositoryFoldersWithParents(service, repositoryId);

    result.raw = folders;
    result.tree = buildFolderTree(folders, parentChildMap, parentFolderId);
  } catch (error) {
    throw new Error(
      `Failed to list nested subfolders: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Result interface for nested subfolders operation
 */
export type NestedSubfoldersResult = {
  /** Flat array of all folders and subfolders */
  raw: Amplience.Folder[];
  /** Hierarchical tree structure of folders */
  tree: FolderTreeNode[];
};
