import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForFolder,
  promptForConfirmation,
} from '~/prompts';
import { recreateContentItems } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils';
import {
  promptForRecreationFilters,
  promptForItemsToRecreate,
  promptForTargetLocale,
} from './prompts';
import { applyFilters } from './utils';

export async function runRecreateContentItems(): Promise<void> {
  console.log('\n=== Recreate Content Items ===\n');

  try {
    // Load configuration
    const hubs = getHubConfigs();

    // Step 1: Source Selection
    console.log('📁 Select source location (folder or repository root):');
    const sourceHub = await promptForHub(hubs);
    const sourceService = new AmplienceService(sourceHub);

    const sourceRepositories = await sourceService.getRepositories();
    const sourceRepository = await promptForRepository(sourceRepositories);

    const sourceFolder = await promptForFolder(
      sourceService,
      sourceRepository.id,
      'Select source folder (or repository root):',
      true // allowNone - allows selecting repository root
    );

    // Step 2: Filter and Select Items
    console.log('\n🔍 Configure content item filters:');
    const filters = await promptForRecreationFilters();

    console.log('\n📋 Fetching content items...');
    const allItems = await sourceService.getAllContentItems(
      sourceRepository.id,
      () => {}, // no-op callback for progress
      sourceFolder ? { folderId: sourceFolder.id } : undefined
    );

    // Apply filters
    const filteredItems = applyFilters(allItems, filters);

    if (filteredItems.length === 0) {
      console.log('❌ No content items found matching your criteria.');

      return;
    }

    const selectedItems = await promptForItemsToRecreate(filteredItems);

    if (selectedItems.length === 0) {
      console.log('ℹ️  No items selected. Operation cancelled.');

      return;
    }

    // Step 3: Target Selection
    console.log('\n🎯 Select target location:');
    const targetHub = await promptForHub(hubs);
    const targetService = new AmplienceService(targetHub);

    const targetRepositories = await targetService.getRepositories();
    const targetRepository = await promptForRepository(targetRepositories);

    const targetFolder = await promptForFolder(
      targetService,
      targetRepository.id,
      'Select target folder (optional):',
      true // allowNone
    );

    // Step 3.5: Target Locale Selection
    console.log('\n🌐 Select target locale:');
    const targetLocale = await promptForTargetLocale(
      targetService,
      targetRepository.id,
      selectedItems
    );

    // Step 4: Confirmation
    console.log('\n📋 Recreation Summary:');
    console.log(`Source Hub: ${sourceHub.name}`);
    console.log(`Source Repository: ${sourceRepository.name}`);
    console.log(`Source Folder: ${sourceFolder?.name || 'Repository Root'}`);
    console.log(`Items to recreate: ${selectedItems.length}`);
    console.log('');
    console.log(`Target Hub: ${targetHub.name}`);
    console.log(`Target Repository: ${targetRepository.name}`);
    console.log(`Target Folder: ${targetFolder?.name || 'Repository Root'}`);
    console.log(`Target Locale: ${targetLocale || 'Keep source locale'}`);

    const confirmed = await promptForConfirmation(
      'Do you want to proceed with recreating the selected content items?'
    );

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');

      return;
    }

    // Step 5: Execute Recreation
    console.log('\n🚀 Starting content item recreation...');
    const progressBar = createProgressBar(selectedItems.length, 'Recreating items');

    // Map items to the format expected by recreateContentItems
    const itemsWithFolders = selectedItems
      .map(item => ({
        itemId: item.id,
        sourceFolderId: sourceFolder?.id || '',
      }))
      .filter(item => item.sourceFolderId !== ''); // Only include items with valid folder IDs

    const folderMapping = new Map<string, string>();
    if (sourceFolder && targetFolder) {
      folderMapping.set(sourceFolder.id, targetFolder.id);
    }

    await recreateContentItems(
      sourceService,
      targetService,
      itemsWithFolders,
      targetRepository.id,
      folderMapping,
      progressBar,
      targetLocale
    );

    progressBar.stop();

    console.log('\n✅ Content item recreation completed!');
  } catch (error) {
    console.error('\n❌ Error during content item recreation:', error);
    throw error;
  }
}
