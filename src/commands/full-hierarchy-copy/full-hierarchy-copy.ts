import { getHubConfigs } from '~/app-config';
import { promptForConfirmation, promptForDryRun } from '~/prompts';
import { executeFullHierarchyCopy } from '~/services/actions/full-hierarchy-copy';
import { findAllDescendants } from '~/utils/folder-tree';
import {
  promptForItemsToRecreate,
  promptForRecreationFilters,
  promptForTargetLocale,
} from '../recreate-content-items/prompts';
import { applyFilters } from '../recreate-content-items/utils';
import { selectSourceLocation, selectTargetLocation } from '../shared/location-selection';
import { promptForDuplicateStrategy } from './prompts';
import { generateFullHierarchyCopyReport } from './report';

/**
 * Full Hierarchy Copy command — copies hierarchy trees including all embedded
 * content items (Content Links, Content References, Inline Content Links)
 * between Amplience hubs.
 *
 * Follows the recreate-content-items user flow:
 * Source hub → items → target hub → locale → duplicate strategy → validate → confirm → execute → report
 */
export async function runFullHierarchyCopy(): Promise<void> {
  console.log('\n=== Full Hierarchy Copy (with Embedded Content) ===\n');

  try {
    const hubs = getHubConfigs();

    // Step 1: Source Selection
    console.log('📁 Select source location:');
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
      () => {},
      source.folder ? { folderId: source.folder.id } : undefined
    );

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

    // Step 3: Discover hierarchy children
    console.log('\n🌳 Discovering hierarchy children...');
    const selectedDetails: Amplience.ContentItemWithDetails[] = [];
    for (const item of selectedItems) {
      const details = await source.service.getContentItemWithDetails(item.id);
      if (details) selectedDetails.push(details);
    }

    const hierarchyRoots = selectedDetails.filter(item => item.hierarchy?.root);
    let allItemIds = selectedItems.map(item => item.id);

    if (hierarchyRoots.length > 0) {
      console.log(`  🌲 Found ${hierarchyRoots.length} hierarchy roots, discovering children...`);
      const repoItems = await source.service.getAllContentItems(source.repository.id, () => {}, {
        size: 100,
      });

      const descendants = new Set<string>();
      for (const root of hierarchyRoots) {
        const rootDescendants = findAllDescendants(root.id, repoItems);
        rootDescendants.forEach(id => descendants.add(id));
      }

      allItemIds = [...new Set([...allItemIds, ...descendants])];
      console.log(`  📊 Total items (including hierarchy children): ${allItemIds.length}`);
    }

    // Step 4: Target Selection
    console.log('\n🎯 Select target location:');
    const target = await selectTargetLocation(hubs, 'Select target folder (optional):', true);

    // Step 5: Target Locale Selection
    console.log('\n🌐 Select target locale:');
    const targetLocale = await promptForTargetLocale(
      target.service,
      target.repository.id,
      selectedItems
    );

    // Step 6: Duplicate Strategy
    console.log('\n🔄 Configure duplicate handling:');
    const duplicateStrategy = await promptForDuplicateStrategy();

    // Step 6b: Dry Run Mode
    const isDryRun = await promptForDryRun();
    if (isDryRun) {
      console.log('🔍 Running in DRY-RUN mode - no changes will be made\n');
    }

    // Step 7: Confirmation
    console.log('\n📋 Operation Summary:');
    console.log(`  Source Hub: ${source.hub.name}`);
    console.log(`  Source Repository: ${source.repository.name}`);
    console.log(`  Source Folder: ${source.folder?.name || 'Repository Root'}`);
    console.log(`  Items to process: ${allItemIds.length}`);
    console.log(`  Target Hub: ${target.hub.name}`);
    console.log(`  Target Repository: ${target.repository.name}`);
    console.log(`  Target Folder: ${target.folder?.name || 'Repository Root'}`);
    console.log(`  Target Locale: ${targetLocale || 'Keep source locale'}`);
    console.log(`  Duplicate Strategy: ${duplicateStrategy}`);
    console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log('');
    console.log(
      '  ⚠️  This operation will discover all embedded content (Content Links, Content References)'
    );
    console.log('  and recreate them along with the hierarchy in the target hub.');

    const confirmed = await promptForConfirmation('Proceed with full hierarchy copy?');

    if (!confirmed) {
      console.log('ℹ️  Operation cancelled by user.');

      return;
    }

    // Step 8: Build folder mapping
    const folderMapping = new Map<string, string>();
    if (source.folder && target.folder) {
      folderMapping.set(source.folder.id, target.folder.id);
    }
    if (target.folder) {
      folderMapping.set('', target.folder.id);
    }

    // Step 9: Execute
    console.log('\n🚀 Starting full hierarchy copy...');

    const result = await executeFullHierarchyCopy({
      sourceService: source.service,
      targetService: target.service,
      sourceRepositoryId: source.repository.id,
      targetRepositoryId: target.repository.id,
      hierarchyItems: allItemIds,
      folderMapping,
      duplicateStrategy,
      isDryRun,
      targetLocale,
    });

    // Step 10: Generate Report
    const reportPath = generateFullHierarchyCopyReport(result, {
      sourceHubName: source.hub.name,
      targetHubName: target.hub.name,
      sourceRepositoryName: source.repository.name,
      targetRepositoryName: target.repository.name,
      duplicateStrategy,
      targetLocale,
    });

    // Final output
    if (result.validationResult && !result.validationResult.valid) {
      console.log('\n❌ Operation aborted due to validation failures.');
      console.log(`📄 See report for details: ${reportPath}`);
    } else {
      console.log('\n✅ Full hierarchy copy completed!');
      console.log(`📄 Report: ${reportPath}`);
    }
  } catch (error) {
    console.error('\n❌ Error during full hierarchy copy:', error);
    throw error;
  }
}
