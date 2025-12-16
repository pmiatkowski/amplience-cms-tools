import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForContentItem,
  promptForDryRun,
  promptForConfirmation,
} from '~/prompts';
import { bulkSyncHierarchies } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { HierarchyService } from '~/services/hierarchy-service';
import { promptForLocaleStrategy } from '../sync-hierarchy/prompts';
import { promptForMultipleHierarchies } from './prompts';
import {
  generateMissingHierarchiesReport,
  matchHierarchies,
  saveMissingHierarchiesReport,
} from './utils';
import type { MatchedHierarchyPair, SourceHierarchy } from './types';

/**
 * Main command to orchestrate bulk hierarchy synchronization
 */
export async function runBulkSyncHierarchies(): Promise<void> {
  console.log('🔄 Starting Bulk Hierarchy Synchronization');
  console.log('==========================================\n');

  try {
    // Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    // Step 1: Source Selection
    console.log('📍 Step 1: Select SOURCE hierarchies');
    const sourceHub = await promptForHub(hubConfigs);
    if (!sourceHub) {
      console.log('❌ No source hub selected. Aborting.');

      return;
    }

    const sourceService = new AmplienceService(sourceHub);
    const sourceRepos = await sourceService.getRepositories();

    if (sourceRepos.length === 0) {
      console.log('❌ No repositories found in source hub. Aborting.');

      return;
    }

    const sourceRepo = await promptForRepository(sourceRepos);
    if (!sourceRepo) {
      console.log('❌ No source repository selected. Aborting.');

      return;
    }
    console.log(`✅ Selected source: ${sourceHub.name} / ${sourceRepo.label}`);

    const sourceResult = await promptForContentItem(sourceService, sourceRepo.id, undefined);
    if (!sourceResult) {
      console.log('❌ No content items selected. Aborting.');

      return;
    }

    const { filteredItems, allItems: sourceAllItems } = sourceResult;
    console.log(`Found ${filteredItems.length} matching hierarchies\n`);

    const selectedSourceItems = await promptForMultipleHierarchies(filteredItems);
    if (selectedSourceItems.length === 0) {
      console.log('❌ No hierarchies selected. Aborting.');

      return;
    }

    console.log(`✅ Selected ${selectedSourceItems.length} hierarchies for synchronization\n`);

    // Step 2: Target Selection
    console.log('🎯 Step 2: Select TARGET hub & repository');
    const targetHub = await promptForHub(hubConfigs);
    if (!targetHub) {
      console.log('❌ No target hub selected. Aborting.');

      return;
    }

    const targetService = new AmplienceService(targetHub);
    const targetRepos = await targetService.getRepositories();

    if (targetRepos.length === 0) {
      console.log('❌ No repositories found in target hub. Aborting.');

      return;
    }

    const targetRepo = await promptForRepository(targetRepos);
    if (!targetRepo) {
      console.log('❌ No target repository selected. Aborting.');

      return;
    }
    console.log(`✅ Selected target: ${targetHub.name} / ${targetRepo.label}\n`);

    // Fetch all target repository items
    console.log('Fetching target repository items...');
    const targetAllItems = await targetService.getAllContentItems(
      targetRepo.id,
      (fetched: number, total: number) => {
        if (total > 0) {
          console.log(
            `  📥 Fetched ${fetched}/${total} items (${((fetched / total) * 100).toFixed(1)}%)`
          );
        }
      }
    );
    console.log(`Found ${targetAllItems.length} items in target repository\n`);

    // Step 3: Hierarchy Matching
    console.log('🔍 Step 3: Matching hierarchies...');
    const sourceHierarchies: SourceHierarchy[] = selectedSourceItems.map(item => ({
      item,
      allItems: sourceAllItems,
      contentCount: sourceAllItems.filter(i =>
        i.body?._meta?.deliveryKey?.startsWith(item.body?._meta?.deliveryKey || '')
      ).length,
    }));

    const { matched, missing } = matchHierarchies(sourceHierarchies, targetAllItems);

    console.log(`✅ Matched: ${matched.length} hierarchies found in target`);
    if (matched.length > 0) {
      for (const pair of matched) {
        const deliveryKey = pair.source.item.body?._meta?.deliveryKey || 'no-key';
        const schemaId = pair.source.item.body?._meta?.schema || 'no-schema';
        console.log(`  • ${deliveryKey} → ${deliveryKey} (${schemaId})`);
      }
    }

    if (missing.length > 0) {
      console.log(`\n⚠️  Missing: ${missing.length} hierarchy(ies) not found in target`);
      for (const m of missing) {
        console.log(`  • ${m.deliveryKey} (${m.schemaId})`);
        console.log(`    Name: ${m.name}`);
        console.log(`    Content items in source: ${m.contentCount}`);
      }

      const report = generateMissingHierarchiesReport(missing);
      const reportPath = await saveMissingHierarchiesReport(report);
      console.log(`\n📋 Missing hierarchies report saved to: ${reportPath}`);
    }

    if (matched.length === 0) {
      console.log('\n❌ No matching hierarchies found in target. Aborting.');

      return;
    }

    // Step 4: Configuration Options
    console.log('\n⚙️  Step 4: Configuration Options');

    const updateContent = await promptForConfirmation(
      'Update content of existing items (body comparison)?',
      false
    );

    const localeStrategy = await promptForLocaleStrategy(targetService, targetRepo.id);

    const publishAfterSync = await promptForConfirmation(
      'Publish content items after synchronization?',
      false
    );

    const isDryRun = await promptForDryRun();

    console.log('\n✅ Configuration:');
    console.log(`  • ${updateContent ? 'Update content' : 'Structure only (no content updates)'}`);
    console.log(`  • Locale: ${localeStrategy.strategy}`);
    console.log(`  • ${publishAfterSync ? 'Publish after sync' : 'Do not publish'}`);
    console.log(`  • ${isDryRun ? 'DRY-RUN (preview only)' : 'EXECUTE (not dry-run)'}`);

    // Step 5: Summary & Confirmation
    console.log('\n📊 Step 5: Summary');
    console.log(`Source Hub: ${sourceHub.name} / ${sourceRepo.label}`);
    console.log(`Target Hub: ${targetHub.name} / ${targetRepo.label}`);
    console.log(`\nHierarchies to synchronize: ${matched.length}`);
    for (let i = 0; i < matched.length; i++) {
      const pair = matched[i];
      const deliveryKey = pair.source.item.body?._meta?.deliveryKey || 'no-key';
      const schemaId = pair.source.item.body?._meta?.schema || 'no-schema';
      const name = pair.source.item.label || 'Unnamed Hierarchy';
      const contentCount = pair.source.contentCount || 0;
      console.log(`  ${i + 1}. ${name} (${deliveryKey})`);
      console.log(`     Schema: ${schemaId}`);
      console.log(`     Source items: ${contentCount}`);
    }

    if (missing.length > 0) {
      console.log(`\nMissing hierarchies: ${missing.length}`);
      for (const m of missing) {
        console.log(`  • ${m.name} (${m.deliveryKey}) - ${m.contentCount} items`);
      }
    }

    const totalItems = matched.reduce((sum, pair) => sum + (pair.source.contentCount || 0), 0);
    console.log(`\nTotal operations across all hierarchies: ~${totalItems} content items`);

    const confirmed = await promptForConfirmation(
      'Do you want to proceed with these changes?',
      false
    );

    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');

      return;
    }

    console.log('✅ Confirmed. Proceeding with bulk synchronization...\n');

    // Step 6: Build Hierarchy Trees
    console.log('🏗️  Step 6: Building Hierarchies');
    console.log(`Building hierarchy trees for ${matched.length} matched pairs...`);

    const hierarchyService = new HierarchyService(sourceService);
    const matchedPairsWithTrees: MatchedHierarchyPair[] = [];

    for (const pair of matched) {
      const sourceTree = hierarchyService.buildHierarchyTreeFromItems(
        pair.source.item.id,
        pair.source.allItems
      );

      matchedPairsWithTrees.push({
        source: {
          ...pair.source,
          item: sourceTree.item,
        },
        target: pair.target,
      });
    }

    console.log('✅ All hierarchy trees built\n');

    // Step 7: Execute Bulk Synchronization
    console.log('🚀 Step 7: Executing Bulk Synchronization');

    const result = await bulkSyncHierarchies({
      sourceService,
      targetService,
      targetRepositoryId: targetRepo.id,
      matchedPairs: matchedPairsWithTrees,
      updateContent,
      localeStrategy,
      publishAfterSync,
      isDryRun,
    });

    // Step 8: Display Final Results
    console.log('\n✅ Bulk Synchronization Complete!');
    console.log('\n📊 Final Summary:');
    console.log(`  • Total selected: ${selectedSourceItems.length} hierarchies`);
    console.log(`  • Matched & processed: ${matched.length} hierarchies`);
    if (missing.length > 0) {
      console.log(`  • Missing in target: ${missing.length} hierarchy(ies)`);
    }
    console.log(`  • Successfully synchronized: ${result.successful} hierarchies`);
    console.log(`  • Failed: ${result.failed} hierarchies`);

    const totalCreated = result.results.reduce((sum, r) => sum + (r.itemsCreated || 0), 0);
    const totalRemoved = result.results.reduce((sum, r) => sum + (r.itemsRemoved || 0), 0);

    if (totalCreated > 0 || totalRemoved > 0) {
      console.log(`  • Total items created: ${totalCreated}`);
      console.log(`  • Total items removed: ${totalRemoved}`);
    }

    if (missing.length > 0) {
      console.log(
        `\n⚠️  Reminder: ${missing.length} hierarchy(ies) not found in target (see report)`
      );
    }

    console.log('\nDetailed results:');
    for (const r of result.results) {
      if (r.success) {
        console.log(
          `  ✅ ${r.sourceName} (${r.sourceDeliveryKey}): ${r.itemsCreated || 0} created, ${r.itemsRemoved || 0} removed`
        );
      } else {
        console.log(`  ❌ ${r.sourceName} (${r.sourceDeliveryKey}): ${r.error}`);
      }
    }
  } catch (err) {
    console.error('\n❌ Fatal error during bulk synchronization:', err);
    throw err;
  }
}
