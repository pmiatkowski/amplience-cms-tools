import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForFilters,
  promptForConfirmation,
  promptForLocale,
} from '~/prompts';
import { AmplienceService } from '~/services/amplience-service';
import { filterContentItems } from '~/services/filter-service';
import { createProgressBar, displayTable } from '~/utils';
import { promptForPublishUpdatedItems } from './prompts';
import { generateNewDeliveryKey } from './utils';

// For displayTable, use Record<string, unknown> for preview rows
type UpdatePreviewRow = Record<string, unknown>;

export async function runUpdateDeliveryKeysLocale(): Promise<void> {
  // 1. Load hub configs
  const hubs = getHubConfigs();
  // 2. Select hub
  const selectedHub = await promptForHub(hubs);
  const service = new AmplienceService(selectedHub);
  // 3. Get repositories
  const repos = await service.getRepositories();
  const selectedRepo = await promptForRepository(repos);
  // 4. Prompt for filters
  const filters = await promptForFilters();

  // 5. Fetch all content items with progress bar
  console.info('Fetching content items...');
  const items: Amplience.ContentItem[] = await service.getAllContentItems(
    selectedRepo.id,
    () => {}
  );

  // 6. Filter items
  const filtered = filterContentItems(items, filters);

  // 7. Prompt for new locale (for preview)
  const newLocale = await promptForLocale();
  // 8. Prepare preview rows
  const previewRows: UpdatePreviewRow[] = filtered.map(item => ({
    id: item.id,
    label: item.label,
    oldDeliveryKey: item.body?._meta?.deliveryKey ?? '',
    newDeliveryKey: generateNewDeliveryKey({
      newLocale,
      oldKey: item.body?._meta?.deliveryKey ?? undefined,
      placement: filters?.localePlacement || 'prefix',
    }),
    status: item.status,
    publishingStatus: item.publishingStatus,
    validStatus: item.validationState,
    schemaId: item.body._meta?.schema || '',
  }));
  // 9. Show preview table
  displayTable(previewRows);
  // 10. Confirm
  const confirmed = await promptForConfirmation();
  if (!confirmed) {
    console.log('Operation cancelled.');

    return;
  }

  // 12. Update items with progress bar
  const bar = createProgressBar(filtered.length, 'Updating delivery keys');
  const skipped = [] as string[];
  const successfullyUpdated = [] as string[];
  let success = 0;
  let failed = 0;
  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i];
    const oldKey = item.body?._meta?.deliveryKey || '';
    const newKey = generateNewDeliveryKey({
      oldKey,
      newLocale,
      placement: filters?.localePlacement || 'prefix',
    });

    if (newKey === oldKey) {
      console.warn(`Skipping item ${item.id} as delivery key is unchanged: ${newKey}`);
      skipped.push(newKey);
      bar.increment();
      continue;
    }

    const result = await service.updateDeliveryKey(item.id, item.version || 1, newKey);
    if (result.success) {
      success++;
      successfullyUpdated.push(item.id);
    } else {
      failed++;
      console.error(`Failed to update item ${item.id}: ${result.error}`);
    }
    bar.increment();
  }
  bar.stop();
  console.log(
    `Update complete. Success: ${success}, Failed: ${failed}, Skipped: ${skipped.length}`
  );
  if (skipped.length > 0) {
    console.warn(`Skipped items: ${skipped.join(', ')}`);
  }

  // 13. Offer to publish successfully updated items (US-008)
  if (successfullyUpdated.length > 0) {
    console.log(`\n${successfullyUpdated.length} items were successfully updated.`);
    const shouldPublish = await promptForPublishUpdatedItems(successfullyUpdated.length);

    if (shouldPublish) {
      const publishBar = createProgressBar(successfullyUpdated.length, 'Publishing items');
      let publishSuccess = 0;
      let publishFailed = 0;

      for (const itemId of successfullyUpdated) {
        const publishResult = await service.publishContentItem(itemId);
        if (publishResult.success) {
          publishSuccess++;
        } else {
          publishFailed++;
          console.error(`Failed to publish item ${itemId}: ${publishResult.error}`);
        }
        publishBar.increment();
      }
      publishBar.stop();

      console.log(`Publishing complete. Success: ${publishSuccess}, Failed: ${publishFailed}`);
    } else {
      console.log('Publishing skipped by user.');
    }
  }

  console.log('Operation completed successfully.');
}
