import { getHubConfigs } from '~/app-config';
import {
  listNestedSubfolders,
  type FolderTreeNode,
} from '~/services/actions/list-nested-subfolders';
import { recreateContentItems } from '~/services/actions/recreate-content-items';
import { recreateFolderStructure } from '~/services/actions/recreate-folder-structure';
import { countTotalFolders, createProgressBar, getAllSubfolderIds } from '~/utils';
import {
  analyzeHierarchyStructure,
  confirmOperation,
  createFolderMapping,
  selectSourceLocation,
  selectTargetLocation,
  sortContentForRecreation,
  type OperationSummary,
} from '../shared';

/**
 * Main command function to copy a folder and its content items between hubs
 */
export async function runCopyFolderWithContent(): Promise<void> {
  console.log('\n📁➡️📁 Copy Folder with Content');
  console.log(
    'This command will copy a folder hierarchy and all its content items from source to target hub.\n'
  );

  try {
    // Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('No hub configurations found. Please check your .env file.');

      return;
    }

    // === SOURCE SELECTION ===
    const source = await selectSourceLocation(
      hubConfigs,
      'Select source folder to copy:',
      false // Don't allow none - we need a specific folder to copy
    );

    if (!source.folder) {
      console.log('❌ No folder selected. Operation cancelled.');

      return;
    }

    // === TARGET SELECTION ===
    const target = await selectTargetLocation(
      hubConfigs,
      'Select target parent folder (where to place the copied folder):',
      true // Allow none - can be placed at repository root
    );

    // === ANALYSIS ===
    console.log('\n🔍 Analyzing source folder structure and content...');

    // Get the folder structure
    let folderStructure: FolderTreeNode[];
    try {
      const folderResult = await listNestedSubfolders(
        source.service,
        source.repository.id,
        source.folder.id
      );
      folderStructure = folderResult.tree;
      console.log(`✓ Found folder structure with ${countTotalFolders(folderStructure)} subfolders`);
    } catch (error) {
      console.error('❌ Failed to analyze folder structure:', error);

      return;
    }

    // Get all content items in the source folder and its subfolders
    const allContentItemsWithFolders: Array<{
      item: Amplience.ContentItem;
      sourceFolderId: string;
    }> = [];
    try {
      const progressBar = createProgressBar(1, 'Fetching content items');

      // Get items from the main folder
      const mainFolderItems = await source.service.getAllContentItems(
        source.repository.id,
        (fetched: number, total: number) => {
          if (total > 0) {
            progressBar.setTotal(total);
            progressBar.update(fetched);
          }
        },
        { folderId: source.folder.id }
      );

      progressBar.stop();

      // Add main folder items with their source folder ID
      mainFolderItems.forEach((item: Amplience.ContentItem) => {
        allContentItemsWithFolders.push({ item, sourceFolderId: source.folder!.id });
      });

      // Get items from all subfolders
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
            const subfolderItems = await source.service.getAllContentItems(
              source.repository.id,
              () => {}, // no-op callback for individual folder progress
              { folderId: subfolderId }
            );

            // Add subfolder items with their source folder ID
            subfolderItems.forEach((item: Amplience.ContentItem) => {
              allContentItemsWithFolders.push({ item, sourceFolderId: subfolderId });
            });
          } catch (error) {
            console.warn(`⚠️  Failed to fetch items from subfolder ${subfolderId}:`, error);
          }
          subfolderProgressBar.update(i + 1);
        }

        subfolderProgressBar.stop();
      }

      console.log(`✓ Found ${allContentItemsWithFolders.length} content items total`);
    } catch (error) {
      console.error('❌ Failed to fetch content items:', error);

      return;
    }

    // === HIERARCHY ANALYSIS ===
    console.log('\n🌳 Analyzing hierarchy structure...');

    // Extract just the content items for hierarchy analysis
    const allContentItems = allContentItemsWithFolders.map(({ item }) => item);

    // Analyze hierarchy and discover all descendants
    const hierarchyAnalysis = await analyzeHierarchyStructure(
      source.service,
      source.repository.id,
      allContentItems
    );

    // If hierarchy children were found, we need to fetch their details and add them to our processing list
    let finalItemsToProcess = allContentItemsWithFolders;

    if (hierarchyAnalysis.hierarchyChildrenFound > 0) {
      console.log(
        `\n🔍 Fetching details for ${hierarchyAnalysis.hierarchyChildrenFound} hierarchy descendants...`
      );

      // Get the newly discovered item IDs (those not in the original list)
      const originalItemIds = new Set(allContentItems.map(item => item.id));
      const newItemIds = hierarchyAnalysis.allItemsToProcess.filter(id => !originalItemIds.has(id));

      // Fetch full details for new items
      const newItemsProgressBar = createProgressBar(newItemIds.length, 'Fetching hierarchy items');
      const newItems: Amplience.ContentItem[] = [];

      for (const itemId of newItemIds) {
        try {
          const itemDetails = await source.service.getContentItemWithDetails(itemId);
          if (itemDetails) {
            newItems.push(itemDetails);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to fetch hierarchy item ${itemId}:`, error);
        }
        newItemsProgressBar.increment();
      }

      newItemsProgressBar.stop();

      // Add new hierarchy items to the processing list
      // For hierarchy items, we'll use the root item's folder as the source folder
      // (This is a simplification - in reality, hierarchy items may be in different folders)
      newItems.forEach(item => {
        allContentItemsWithFolders.push({
          item,
          sourceFolderId: source.folder!.id, // Use the main folder as default
        });
      });

      console.log(
        `✓ Added ${newItems.length} hierarchy descendants to processing list (total: ${allContentItemsWithFolders.length})`
      );

      finalItemsToProcess = allContentItemsWithFolders;
    }

    // Sort items to ensure parents are processed before children
    const sortedItems = sortContentForRecreation(finalItemsToProcess.map(({ item }) => item));

    // Rebuild the items with folders array in sorted order
    const sortedItemsWithFolders = sortedItems.map(item => {
      const original = finalItemsToProcess.find(({ item: i }) => i.id === item.id);

      return {
        item,
        sourceFolderId: original?.sourceFolderId || source.folder!.id,
      };
    });

    // === CONFIRMATION ===
    const operationSummary: OperationSummary = {
      sourceHub: source.hub.name,
      sourceRepository: source.repository.name,
      sourceFolder: source.folder!.name,
      targetHub: target.hub.name,
      targetRepository: target.repository.name,
      targetFolder: target.folder?.name || 'Root',
      'Folder to copy': source.folder!.name,
      Subfolders: countTotalFolders(folderStructure),
      'Content items (originally)': allContentItems.length,
      'Hierarchy descendants discovered': hierarchyAnalysis.hierarchyChildrenFound,
      'Total items to copy': sortedItemsWithFolders.length,
    };

    const confirmed = await confirmOperation(
      operationSummary,
      'Do you want to proceed with copying the folder and all its content (including hierarchy)?',
      true
    );

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');

      return;
    }

    // === EXECUTION ===
    console.log('\n🚀 Starting folder and content copy operation...');

    // Step 1: Create the main folder in target
    console.log(`\n📁 Creating main folder "${source.folder!.name}" in target...`);
    let createdMainFolder: Amplience.Folder | null = null;

    try {
      if (target.folder) {
        const result = await target.service.createSubFolder(target.folder.id, source.folder!.name);
        if (result.success && result.updatedItem) {
          createdMainFolder = result.updatedItem;
          console.log(`✓ Created main folder: ${createdMainFolder.name} (${createdMainFolder.id})`);
        } else {
          throw new Error(result.error || 'Failed to create main folder');
        }
      } else {
        const result = await target.service.createFolder(target.repository.id, source.folder!.name);
        if (result.success && result.updatedItem) {
          createdMainFolder = result.updatedItem;
          console.log(`✓ Created main folder: ${createdMainFolder.name} (${createdMainFolder.id})`);
        } else {
          throw new Error(result.error || 'Failed to create main folder');
        }
      }
    } catch (error) {
      console.error(`❌ Failed to create main folder:`, error);

      return;
    }

    if (!createdMainFolder) {
      console.error('❌ Failed to create main folder: No folder returned');

      return;
    }

    // Step 2: Recreate subfolder structure
    const folderMapping = createFolderMapping(source.folder, createdMainFolder);

    // Add the main folder mapping (source folder ID → target folder ID)
    folderMapping.set(source.folder!.id, createdMainFolder.id);

    if (folderStructure.length > 0) {
      console.log('\n📂 Recreating subfolder structure...');

      const folderProgressBar = createProgressBar(
        countTotalFolders(folderStructure),
        'Creating folders'
      );

      const structureResult = await recreateFolderStructure(
        target.service,
        target.repository.id,
        createdMainFolder.id,
        folderStructure,
        (name: string, success: boolean, error?: string) => {
          folderProgressBar.increment();
          if (!success && error) {
            console.warn(`⚠️  Failed to create folder "${name}": ${error}`);
          }
        }
      );

      folderProgressBar.stop();

      // Merge the folder mapping from subfolder creation
      structureResult.folderMapping.forEach((targetId, sourceId) => {
        folderMapping.set(sourceId, targetId);
      });

      console.log(`✓ Folder structure recreation completed:`);
      console.log(`  - Total folders: ${structureResult.totalFolders}`);
      console.log(`  - Created: ${structureResult.createdFolders}`);
      console.log(`  - Failed: ${structureResult.failedFolders}`);
      console.log(`  - Folder mappings: ${folderMapping.size}`);

      if (structureResult.errors.length > 0) {
        console.log(`⚠️  Folder creation errors:`);
        structureResult.errors.forEach(error => {
          console.log(`    - ${error.folderName}: ${error.error}`);
        });
      }
    }

    // Step 3: Recreate content items
    if (sortedItemsWithFolders.length > 0) {
      console.log('\n📄 Recreating content items (with hierarchy)...');

      const contentProgressBar = createProgressBar(
        sortedItemsWithFolders.length,
        'Recreating content'
      );

      try {
        // Prepare the items with their folder mappings
        const itemsWithFolders = sortedItemsWithFolders.map(({ item, sourceFolderId }) => ({
          itemId: item.id,
          sourceFolderId,
        }));

        await recreateContentItems(
          source.service,
          target.service,
          itemsWithFolders,
          target.repository.id,
          folderMapping,
          contentProgressBar
        );

        contentProgressBar.stop();
        console.log(`✅ Content item recreation completed!`);
      } catch (error) {
        contentProgressBar.stop();
        console.error(`❌ Content item recreation failed:`, error);

        return;
      }
    }

    console.log('\n🎉 Folder copy operation completed successfully!');
    console.log(
      `📁 Copied folder "${source.folder!.name}" with ${sortedItemsWithFolders.length} items (including ${hierarchyAnalysis.hierarchyChildrenFound} hierarchy descendants) to target hub.`
    );
  } catch (error) {
    console.error('❌ Unexpected error during folder copy operation:', error);
  }
}
