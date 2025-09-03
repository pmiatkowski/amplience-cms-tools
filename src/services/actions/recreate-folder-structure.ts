import { AmplienceService } from '../amplience-service';
import { FolderTreeNode } from './list-nested-subfolders';


/**
 * Interface for folder creation errors
 */
export type FolderCreationError = {
  folderName: string;
  error: string;
}

/**
 * Recursively creates folders in the target location
 */
async function recreateFoldersRecursively(
  targetService: AmplienceService,
  targetRepositoryId: string,
  targetParentFolderId: string | null,
  folderNodes: FolderTreeNode[],
  result: RecreateStructureResult,
  onFolderCreated: (name: string, success: boolean, error?: string) => void
): Promise<void> {
  for (const node of folderNodes) {
    try {
      // Create the current folder
      const createResult = targetParentFolderId
        ? await targetService.createSubFolder(targetParentFolderId, node.name)
        : await targetService.createFolder(targetRepositoryId, node.name);

      if (createResult.success && createResult.updatedItem) {
        result.createdFolders++;
        onFolderCreated(node.name, true);

        // Store the mapping of source folder ID → target folder ID
        result.folderMapping.set(node.id, createResult.updatedItem.id);

        // Recursively create children
        if (node.children && node.children.length > 0) {
          await recreateFoldersRecursively(
            targetService,
            targetRepositoryId,
            createResult.updatedItem.id,
            node.children,
            result,
            onFolderCreated
          );
        }
      } else {
        result.failedFolders++;
        const errorMessage = createResult.error || 'Unknown error creating folder';
        result.errors.push({
          folderName: node.name,
          error: errorMessage,
        });
        onFolderCreated(node.name, false, errorMessage);
      }
    } catch (error) {
      result.failedFolders++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push({
        folderName: node.name,
        error: errorMessage,
      });
      onFolderCreated(node.name, false, errorMessage);
    }
  }
}

/**
 * Counts the total number of folders in a folder tree
 */
function countTotalFolders(folderNodes: FolderTreeNode[]): number {
  let count = 0;
  for (const node of folderNodes) {
    count++; // Count current folder
    if (node.children && node.children.length > 0) {
      count += countTotalFolders(node.children); // Count children recursively
    }
  }

  return count;
}



/**
 * Recreates a folder structure in a target location based on a source folder tree
 * @param targetService - The Amplience service instance for the target hub
 * @param targetRepositoryId - The target repository ID
 * @param targetParentFolderId - The target parent folder ID (null for repository root)
 * @param sourceFolderTree - The source folder tree structure to recreate
 * @param onFolderCreated - Callback function called after each folder is created
 * @returns Promise with the result of the recreation operation
 */
export async function recreateFolderStructure(
  targetService: AmplienceService,
  targetRepositoryId: string,
  targetParentFolderId: string | null,
  sourceFolderTree: FolderTreeNode[],
  onFolderCreated: (name: string, success: boolean, error?: string) => void
): Promise<RecreateStructureResult> {
  const result: RecreateStructureResult = {
    totalFolders: 0,
    createdFolders: 0,
    failedFolders: 0,
    errors: [],
    folderMapping: new Map<string, string>(), // Map source folder ID → target folder ID
  };

  // Count total folders to create
  result.totalFolders = countTotalFolders(sourceFolderTree);

  try {
    // Start recursive creation from the root level
    await recreateFoldersRecursively(
      targetService,
      targetRepositoryId,
      targetParentFolderId,
      sourceFolderTree,
      result,
      onFolderCreated
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push({
      folderName: 'Root level',
      error: errorMessage,
    });
  }

  return result;
}


/**
 * Result interface for the recreate folder structure operation
 */
export type RecreateStructureResult = {
  totalFolders: number;
  createdFolders: number;
  failedFolders: number;
  errors: FolderCreationError[];
  folderMapping: Map<string, string>; // Map source folder ID → target folder ID
}
