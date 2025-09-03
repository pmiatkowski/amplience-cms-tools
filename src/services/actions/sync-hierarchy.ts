import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForContentItem,
  promptForLocaleStrategy,
  promptForDryRun,
  promptForConfirmation,
} from '~/prompts';
import { createProgressBar } from '~/utils';
import { AmplienceService } from '../amplience-service';
import { HierarchyService } from '../hierarchy-service';

/**
 * Main function to orchestrate hierarchy synchronization
 */
export async function syncHierarchy(): Promise<void> {
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

    const sourceRootItem = await promptForContentItem(sourceService, sourceRepo.id);
    if (!sourceRootItem) {
      console.log('❌ No source root item selected. Aborting.');

      return;
    }
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

    const targetRootItem = await promptForContentItem(targetService, targetRepo.id);
    if (!targetRootItem) {
      console.log('❌ No target root item selected. Aborting.');

      return;
    }
    console.log(`✅ Selected target root: ${targetRootItem.label}\n`);

    // Step 3: Configuration Options
    console.log('⚙️  Step 3: Configuration Options');

    const updateContent = await promptForConfirmation(
      'Update content of existing items (body comparison)?',
      false
    );

    const localeStrategy: LocaleStrategy = await promptForLocaleStrategy(
      targetService,
      targetRepo.id
    );

    const publishAfterSync = await promptForConfirmation(
      'Publish content items after synchronization?',
      true
    );

    const isDryRun = await promptForDryRun();

    console.log(
      `✅ Configuration: ${updateContent ? 'Update content' : 'Structure only'}, Locale: ${localeStrategy.strategy}${localeStrategy.targetLocale ? ` (${localeStrategy.targetLocale})` : ''}, ${publishAfterSync ? 'Publish after sync' : 'No publishing'}, ${isDryRun ? 'DRY RUN' : 'EXECUTE'}\n`
    );

    // Step 4: Build Hierarchies
    console.log('🏗️  Step 4: Building Hierarchies');

    const hierarchyService = new HierarchyService(sourceService);

    console.log('Building source hierarchy...');
    const sourceTree = await hierarchyService.buildHierarchyTree(sourceRootItem.id, sourceRepo.id);

    console.log('Building target hierarchy...');
    const targetHierarchyService = new HierarchyService(targetService);
    const targetTree = await targetHierarchyService.buildHierarchyTree(
      targetRootItem.id,
      targetRepo.id
    );

    // Step 5: Generate Sync Plan
    console.log('\n📋 Step 5: Generating Synchronization Plan');
    const syncPlan = await hierarchyService.generateSyncPlan(sourceTree, targetTree, updateContent);

    // Step 6: Display Plan and Confirm
    hierarchyService.displaySyncPlan(syncPlan);

    if (syncPlan.itemsToCreate.length === 0 && syncPlan.itemsToRemove.length === 0) {
      console.log('✅ Synchronization complete - no changes needed!');

      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETE - No changes were made.');

      return;
    }

    const shouldProceed = await promptForConfirmation(
      'Do you want to proceed with these changes?',
      false
    );

    if (!shouldProceed) {
      console.log('❌ Operation cancelled by user.');

      return;
    }

    // Step 7: Execute Plan
    console.log('\n🚀 Step 7: Executing Synchronization Plan');
    await executeSyncPlan(
      syncPlan,
      sourceService,
      targetService,
      targetRepo.id,
      localeStrategy,
      publishAfterSync
    );

    console.log('\n✅ Hierarchy synchronization completed successfully!');
  } catch (error) {
    console.error('❌ Error during hierarchy synchronization:', error);
    throw error;
  }
}

/**
 * Execute the synchronization plan
 */
