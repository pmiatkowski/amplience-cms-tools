import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForFolder,
  promptForConfirmation,
} from '~/prompts';
import { listNestedSubfolders, FolderTreeNode } from '~/services/actions/list-nested-subfolders';
import { recreateFolderStructure } from '~/services/actions/recreate-folder-structure';
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils';

/**
 * Main command function to recreate folder structure from source to target
 */
export async function runRecreateFolderStructure(): Promise<void> {
  console.log('\n🔄 Recreate Folder Structure');
  console.log(
    'This command will copy a folder hierarchy from a source location to a target location.\n'
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
      false // Don't allow none - we need a specific folder
    );

    if (!sourceFolder) {
      console.log('No source folder selected. Operation cancelled.');

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

    // Prompt for target parent folder (optional)
    const targetParentFolder = await promptForFolder(
      targetService,
      targetRepository.id,
      'Select target parent folder (or repository root):',
      true // Allow none - can create at repository root
    );

    // === ANALYZE SOURCE STRUCTURE ===
    console.log('\n🔍 Analyzing source folder structure...');

    const sourceFolderTree = await listNestedSubfolders(
      sourceService,
      sourceRepository.id,
      sourceFolder.id
    );

    if (!sourceFolderTree.tree || sourceFolderTree.tree.length === 0) {
      console.log('Source folder has no subfolders to copy.');

      return;
    }

    // === DISPLAY SUMMARY ===
    console.log('\n📋 Operation Summary:');
    console.log(`Source: ${sourceHub.name} > ${sourceRepository.label} > ${sourceFolder.name}`);
    console.log(
      `Target: ${targetHub.name} > ${targetRepository.label}${targetParentFolder ? ` > ${targetParentFolder.name}` : ' (root)'}`
    );
    console.log(`Folders to create: ${countFoldersInTree(sourceFolderTree.tree)}`);

    displayFolderTree(sourceFolderTree.tree, '');

    // === CONFIRMATION ===
    const confirmed = await promptForConfirmation(
      'Do you want to proceed with recreating this folder structure?'
    );

    if (!confirmed) {
      console.log('Operation cancelled.');

      return;
    }

    // === EXECUTE RECREATION ===
    console.log('\n🚀 Creating folder structure...');

    const totalFolders = countFoldersInTree(sourceFolderTree.tree);
    const progressBar = createProgressBar(totalFolders, 'Creating folders');

    const result = await recreateFolderStructure(
      targetService,
      targetRepository.id,
      targetParentFolder?.id || null,
      sourceFolderTree.tree,
      (folderName: string, success: boolean, error?: string) => {
        progressBar.increment();
        if (!success && error) {
          console.log(`\n❌ Failed to create folder "${folderName}": ${error}`);
        }
      }
    );

    progressBar.stop();

    // === DISPLAY RESULTS ===
    console.log('\n✅ Operation completed!');
    console.log(`Total folders: ${result.totalFolders}`);
    console.log(`Created successfully: ${result.createdFolders}`);
    console.log(`Failed: ${result.failedFolders}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => {
        console.log(`  • ${error.folderName}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Recursively count folders in a tree structure
 */
function countFoldersInTree(nodes: FolderTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++; // Count current folder
    if (node.children && node.children.length > 0) {
      count += countFoldersInTree(node.children);
    }
  }

  return count;
}

/**
 * Display folder tree structure in console
 */
function displayFolderTree(nodes: FolderTreeNode[], indent: string): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';

    console.log(`${indent}${connector}📁 ${node.name}`);

    if (node.children && node.children.length > 0) {
      const childIndent = indent + (isLast ? '    ' : '│   ');
      displayFolderTree(node.children, childIndent);
    }
  }
}
