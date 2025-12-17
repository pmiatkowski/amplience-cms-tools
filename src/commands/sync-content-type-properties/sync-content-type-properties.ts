import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForConfirmation,
  promptForSchemaIdFilter,
  promptForContentTypeStatus,
  type ContentTypeStatusFilter,
} from '~/prompts';
import { createProgressBar, checkDcCliAvailability, createDcCliCommand } from '~/utils';

type ContentType = {
  id: string;
  hubContentTypeId: string;
  contentTypeUri: string;
  status: 'ACTIVE' | 'ARCHIVED';
  settings?: {
    label?: string;
  };
};

type SyncContext = {
  targetHub: Amplience.HubConfig;
  schemaIdFilter?: string; // Optional regex filter for schema URIs
  statusFilter?: ContentTypeStatusFilter; // Filter by content type status
  skipConfirmations?: boolean; // Skip user confirmation prompts
};

type SyncResult = {
  success: boolean; // Overall operation success
  processedContentTypes: string[]; // Successfully processed content type IDs
  failedContentTypes: { contentTypeId: string; error: string }[]; // Failed content types with errors
  totalCount: number; // Total number of content types processed
};
type SyncContentTypePropertiesOptions = {
  context?: SyncContext;
};

/**
 * Main command function for interactive synchronization
 */
export async function runSyncContentTypeProperties(): Promise<void> {
  console.log('\n🔄 Sync Content Type Properties');
  console.log('This command synchronizes content types with their schemas on a target hub.\n');

  await syncContentTypeProperties();
}

/**
 * Reusable function to sync content type properties with their schemas
 * Can be called programmatically with a context object
 */
export const syncContentTypeProperties = async (
  options?: SyncContentTypePropertiesOptions
): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    processedContentTypes: [],
    failedContentTypes: [],
    totalCount: 0,
  };

  try {
    // 0. Check dc-cli availability
    console.log('Checking local dc-cli availability...');
    const isDcCliAvailable = await checkDcCliAvailability();
    if (!isDcCliAvailable) {
      console.error(
        '❌ dc-cli is not available locally. Please run: npm install @amplience/dc-cli'
      );
      result.success = false;

      return result;
    }
    console.log('✅ Local dc-cli is available');

    // 1. Hub selection - use context if provided, otherwise interactive selection
    const hubs = getHubConfigs();
    if (hubs.length === 0) {
      console.error('No hubs configured. Please check your .env file.');
      result.success = false;

      return result;
    }

    let targetHub: Amplience.HubConfig;

    if (options?.context?.targetHub) {
      targetHub = options.context.targetHub;
      console.log(`Using provided hub: ${targetHub.name}`);
    } else {
      console.log('Select the TARGET hub:');
      targetHub = await promptForHub(hubs);
    }

    // 2. Configuration options - use context if provided, otherwise interactive prompts
    let schemaIdFilter = '';
    let statusFilter: ContentTypeStatusFilter = 'ACTIVE';

    if (options?.context) {
      // Use context configuration
      schemaIdFilter = options.context.schemaIdFilter || '';
      statusFilter = options.context.statusFilter || 'ACTIVE';
      if (schemaIdFilter) {
        console.log(`🎯 Filtering by schema pattern: ${schemaIdFilter}`);
      }
      console.log(`📊 Status filter: ${statusFilter}`);
    } else {
      // Interactive configuration
      schemaIdFilter = await promptForSchemaIdFilter();
      statusFilter = await promptForContentTypeStatus();
    }

    // 3. List content types from the hub
    console.log(`\n🔍 Listing content types from ${targetHub.name}...`);
    const listResult = await createDcCliCommand()
      .withHub(targetHub)
      .withCommand('content-type list')
      .withArg('--json')
      .execute();

    let contentTypes: ContentType[] = [];
    try {
      contentTypes = JSON.parse(listResult.stdout);
    } catch {
      console.error('❌ Failed to parse content types list');
      result.success = false;

      return result;
    }

    console.log(`📂 Found ${contentTypes.length} total content types`);

    // 4. Filter by status
    let filteredContentTypes = contentTypes;
    if (statusFilter === 'ACTIVE') {
      filteredContentTypes = contentTypes.filter(ct => ct.status === 'ACTIVE');
    } else if (statusFilter === 'ARCHIVED') {
      filteredContentTypes = contentTypes.filter(ct => ct.status === 'ARCHIVED');
    }
    // If statusFilter === 'ALL', keep all content types

    console.log(
      `📊 After status filter (${statusFilter}): ${filteredContentTypes.length} content types`
    );

    // 5. Filter by schema ID pattern if provided
    if (schemaIdFilter.trim()) {
      console.log(`🔍 Applying schema ID filter: ${schemaIdFilter}`);
      const regex = new RegExp(schemaIdFilter, 'i'); // case insensitive
      filteredContentTypes = filteredContentTypes.filter(ct => regex.test(ct.contentTypeUri));
      console.log(`✅ After schema filter: ${filteredContentTypes.length} content types`);
    }

    if (filteredContentTypes.length === 0) {
      console.warn('No content types found matching the criteria.');
      result.success = false;

      return result;
    }

    // 6. Confirmation
    if (!options?.context?.skipConfirmations) {
      console.log(`\n📋 Content types to synchronize (${filteredContentTypes.length}):`);
      filteredContentTypes.forEach(ct => {
        const label = ct.settings?.label || ct.contentTypeUri;
        console.log(`  • ${label} (${ct.contentTypeUri}) [${ct.status}]`);
      });

      const confirmed = await promptForConfirmation(
        `\nProceed with synchronizing ${filteredContentTypes.length} content types on "${targetHub.name}"?`
      );
      if (!confirmed) {
        console.log('Operation cancelled by user.');
        result.success = false;

        return result;
      }
    }

    // 7. Sync each content type
    console.log(`\n🚀 Synchronizing ${filteredContentTypes.length} content types...`);
    const progressBar = createProgressBar(filteredContentTypes.length, 'Syncing content types');

    for (const contentType of filteredContentTypes) {
      try {
        await createDcCliCommand()
          .withHub(targetHub)
          .withCommand('content-type sync')
          .withArgs(contentType.id, '--json')
          .execute();

        result.processedContentTypes.push(contentType.id);
        progressBar.increment();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failedContentTypes.push({
          contentTypeId: contentType.id,
          error: errorMessage,
        });
        progressBar.increment();
      }
    }

    progressBar.stop();

    result.totalCount = filteredContentTypes.length;
    result.success = result.failedContentTypes.length === 0;

    // 8. Display results
    console.log('\n✅ Synchronization completed!');
    console.log(`\nResults Summary:`);
    console.log(`• Content types synchronized: ${result.processedContentTypes.length}`);
    console.log(`• Content types failed: ${result.failedContentTypes.length}`);

    if (result.failedContentTypes.length > 0) {
      console.log('\n❌ Failed content types:');
      result.failedContentTypes.forEach(failed => {
        console.log(`  • ${failed.contentTypeId}: ${failed.error}`);
      });
    }

    return result;
  } catch (error) {
    console.error(`Failed to sync content type properties: ${error}`);
    result.success = false;
    result.failedContentTypes.push({
      contentTypeId: 'unknown',
      error: error instanceof Error ? error.message : String(error),
    });

    return result;
  }
};
