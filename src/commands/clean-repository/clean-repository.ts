import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForCleanupFilters,
  promptForItemsToClean,
  promptForConfirmation,
} from '~/prompts';
import {
  archiveContentItem,
  archiveContentItemWithDescendants,
  ensureDeletedFolder,
} from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { filterContentItems } from '~/services/filter-service';
import { createProgressBar, displayTable } from '~/utils';
import { promptForIncludeHierarchyDescendants } from './prompts';

type CleanupPreviewRow = Record<string, unknown>;

export async function runCleanRepository(): Promise<void> {
  // 1. Load hub configs
  const hubs = getHubConfigs();

  // 2. Select hub
  const selectedHub = await promptForHub(hubs);
  const service = new AmplienceService(selectedHub);

  // 3. Get repositories
  const repos = await service.getRepositories();
  const selectedRepo = await promptForRepository(repos);

  // 4. Prompt for filters
  const filters = await promptForCleanupFilters();

  // 5. Prompt for hierarchy handling options
  const includeHierarchyDescendants = await promptForIncludeHierarchyDescendants();

  // 5. Fetch all content items with progress bar
  console.info('Fetching content items...');

  // Include all statuses that user selected in filters to ensure we fetch them
  const statusesToFetch =
    filters.status && filters.status.length > 0
      ? filters.status
      : ['ACTIVE', 'INACTIVE', 'ARCHIVED']; // Default to all statuses if none specified

  const items: Amplience.ContentItem[] = await service.getAllContentItems(
    selectedRepo.id,
    () => {},
    { status: statusesToFetch as Amplience.ContentStatus[] }
  );

  // 6. Filter items
  const filtered = filterContentItems(items, filters);

  if (filtered.length === 0) {
    console.log('No items found matching the filter criteria.');

    return;
  }

  // 7. Prepare preview rows
  const previewRows: CleanupPreviewRow[] = filtered.map(item => ({
    id: item.id,
    label: item.label,
    deliveryKey: item.body?._meta?.deliveryKey ?? '',
    status: item.status,
    publishingStatus: item.publishingStatus,
    schemaId: item.body._meta?.schema || '',
  }));

  // 8. Show preview table
  console.log(`\nFound ${filtered.length} items matching your criteria:`);
  displayTable(previewRows);

  // 9. Ask if user wants to proceed to selection
  const shouldProceed = await promptForConfirmation(
    'Do you want to proceed to select items for cleanup?'
  );
  if (!shouldProceed) {
    console.log('Operation cancelled.');

    return;
  }

  // 10. Interactive item selection
  const selectedItemIds = await promptForItemsToClean(filtered);

  if (selectedItemIds.length === 0) {
    console.log('No items selected for cleanup.');

    return;
  }

  // 11. Final confirmation
  console.log(`\nYou have selected ${selectedItemIds.length} items for cleanup.`);
  console.log(
    'The cleanup process will: unarchive (if needed) → move to __deleted folder → clear delivery key → unpublish → archive'
  );
  if (includeHierarchyDescendants) {
    console.log(
      '⚠️  Hierarchy descendants will also be cleaned if any of the selected items have child items.'
    );
  }
  const finalConfirm = await promptForConfirmation(
    'Are you sure you want to proceed with the cleanup?'
  );
  if (!finalConfirm) {
    console.log('Operation cancelled.');

    return;
  }

  // 12. Execute cleanup process
  console.log('\nStarting cleanup process...');

  // Ensure the __deleted folder exists
  console.log('Ensuring __deleted folder exists...');
  const deletedFolder = await ensureDeletedFolder(service, selectedRepo.id, '__deleted');
  if (!deletedFolder.success) {
    console.error(`❌ Failed to ensure deleted folder exists: ${deletedFolder.error}`);

    return;
  }
  console.log(`✅ __deleted folder ready (ID: ${deletedFolder.folderId})`);

  const selectedItems = filtered.filter(item => selectedItemIds.includes(item.id));
  const allResults: Awaited<ReturnType<typeof archiveContentItem>>[] = [];
  const progressBar = createProgressBar(selectedItems.length, 'Cleaning items');

  for (const item of selectedItems) {
    let itemResults: Awaited<ReturnType<typeof archiveContentItem>>[];

    if (includeHierarchyDescendants) {
      // Use the function that handles hierarchy descendants
      itemResults = await archiveContentItemWithDescendants(service, item, selectedRepo.id, {
        clearDeliveryKey: true,
        unpublishIfNeeded: true,
        unarchiveIfNeeded: true,
        moveToDeletedFolder: true,
        deletedFolderId: deletedFolder.folderId!,
        moveToRoot: false, // Don't move to root when moving to deleted folder
      });
    } else {
      // Use the original function for single item
      const itemResult = await archiveContentItem(service, item, {
        clearDeliveryKey: true,
        unpublishIfNeeded: true,
        unarchiveIfNeeded: true,
        moveToDeletedFolder: true,
        deletedFolderId: deletedFolder.folderId!,
        moveToRoot: false, // Don't move to root when moving to deleted folder
      });
      itemResults = [itemResult];
    }

    // Check if any item failed
    const hasFailures = itemResults.some(result => !result.overallSuccess);
    if (hasFailures) {
      // Log error but continue with next item
      console.log(
        `\nItem ${item.id} (${item.label}) or its descendants failed during cleanup process`
      );
    }

    allResults.push(...itemResults);
    progressBar.increment();
  }

  progressBar.stop();

  // 13. Display summary
  const successful = allResults.filter(r => r.overallSuccess).length;
  const failed = allResults.length - successful;

  console.log(`\nCleanup complete!`);
  console.log(`✅ Successfully cleaned: ${successful} items`);
  console.log(`❌ Failed: ${failed} items`);

  if (failed > 0) {
    console.log('\nFailed items:');
    allResults
      .filter((r: Awaited<ReturnType<typeof archiveContentItem>>) => !r.overallSuccess)
      .forEach((r: Awaited<ReturnType<typeof archiveContentItem>>) => {
        console.log(`  - ${r.itemId} (${r.label})`);
      });
  }

  // 14. Generate report (basic console output for now)
  console.log('\nDetailed results:');
  allResults.forEach((result: Awaited<ReturnType<typeof archiveContentItem>>) => {
    console.log(`\nItem: ${result.itemId} (${result.label})`);
    console.log(
      `  Unarchive: ${result.unarchiveResult.success ? '✅' : '❌'} ${result.unarchiveResult.error || ''}`
    );
    console.log(
      `  Move to __deleted: ${result.moveToDeletedResult.success ? '✅' : '❌'} ${result.moveToDeletedResult.error || ''}`
    );
    console.log(
      `  Clear Key: ${result.clearKeyResult.success ? '✅' : '❌'} ${result.clearKeyResult.error || ''}`
    );
    console.log(
      `  Unpublish: ${result.unpublishResult.success ? '✅' : '❌'} ${result.unpublishResult.error || ''}`
    );
    console.log(
      `  Archive: ${result.archiveResult.success ? '✅' : '❌'} ${result.archiveResult.error || ''}`
    );
    console.log(`  Overall: ${result.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  });

  console.log('\nCleanup operation completed.');
}