async function executeSyncPlan(
  plan: Amplience.SyncPlan,
  _sourceService: AmplienceService,
  targetService: AmplienceService,
  targetRepositoryId: string,
  localeStrategy: LocaleStrategy,
  publishAfterSync: boolean
): Promise<void> {
  let successCount = 0;
  let failureCount = 0;

  // Track mapping between source IDs and newly created target IDs
  const sourceToTargetIdMap = new Map<string, string>();

  // Track IDs of successfully created items for publishing
  const createdItemIds: string[] = [];

  // Execute removals first
  if (plan.itemsToRemove.length > 0) {
    console.log(`\n🗑️  Removing ${plan.itemsToRemove.length} items...`);
    const removeProgress = createProgressBar(plan.itemsToRemove.length, 'Removing items');
    removeProgress.start(plan.itemsToRemove.length, 0);

    for (const item of plan.itemsToRemove) {
      try {
        // For now, we'll archive the item directly (moving to __deleted folder would require additional implementation)
        await targetService.archiveContentItem(item.targetItem!.id, item.targetItem!.version);
        successCount++;
        console.log(`  ✅ Archived: ${item.targetItem!.label}`);
      } catch (error) {
        failureCount++;
        console.log(`  ❌ Failed to archive: ${item.targetItem!.label} - ${error}`);
      }
      removeProgress.increment();
    }
    removeProgress.stop();
  }

  // Execute creations (order is important - we need to create parents before children)
  if (plan.itemsToCreate.length > 0) {
    console.log(`\n🆕 Creating ${plan.itemsToCreate.length} items...`);

    // Sort items by hierarchy depth to ensure parents are created before children
    const sortedItems = sortItemsByHierarchyDepth(plan.itemsToCreate);

    const createProgress = createProgressBar(sortedItems.length, 'Creating items');
    createProgress.start(sortedItems.length, 0);

    for (const item of sortedItems) {
      try {
        // Transform delivery key based on locale strategy
        const transformedBody = transformDeliveryKey(item.sourceItem.body, localeStrategy);

        // Determine the correct target parent ID
        let actualTargetParentId: string | null = null;

        if (item.targetParentId) {
          // Check if this is a mapped ID (newly created parent)
          if (sourceToTargetIdMap.has(item.targetParentId)) {
            actualTargetParentId = sourceToTargetIdMap.get(item.targetParentId)!;
          } else {
            // This should be an existing target item ID
            actualTargetParentId = item.targetParentId;
          }
        }

        // Set up hierarchy relationship in the body
        if (actualTargetParentId) {
          // Ensure _meta object exists
          if (!transformedBody._meta) {
            transformedBody._meta = {};
          }

          // Set hierarchy relationship
          transformedBody._meta.hierarchy = {
            root: false,
            parentId: actualTargetParentId,
          };
        } else {
          // This is a root item
          if (!transformedBody._meta) {
            transformedBody._meta = {};
          }
          transformedBody._meta.hierarchy = {
            root: true,
            parentId: null,
          };
        }

        // Create the content item request (no folderId for hierarchy relationships)
        const createRequest: Amplience.CreateContentItemRequest = {
          body: transformedBody,
          label: item.sourceItem.label,
        };

        // Create the content item
        const result = await targetService.createContentItem(targetRepositoryId, createRequest);

        if (result.success && result.updatedItem) {
          // Store the mapping between source ID and newly created target ID
          sourceToTargetIdMap.set(item.sourceItem.id, result.updatedItem.id);

          // Track created item for publishing
          createdItemIds.push(result.updatedItem.id);

          successCount++;
          console.log(`  ✅ Created: ${item.sourceItem.label}`);
        } else {
          failureCount++;
          console.log(
            `  ❌ Failed to create: ${item.sourceItem.label} - ${result.error || 'Unknown error'}`
          );
        }
      } catch (error) {
        failureCount++;
        console.log(`  ❌ Failed to create: ${item.sourceItem.label} - ${error}`);
      }
      createProgress.increment();
    }
    createProgress.stop();
  }

  console.log(`\n📊 Execution Summary:`);
  console.log(`  ✅ Successful operations: ${successCount}`);
  console.log(`  ❌ Failed operations: ${failureCount}`);
  console.log(
    `  📈 Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`
  );

  // Step 8: Bulk Publishing (if enabled and items were created)
  if (publishAfterSync && createdItemIds.length > 0) {
    console.log(`\n📤 Step 8: Publishing ${createdItemIds.length} created items...`);

    const publishProgress = createProgressBar(createdItemIds.length, 'Publishing items');
    publishProgress.start(createdItemIds.length, 0);

    let publishSuccessCount = 0;
    let publishFailureCount = 0;

    for (const itemId of createdItemIds) {
      try {
        const publishResult = await targetService.publishContentItem(itemId);
        if (publishResult.success) {
          publishSuccessCount++;
        } else {
          publishFailureCount++;
          console.log(
            `  ❌ Failed to publish item ${itemId}: ${publishResult.error || 'Unknown error'}`
          );
        }
      } catch (error) {
        publishFailureCount++;
        console.log(`  ❌ Failed to publish item ${itemId}: ${error}`);
      }
      publishProgress.increment();
    }

    publishProgress.stop();

    console.log(`\n📤 Publishing Summary:`);
    console.log(`  ✅ Successfully published: ${publishSuccessCount}`);
    console.log(`  ❌ Failed to publish: ${publishFailureCount}`);
    console.log(
      `  📈 Publishing success rate: ${((publishSuccessCount / (publishSuccessCount + publishFailureCount)) * 100).toFixed(1)}%`
    );
  }
}

