import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForConfirmation,
  promptForFolder,
} from '~/prompts';
import { cleanupFolder } from '~/services/actions/cleanup-folder';
import { AmplienceService } from '~/services/amplience-service';
import { promptForCleanupOptions } from './prompts';

/**
 * Main command function for cleaning up a folder
 */
export async function runCleanupFolderCommand(): Promise<void> {
  try {
    console.log('🧹 Folder Cleanup Tool');
    console.log('This tool will clean up a selected folder by:');
    console.log('- Moving all content items to a __deleted folder');
    console.log('- Archiving all moved content items');
    console.log('- Deleting all empty folders (from deepest to shallowest)');
    console.log('');

    // Step 1: Load hub configurations
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    // Step 2: Let user select a hub
    const selectedHub = await promptForHub(hubConfigs);
    console.log(`📍 Selected hub: ${selectedHub.name}`);

    // Step 3: Initialize service and get repositories
    const service = new AmplienceService(selectedHub);
    console.log('📡 Fetching repositories...');
    const repositories = await service.getRepositories();

    if (repositories.length === 0) {
      console.error('❌ No repositories found in the selected hub.');

      return;
    }

    // Step 4: Let user select a repository
    const selectedRepo = await promptForRepository(repositories);
    console.log(`📁 Selected repository: ${selectedRepo.label}`);

    // Step 5: Let user select a folder to cleanup (or repository root)
    console.log('📡 Fetching folders...');
    const selectedFolder = await promptForFolder(
      service,
      selectedRepo.id,
      'Select a folder to cleanup (or choose repository root):',
      true // Allow selecting repository root
    );

    const targetName = selectedFolder ? selectedFolder.name : 'Repository Root';
    const targetId = selectedFolder ? selectedFolder.id : null;
    console.log(`🎯 Selected target for cleanup: ${targetName}`);

    // Step 6: Get cleanup options
    const options = await promptForCleanupOptions();

    // Step 7: Show summary and confirm
    console.log('\n📋 Cleanup Summary:');
    console.log(`  Hub: ${selectedHub.name}`);
    console.log(`  Repository: ${selectedRepo.label}`);
    console.log(`  Target: ${targetName}`);
    console.log(`  Deleted Folder Name: ${options.deletedFolderName}`);
    console.log(`  Clear Delivery Keys: ${options.clearDeliveryKey ? 'Yes' : 'No'}`);
    console.log(`  Unpublish Items: ${options.unpublishIfNeeded ? 'Yes' : 'No'}`);
    console.log(`  Unarchive Items: ${options.unarchiveIfNeeded ? 'Yes' : 'No'}`);
    console.log('');

    const confirmed = await promptForConfirmation(
      '⚠️  WARNING: This will move content items and delete folders. This action cannot be undone. Continue?'
    );

    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');

      return;
    }

    // Step 8: Perform the cleanup
    console.log('\n🚀 Starting folder cleanup...');
    const result = await cleanupFolder(service, selectedRepo.id, targetId, options);

    // Step 10: Display results
    console.log('\n📊 Cleanup Results:');
    console.log(`  Overall Success: ${result.overallSuccess ? '✅' : '❌'}`);
    console.log(`  Folders Processed: ${result.foldersProcessed.length}`);
    console.log(`  Content Items Processed: ${result.contentItemsProcessed.length}`);
    console.log(`  Folders Deleted: ${result.foldersDeleted.length}`);

    if (result.deletedFolderId) {
      console.log(`  Deleted Folder ID: ${result.deletedFolderId}`);
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Show detailed results for content items
    if (result.contentItemsProcessed.length > 0) {
      console.log('\n📋 Content Item Results:');
      result.contentItemsProcessed.forEach((item, index) => {
        const moveSuccess = item.moveToDeletedResult.success ? '✅' : '❌';
        const archiveSuccess = item.archiveResult?.overallSuccess ? '✅' : '❌';
        console.log(
          `  ${index + 1}. Move: ${moveSuccess} Archive: ${archiveSuccess} ${item.label} (${item.itemId})`
        );

        if (!item.moveToDeletedResult.success && item.moveToDeletedResult.error) {
          console.log(`     - Move failed: ${item.moveToDeletedResult.error}`);
        }

        if (item.archiveResult && !item.archiveResult.overallSuccess) {
          if (
            !item.archiveResult.unarchiveResult.success &&
            item.archiveResult.unarchiveResult.error
          ) {
            console.log(`     - Unarchive failed: ${item.archiveResult.unarchiveResult.error}`);
          }
          if (
            !item.archiveResult.clearKeyResult.success &&
            item.archiveResult.clearKeyResult.error
          ) {
            console.log(`     - Clear key failed: ${item.archiveResult.clearKeyResult.error}`);
          }
          if (
            !item.archiveResult.unpublishResult.success &&
            item.archiveResult.unpublishResult.error
          ) {
            console.log(`     - Unpublish failed: ${item.archiveResult.unpublishResult.error}`);
          }
          if (!item.archiveResult.archiveResult.success && item.archiveResult.archiveResult.error) {
            console.log(`     - Archive failed: ${item.archiveResult.archiveResult.error}`);
          }
        }
      });
    }

    console.log('\n✅ Folder cleanup completed!');
  } catch (error) {
    console.error('❌ Unexpected error during folder cleanup:', error);
    process.exit(1);
  }
}
