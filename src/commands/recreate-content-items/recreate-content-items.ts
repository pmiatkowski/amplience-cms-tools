import { getHubConfigs } from '~/app-config';
import { promptForConfirmation, promptForProtectedEnvironment } from '~/prompts';
import { preflightContentItemRecreation, recreateContentItems } from '~/services/actions';
import { analyzeHierarchyStructure } from '../shared/content-operations';
import { displayContentTypePreflightResult } from '../shared/content-type-preflight';
import { selectSourceLocation, selectTargetLocation } from '../shared/location-selection';
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
    const source = await selectSourceLocation(
      hubs,
      'Select source folder (or repository root):',
      true
    );

    // Step 2: Filter and Select Items
    console.log('\n🔍 Configure content item filters:');
    const filters = await promptForRecreationFilters();

    console.log('\n📋 Fetching content items...');
    const allItems = await source.service.getAllContentItems(
      source.repository.id,
      () => {}, // no-op callback for progress
      source.folder ? { folderId: source.folder.id } : undefined
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

    // Step 2.5: Analyze hierarchy structure and discover all items to recreate
    const hierarchyAnalysis = await analyzeHierarchyStructure(
      source.service,
      source.repository.id,
      selectedItems
    );
    const { allItemsToProcess, hierarchyChildrenFound } = hierarchyAnalysis;

    // Step 3: Target Selection
    console.log('\n🎯 Select target location:');
    const target = await selectTargetLocation(hubs, 'Select target folder (optional):', true);

    // Step 3.5: Validate every content type that may be created
    console.log('\n🔍 Validating target repository content types...');
    const preflight = await preflightContentItemRecreation({
      sourceService: source.service,
      targetService: target.service,
      sourceRepositoryId: source.repository.id,
      targetRepositoryId: target.repository.id,
      initialItemIds: allItemsToProcess,
      onProgress: (phase, current, total) => {
        console.log(`  📊 ${phase}: ${current}/${total}`);
      },
    });
    displayContentTypePreflightResult(preflight, target.repository.name);

    if (preflight.status === 'blocked') {
      return;
    }

    const totalItemsToCreate =
      preflight.referenceSummary?.itemsToCreate ?? allItemsToProcess.length;
    const referencedItemsToCreate = Math.max(0, totalItemsToCreate - allItemsToProcess.length);

    // Step 4: Target Locale Selection
    console.log('\n🌐 Select target locale:');
    const targetLocale = await promptForTargetLocale(
      target.service,
      target.repository.id,
      selectedItems
    );

    // Step 5: Confirmation
    console.log('\n📋 Recreation Summary:');
    console.log(`Source Hub: ${source.hub.name}`);
    console.log(`Source Repository: ${source.repository.name}`);
    console.log(`Source Folder: ${source.folder?.name || 'Repository Root'}`);
    console.log(`Originally selected items: ${selectedItems.length}`);
    console.log(`Selected and hierarchy items: ${allItemsToProcess.length}`);
    console.log(`Referenced items to create: ${referencedItemsToCreate}`);
    console.log(`Total items to create: ${totalItemsToCreate}`);
    if (hierarchyChildrenFound > 0) {
      console.log(`  └─ Includes ${hierarchyChildrenFound} hierarchy children`);
    }
    console.log('');
    console.log(`Target Hub: ${target.hub.name}`);
    console.log(`Target Repository: ${target.repository.name}`);
    console.log(`Target Folder: ${target.folder?.name || 'Repository Root'}`);
    console.log(`Target Locale: ${targetLocale || 'Keep source locale'}`);

    const confirmed = await promptForConfirmation(
      'Do you want to proceed with recreating the selected content items and their hierarchy children?'
    );

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');

      return;
    }

    await promptForProtectedEnvironment(target.hub, target.repository);

    // Step 6: Execute Recreation
    console.log('\n🚀 Starting content item recreation...');

    // Map all discovered items to the format expected by recreateContentItems
    // For hierarchy items, we need to determine which folder each item should go to
    const itemsWithFolders = allItemsToProcess.map((itemId: string) => ({
      itemId,
      sourceFolderId: source.folder?.id || '', // For now, use the source folder for all items
    }));

    const folderMapping = new Map<string, string>();
    if (source.folder && target.folder) {
      folderMapping.set(source.folder.id, target.folder.id);
    }
    // Also map empty string (repository root) to target folder or repository root
    if (target.folder) {
      folderMapping.set('', target.folder.id);
    }

    const recreationResult = await recreateContentItems(
      source.service,
      target.service,
      itemsWithFolders,
      target.repository.id,
      folderMapping,
      undefined, // No progress bar - action provides its own detailed logging
      targetLocale,
      true, // resolveReferences - always enable for cross-hub operations
      source.repository.id, // sourceRepositoryId - required for reference resolution
      preflight
    );

    if (!recreationResult.success) {
      const publishFailureSummary =
        recreationResult.publishFailed > 0
          ? `, ${recreationResult.publishFailed} publish failed`
          : '';
      console.error(
        `\n❌ Content item recreation completed with failures: ` +
          `${recreationResult.itemsCreated} created, ${recreationResult.failed} failed` +
          `${publishFailureSummary}.`
      );

      return;
    }

    console.log(
      `\n✅ Content item recreation completed: ${recreationResult.itemsCreated} items created.`
    );
  } catch (error) {
    console.error('\n❌ Error during content item recreation:', error);
    throw error;
  }
}
