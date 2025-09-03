import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForFolder,
  promptForConfirmation,
} from '~/prompts';
import { listNestedSubfolders, FolderTreeNode } from '~/services/actions/list-nested-subfolders';
import { recreateContentItems } from '~/services/actions/recreate-content-items';
import { recreateFolderStructure } from '~/services/actions/recreate-folder-structure';
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils';

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
    console.log('📂 Select Source Location:');

    // Prompt for source hub
    const sourceHub = await promptForHub(hubConfigs);
    const sourceService = new AmplienceService(sourceHub);

    // Get source repositories
    const sourceRepositories = await sourceService.getRepositories();
    if (sourceRepositories.length === 0) {
      console.error('No repositories found in the source hub.');

      return;
    }

    // Prompt for source repository
    const sourceRepository = await promptForRepository(sourceRepositories);

    // Prompt for source folder
    const sourceFolder = await promptForFolder(
      sourceService,
      sourceRepository.id,
      'Select source folder to copy:',
      false // Don't allow none - we need a specific folder to copy
    );

    if (!sourceFolder) {
      console.log('❌ No folder selected. Operation cancelled.');

      return;
    }

    // === TARGET SELECTION ===
    console.log('\n🎯 Select Target Location:');

    // Prompt for target hub
    const targetHub = await promptForHub(hubConfigs);
    const targetService = new AmplienceService(targetHub);

    // Get target repositories
    const targetRepositories = await targetService.getRepositories();
    if (targetRepositories.length === 0) {
      console.error('No repositories found in the target hub.');

      return;
    }

    // Prompt for target repository
    const targetRepository = await promptForRepository(targetRepositories);

    // Prompt for target parent folder (where the copied folder will be placed)
    const targetParentFolder = await promptForFolder(
      targetService,
      targetRepository.id,
      'Select target parent folder (where to place the copied folder):',
      true // Allow none - can be placed at repository root
    );

    // === ANALYSIS ===
    console.log('\n🔍 Analyzing source folder structure and content...');

    // Get the folder structure
    let folderStructure: FolderTreeNode[];
    try {
      const folderResult = await listNestedSubfolders(
        sourceService,
        sourceRepository.id,
        sourceFolder.id
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
      const mainFolderItems = await sourceService.getAllContentItems(
        sourceRepository.id,
        (fetched, total) => {
          if (total > 0) {
            progressBar.setTotal(total);
            progressBar.update(fetched);
          }
        },
        { folderId: sourceFolder.id }
      );

      progressBar.stop();

      // Add main folder items with their source folder ID
      mainFolderItems.forEach(item => {
        allContentItemsWithFolders.push({ item, sourceFolderId: sourceFolder.id });
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
            const subfolderItems = await sourceService.getAllContentItems(
              sourceRepository.id,
              () => {}, // no-op callback for individual folder progress
              { folderId: subfolderId }
            );

            // Add subfolder items with their source folder ID
            subfolderItems.forEach(item => {
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

    // === CONFIRMATION ===
    console.log('\n📊 Copy Operation Summary:');
    console.log(`Source: ${sourceHub.name} > ${sourceRepository.name} > ${sourceFolder.name}`);
    console.log(
      `Target: ${targetHub.name} > ${targetRepository.name}${targetParentFolder ? ` > ${targetParentFolder.name}` : ' > Root'}`
    );
    console.log(`Folder to copy: ${sourceFolder.name}`);
    console.log(`Subfolders: ${countTotalFolders(folderStructure)}`);
    console.log(`Content items: ${allContentItemsWithFolders.length}`);

    const confirmed = await promptForConfirmation(
      'Do you want to proceed with copying the folder and all its content?'
    );

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');

      return;
    }

    // === EXECUTION ===
    console.log('\n🚀 Starting folder and content copy operation...');

    // Step 1: Create the main folder in target
    console.log(`\n📁 Creating main folder "${sourceFolder.name}" in target...`);
    let createdMainFolder: Amplience.Folder | null = null;

    try {
      if (targetParentFolder) {
        const result = await targetService.createSubFolder(
          targetParentFolder.id,
          sourceFolder.name
        );
        if (result.success && result.updatedItem) {
          createdMainFolder = result.updatedItem;
          console.log(`✓ Created main folder: ${createdMainFolder.name} (${createdMainFolder.id})`);
        } else {
          throw new Error(result.error || 'Failed to create main folder');
        }
      } else {
        const result = await targetService.createFolder(targetRepository.id, sourceFolder.name);
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
    const folderMapping = new Map<string, string>();

    // Add the main folder mapping (source folder ID → target folder ID)
    folderMapping.set(sourceFolder.id, createdMainFolder.id);

    if (folderStructure.length > 0) {
      console.log('\n📂 Recreating subfolder structure...');

      const folderProgressBar = createProgressBar(
        countTotalFolders(folderStructure),
        'Creating folders'
      );

      const structureResult = await recreateFolderStructure(
        targetService,
        targetRepository.id,
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
    if (allContentItemsWithFolders.length > 0) {
      console.log('\n📄 Recreating content items...');

      const contentProgressBar = createProgressBar(
        allContentItemsWithFolders.length,
        'Recreating content'
      );

      try {
        // Prepare the items with their folder mappings
        const itemsWithFolders = allContentItemsWithFolders.map(({ item, sourceFolderId }) => ({
          itemId: item.id,
          sourceFolderId,
        }));

        await recreateContentItems(
          sourceService,
          targetService,
          itemsWithFolders,
          targetRepository.id,
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
      `📁 Copied folder "${sourceFolder.name}" with ${allContentItemsWithFolders.length} items to target hub.`
    );
  } catch (error) {
    console.error('❌ Unexpected error during folder copy operation:', error);
  }
}

/**
 * Count total number of folders in a folder tree structure
 */
function countTotalFolders(folderTree: FolderTreeNode[]): number {
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
 * Get all subfolder IDs from a folder tree structure
 */
function getAllSubfolderIds(folderTree: FolderTreeNode[]): string[] {
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
