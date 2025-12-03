import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForContentItem,
  promptForDryRun,
  promptForConfirmation,
} from '~/prompts';
import { syncHierarchy } from '~/services/actions/sync-hierarchy';
import { AmplienceService } from '~/services/amplience-service';
import { HierarchyService } from '~/services/hierarchy-service';
import { promptForLocaleStrategy } from './prompts';

/**
 * Main command to orchestrate hierarchy synchronization
 */
export async function runSyncHierarchy(): Promise<void> {
  console.log('🔄 Starting Hierarchy Synchronization');
  console.log('=====================================\n');

  try {
    // Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    // Step 1: Source Selection
    console.log('📍 Step 1: Select SOURCE hierarchy');
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
    console.log(`✅ Selected source: ${sourceHub.name} / ${sourceRepo.label}`);

    const sourceResult = await promptForContentItem(sourceService, sourceRepo.id);
    if (!sourceResult) {
      console.log('❌ No source root item selected. Aborting.');

      return;
    }
    const sourceRootItem = sourceResult.selectedItem;
    console.log(`✅ Selected source root: ${sourceRootItem.label}\n`);

    // Step 2: Target Selection
    console.log('🎯 Step 2: Select TARGET hierarchy');
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
    console.log(`✅ Selected target: ${targetHub.name} / ${targetRepo.label}`);

    const targetResult = await promptForContentItem(targetService, targetRepo.id);
    if (!targetResult) {
      console.log('❌ No target root item selected. Aborting.');

      return;
    }
    const targetRootItem = targetResult.selectedItem;
    console.log(`✅ Selected target root: ${targetRootItem.label}\n`);

    // Step 3: Configuration Options
    console.log('⚙️  Step 3: Configuration Options');

    const updateContent = await promptForConfirmation(
      'Update content of existing items (body comparison)?',
      false
    );

    const localeStrategy = await promptForLocaleStrategy(targetService, targetRepo.id);

    const publishAfterSync = await promptForConfirmation(
      'Publish content items after synchronization?',
      true
    );

    const isDryRun = await promptForDryRun();

    console.log(
      `✅ Configuration: ${updateContent ? 'Update content' : 'Structure only'}, Locale: ${localeStrategy.strategy}${localeStrategy.targetLocale ? ` (${localeStrategy.targetLocale})` : ''}, ${publishAfterSync ? 'Publish after sync' : 'No publishing'}, ${isDryRun ? 'DRY RUN' : 'EXECUTE'}\n`
    );

    const shouldProceed = await promptForConfirmation(
      'Do you want to proceed with these changes?',
      false
    );

    if (!shouldProceed) {
      console.log('❌ Operation cancelled by user.');

      return;
    }

    // Step 4: Build Hierarchies (reusing data fetched in Steps 1-2)
    console.log('🏗️  Step 4: Building Hierarchies');

    const hierarchyService = new HierarchyService(sourceService);

    console.log('Building source hierarchy...');
    console.log('Reusing items fetched from source selection (no additional API calls)...');
    const sourceTree = hierarchyService.buildHierarchyTreeFromItems(
      sourceRootItem.id,
      sourceResult.allItems
    );

    console.log('Building target hierarchy...');
    console.log('Reusing items fetched from target selection (no additional API calls)...');
    const targetHierarchyService = new HierarchyService(targetService);
    const targetTree = targetHierarchyService.buildHierarchyTreeFromItems(
      targetRootItem.id,
      targetResult.allItems
    );

    // Execute the synchronization action
    await syncHierarchy({
      sourceService,
      targetService,
      targetRepositoryId: targetRepo.id,
      sourceTree,
      targetTree,
      updateContent,
      localeStrategy,
      publishAfterSync,
      isDryRun,
    });
  } catch (error) {
    console.error('❌ Error during hierarchy synchronization command:', error);
    throw error;
  }
}
