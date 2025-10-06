import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils';
import { findAllDescendants, getAllSubfolderIds, type FolderTreeNode } from '~/utils';

/**
 * Analyze hierarchy structure and discover all descendant items
 * @param service The Amplience service instance
 * @param repositoryId The repository ID
 * @param selectedItems Initially selected items
 * @returns Promise resolving to all items to process (including hierarchy children)
 */
export async function analyzeHierarchyStructure(
  service: AmplienceService,
  repositoryId: string,
  selectedItems: Amplience.ContentItem[]
): Promise<{
  allItemsToProcess: string[];
  hierarchyChildrenFound: number;
  hierarchyRootItems: Amplience.ContentItemWithDetails[];
}> {
  console.log('\n🌳 Analyzing hierarchy structure and discovering children...');

  // Get detailed information for all selected items
  const selectedItemsDetails: Amplience.ContentItemWithDetails[] = [];
  for (const item of selectedItems) {
    const details = await service.getContentItemWithDetails(item.id);
    if (details) {
      selectedItemsDetails.push(details);
    }
  }

  // Check if any selected items are hierarchy roots
  const hierarchyRootItems = selectedItemsDetails.filter(item => item.hierarchy?.root);

  let allItemsToProcess = selectedItems.map(item => item.id);
  let hierarchyChildrenFound = 0;

  if (hierarchyRootItems.length > 0) {
    console.log(
      `  🌲 Found ${hierarchyRootItems.length} hierarchy root items, discovering all children...`
    );

    // Fetch ALL content items from the repository to find hierarchy relationships
    console.log(`  📦 Fetching all repository items to analyze hierarchy relationships...`);
    const allRepositoryItems = await service.getAllContentItems(
      repositoryId,
      (fetched, total) => console.log(`    📊 Loading items: ${fetched}/${total} processed`),
      { size: 100 }
    );

    console.log(`  ✓ Loaded ${allRepositoryItems.length} items from repository`);

    // For each hierarchy root, find ALL its descendants in the repository
    const allDescendants = new Set<string>();

    for (const rootItem of hierarchyRootItems) {
      console.log(
        `  🔍 Finding descendants for hierarchy root: ${rootItem.label} (${rootItem.id})`
      );

      // Find all items that have this root as an ancestor
      const descendants = findAllDescendants(rootItem.id, allRepositoryItems);
      descendants.forEach(descendantId => allDescendants.add(descendantId));

      console.log(`    ✓ Found ${descendants.length} descendants`);
    }

    // Add all discovered descendants to the processing list
    const descendantsArray = Array.from(allDescendants);
    allItemsToProcess = [...new Set([...allItemsToProcess, ...descendantsArray])];
    hierarchyChildrenFound = descendantsArray.length;

    console.log(`  📊 Total hierarchy children discovered: ${hierarchyChildrenFound}`);
  }

  console.log(`📊 Processing Summary:`);
  console.log(`  • Originally selected: ${selectedItems.length} items`);
  console.log(`  • Hierarchy roots: ${hierarchyRootItems.length}`);
  console.log(`  • Hierarchy children: ${hierarchyChildrenFound}`);
  console.log(`  • Total items to recreate: ${allItemsToProcess.length}`);

  if (hierarchyChildrenFound > 0) {
    console.log(
      `\n💡 Hierarchy children detected! ${hierarchyChildrenFound} additional items will be included automatically.`
    );
  }

  return {
    allItemsToProcess,
    hierarchyChildrenFound,
    hierarchyRootItems,
  };
}

export type ContentFetchResult = {
  allContentItemsWithFolders: ContentItemWithFolder[];
  totalItems: number;
};

export type ContentItemWithFolder = {
  item: Amplience.ContentItem;
  sourceFolderId: string;
};

/**
 * Fetch content items from a folder and all its subfolders
 * @param service The Amplience service instance
 * @param repositoryId The repository ID
 * @param folderId The main folder ID (null for repository root)
 * @param folderStructure Optional folder structure for subfolders
 * @returns Promise resolving to content items with their folder mappings
 */
export async function fetchContentItemsFromFolders(
  service: AmplienceService,
  repositoryId: string,
  folderId: string | null,
  folderStructure?: FolderTreeNode[]
): Promise<ContentFetchResult> {
  const allContentItemsWithFolders: ContentItemWithFolder[] = [];

  // Get items from the main folder (or repository root)
  const progressBar = createProgressBar(1, 'Fetching content items');

  const mainFolderItems = await service.getAllContentItems(
    repositoryId,
    (fetched, total) => {
      if (total > 0) {
        progressBar.setTotal(total);
        progressBar.update(fetched);
      }
    },
    folderId ? { folderId } : undefined
  );

  progressBar.stop();

  // Add main folder items with their source folder ID
  mainFolderItems.forEach(item => {
    allContentItemsWithFolders.push({
      item,
      sourceFolderId: folderId || '',
    });
  });

  // Get items from all subfolders if folder structure is provided
  if (folderStructure && folderStructure.length > 0) {
    const allSubfolderIds = getAllSubfolderIds(folderStructure);

    if (allSubfolderIds.length > 0) {
      console.log(`📄 Fetching content items from ${allSubfolderIds.length} subfolders...`);
      const subfolderProgressBar = createProgressBar(
        allSubfolderIds.length,
        'Processing subfolders'
      );

      for (let i = 0; i < allSubfolderIds.length; i++) {
        const subfolderId = allSubfolderIds[i];
        try {
          const subfolderItems = await service.getAllContentItems(
            repositoryId,
            () => {}, // no-op callback for individual folder progress
            { folderId: subfolderId }
          );

          // Add subfolder items with their source folder ID
          subfolderItems.forEach(item => {
            allContentItemsWithFolders.push({
              item,
              sourceFolderId: subfolderId,
            });
          });
        } catch (error) {
          console.warn(`⚠️  Failed to fetch items from subfolder ${subfolderId}:`, error);
        }
        subfolderProgressBar.update(i + 1);
      }

      subfolderProgressBar.stop();
    }
  }

  console.log(`✓ Found ${allContentItemsWithFolders.length} content items total`);

  return {
    allContentItemsWithFolders,
    totalItems: allContentItemsWithFolders.length,
  };
}

/**
 * Sorts content items to ensure parents are processed before their children.
 * This is crucial for hierarchy recreation where parent items must exist
 * before their children can be created with proper parentId references.
 *
 * @param items - Array of content items to sort
 * @returns Sorted array with parents before children
 */
export function sortContentForRecreation(items: Amplience.ContentItem[]): Amplience.ContentItem[] {
  const sorted: Amplience.ContentItem[] = [];
  const processed = new Set<string>();
  const itemMap = new Map<string, Amplience.ContentItem>();

  // Build a map for quick lookup
  items.forEach(item => {
    if (item.id) {
      itemMap.set(item.id, item);
    }
  });

  /**
   * Recursively processes an item and its ancestors first
   */
  const processItem = (item: Amplience.ContentItem): void => {
    // Skip if already processed
    if (processed.has(item.id)) {
      return;
    }

    // If item has a parent, process parent first
    if (item.hierarchy?.parentId) {
      const parentId = item.hierarchy.parentId;
      const parent = itemMap.get(parentId);

      if (parent && !processed.has(parentId)) {
        processItem(parent);
      }
    }

    // Add current item to sorted list
    sorted.push(item);
    processed.add(item.id);
  };

  // Process all items
  items.forEach(item => {
    processItem(item);
  });

  console.log(`  ✓ Sorted ${sorted.length} items for recreation (parents before children)`);

  return sorted;
}
