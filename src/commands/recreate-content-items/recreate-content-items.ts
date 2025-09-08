import { getHubConfigs } from '~/app-config';
import { promptForConfirmation } from '~/prompts';
import { recreateContentItems } from '~/services/actions';
import { findAllDescendants } from '~/utils/folder-tree';
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
    console.log('\n🌳 Analyzing hierarchy structure and discovering children...');

    // Get detailed information for all selected items
    const selectedItemsDetails: Amplience.ContentItemWithDetails[] = [];
    for (const item of selectedItems) {
      const details = await source.service.getContentItemWithDetails(item.id);
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
      console.log(`  📊 Fetching all repository items to analyze hierarchy relationships...`);
      const allRepositoryItems = await source.service.getAllContentItems(
        source.repository.id,
        (fetched: number, total: number) =>
          console.log(`    📊 Loading items: ${fetched}/${total} processed`),
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

    // Step 3: Target Selection
    console.log('\n🎯 Select target location:');
    const target = await selectTargetLocation(hubs, 'Select target folder (optional):', true);

    // Step 3.5: Target Locale Selection
    console.log('\n🌐 Select target locale:');
    const targetLocale = await promptForTargetLocale(
      target.service,
      target.repository.id,
      selectedItems
    );

    // Step 4: Confirmation
    console.log('\n📋 Recreation Summary:');
    console.log(`Source Hub: ${source.hub.name}`);
    console.log(`Source Repository: ${source.repository.name}`);
    console.log(`Source Folder: ${source.folder?.name || 'Repository Root'}`);
    console.log(`Originally selected items: ${selectedItems.length}`);
    console.log(`Total items to recreate: ${allItemsToProcess.length}`);
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

    // Step 5: Execute Recreation
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

    await recreateContentItems(
      source.service,
      target.service,
      itemsWithFolders,
      target.repository.id,
      folderMapping,
      undefined, // No progress bar - action provides its own detailed logging
      targetLocale
    );

    console.log('\n✅ Content item recreation completed!');
  } catch (error) {
    console.error('\n❌ Error during content item recreation:', error);
    throw error;
  }
}