/**
 * Sort items by hierarchy depth to ensure parents are created before children
 */
function sortItemsByHierarchyDepth(items: Amplience.SyncItem[]): Amplience.SyncItem[] {
  // Create a map to track parent-child relationships
  const parentChildMap = new Map<string, string[]>();
  const itemMap = new Map<string, Amplience.SyncItem>();

  // Initialize maps
  items.forEach(item => {
    itemMap.set(item.sourceItem.id, item);
    parentChildMap.set(item.sourceItem.id, []);
  });

  // Build parent-child relationships
  items.forEach(item => {
    const parentId = item.targetParentId;
    if (parentId && parentChildMap.has(parentId)) {
      parentChildMap.get(parentId)!.push(item.sourceItem.id);
    }
  });

  // Perform topological sort to get correct order
  const visited = new Set<string>();
  const sorted: Amplience.SyncItem[] = [];

  function visit(itemId: string): void {
    if (visited.has(itemId)) return;

    visited.add(itemId);
    const item = itemMap.get(itemId);
    if (item) {
      sorted.push(item);

      // Visit children
      const children = parentChildMap.get(itemId) || [];
      children.forEach(childId => visit(childId));
    }
  }

  // Start with items that don't have parents in the create list (roots of subtrees)
  items.forEach(item => {
    const hasParentInCreateList = items.some(other => other.sourceItem.id === item.targetParentId);
    if (!hasParentInCreateList && !visited.has(item.sourceItem.id)) {
      visit(item.sourceItem.id);
    }
  });

  // Handle any remaining items (shouldn't happen with a proper hierarchy)
  items.forEach(item => {
    if (!visited.has(item.sourceItem.id)) {
      visit(item.sourceItem.id);
    }
  });

  return sorted;
}

/**
 * Transform delivery key based on locale strategy
 */
function transformDeliveryKey(body: Amplience.Body, strategy: LocaleStrategy): Amplience.Body {
  const transformedBody = { ...body };

  if (!transformedBody._meta?.deliveryKey) {
    return transformedBody;
  }

  const currentDeliveryKey = transformedBody._meta.deliveryKey;

  switch (strategy.strategy) {
    case 'keep':
      // No transformation needed
      break;

    case 'remove': {
      // Remove locale prefix (assuming format like "en-GB-content-name")
      const withoutLocale = currentDeliveryKey.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
      transformedBody._meta!.deliveryKey = withoutLocale;
      break;
    }

    case 'replace': {
      if (strategy.targetLocale) {
        // Replace locale prefix
        const withoutLocale = currentDeliveryKey.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
        transformedBody._meta!.deliveryKey = `${strategy.targetLocale}-${withoutLocale}`;
      }
      break;
    }
  }

  return transformedBody;
}

/**
 * Interface for locale transformation strategy
 */
type LocaleStrategy = {
  strategy: 'keep' | 'remove' | 'replace';
  targetLocale?: string;
}
