import { createProgressBar } from '~/utils';
import { AmplienceService } from '../amplience-service';
import { archiveContentItem } from './archive-content-item';
import { archiveContentItemWithDescendants } from './archive-content-item-with-descendants';

/**
 * Archive Content Type Schemas Action
 *
 * This action contains the pure business logic for archiving content type schemas
 * and their dependencies. It operates without any UI dependencies and can be
 * easily tested and reused in different contexts.
 *
 * The archiving process follows dependency order:
 * 1. Archive dependent content items (maintains hierarchy integrity)
 * 2. Archive dependent content types
 * 3. Archive the content type schemas
 *
 * @param options - Configuration object containing hub, schemas, and operation settings
 * @throws {Error} When API operations fail or invalid data is provided
 *
 * @example
 * ```typescript
 * await archiveContentTypeSchemas({
 *   hub: selectedHub,
 *   selectedSchemas: [schema1, schema2],
 *   includeArchived: false,
 *   isDryRun: true
 * });
 * ```
 */
export async function archiveContentTypeSchemas(
  options: ArchiveContentTypeSchemasOptions
): Promise<void> {
  const { hub, selectedSchemas, isDryRun } = options;

  try {
    const amplienceService = new AmplienceService(hub);

    console.log(`${isDryRun ? '🔍' : '🚀'} Executing archive operation...`);

    // Step 1: Find dependent content types
    console.log('🔍 Analyzing dependencies...');
    const schemaIds = selectedSchemas.map(s => s.schemaId);
    const dependentContentTypes = await amplienceService.getContentTypesBySchemas(schemaIds);

    // Step 2: Find dependent content items
    const dependentContentItems =
      dependentContentTypes.length > 0
        ? await amplienceService.getContentItemsBySchemas(schemaIds)
        : [];

    if (isDryRun) {
      // Dry run - just report what would be archived
      console.log('\n� DRY RUN RESULTS:');
      console.log(`   • Schemas to archive: ${selectedSchemas.length}`);
      console.log(`   • Dependent content types: ${dependentContentTypes.length}`);
      console.log(`   • Dependent content items: ${dependentContentItems.length}`);

      if (dependentContentTypes.length > 0) {
        console.log('\n📋 Content types that would be archived:');
        dependentContentTypes.forEach(ct => {
          console.log(`  - ${ct.hubContentTypeId} (${ct.contentTypeUri})`);
        });
      }

      console.log('\n✅ Dry run completed - no changes made');

      return;
    }

    // Step 3: Archive content items (if any)
    if (dependentContentItems.length > 0) {
      await archiveContentItems(amplienceService, dependentContentItems);
    }

    // Step 4: Archive content types (if any)
    if (dependentContentTypes.length > 0) {
      await archiveContentTypes(amplienceService, dependentContentTypes);
    }

    // Step 5: Archive schemas
    await archiveSchemas(amplienceService, selectedSchemas);

    console.log('✅ Archive operation completed successfully!');
  } catch (error) {
    console.error('❌ Error during archive operation:', error);
    throw error;
  }
}

/**
 * Configuration options for the archive content type schemas action
 *
 * @interface ArchiveContentTypeSchemasOptions
 */
export type ArchiveContentTypeSchemasOptions = {
  /** The Amplience hub configuration containing API credentials and settings */
  hub: Amplience.HubConfig;
  /** Array of content type schemas selected for archiving */
  selectedSchemas: Amplience.ContentTypeSchema[];
  /** Whether to include already archived schemas in dependency analysis */
  includeArchived: boolean;
  /** When true, performs a dry-run without making actual changes */
  isDryRun: boolean;
};

/**
 * Helper function to archive content items
 */
async function archiveContentItems(
  amplienceService: AmplienceService,
  items: Amplience.ContentItem[]
): Promise<void> {
  console.log(`🗃️ Archiving ${items.length} content items...`);
  const progressBar = createProgressBar(items.length, 'Archiving items');

  let successCount = 0;
  let failureCount = 0;

  for (const item of items) {
    try {
      // Get repository ID for the item
      const repositories = await amplienceService.getRepositories();
      let repositoryId = '';

      // Find repository that contains this content item
      for (const repo of repositories) {
        const repoItems = await amplienceService.getContentItemsBy(
          repo.id,
          item.body._meta?.schema || ''
        );
        if (repoItems.some(repoItem => repoItem.id === item.id)) {
          repositoryId = repo.id;
          break;
        }
      }

      if (!repositoryId) {
        failureCount++;
        console.error(`❌ Could not find repository for item ${item.id}`);
        progressBar.increment();
        continue;
      }

      // Check if item is part of hierarchy
      if (item.hierarchy && !item.hierarchy.root) {
        // Hierarchical item - use archiveContentItemWithDescendants
        const results = await archiveContentItemWithDescendants(
          amplienceService,
          item,
          repositoryId
        );
        if (results.every(r => r.overallSuccess)) {
          successCount++;
        } else {
          failureCount++;
          console.error(`❌ Failed to archive hierarchical item ${item.id}`);
        }
      } else {
        // Non-hierarchical item - use archiveContentItem
        const result = await archiveContentItem(amplienceService, item);
        if (result.overallSuccess) {
          successCount++;
        } else {
          failureCount++;
          console.error(`❌ Failed to archive item ${item.id}`);
        }
      }
    } catch (error) {
      failureCount++;
      console.error(`❌ Error archiving item ${item.id}:`, error);
    }

    progressBar.increment();
  }

  progressBar.stop();
  console.log(
    `✅ Content items archiving complete: ${successCount} successful, ${failureCount} failed`
  );
}

/**
 * Helper function to archive content types
 */
async function archiveContentTypes(
  amplienceService: AmplienceService,
  contentTypes: Amplience.ContentType[]
): Promise<void> {
  console.log(`🗃️ Archiving ${contentTypes.length} content types...`);
  const progressBar = createProgressBar(contentTypes.length, 'Archiving types');

  let successCount = 0;
  let failureCount = 0;

  for (const contentType of contentTypes) {
    const result = await amplienceService.archiveContentType(contentType.id);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      console.error(`❌ Failed to archive content type ${contentType.id}: ${result.error}`);
    }

    progressBar.increment();
  }

  progressBar.stop();
  console.log(
    `✅ Content types archiving complete: ${successCount} successful, ${failureCount} failed`
  );
}

/**
 * Helper function to archive schemas
 */
async function archiveSchemas(
  amplienceService: AmplienceService,
  schemas: Amplience.ContentTypeSchema[]
): Promise<void> {
  console.log(`🗃️ Archiving ${schemas.length} content type schemas...`);
  const progressBar = createProgressBar(schemas.length, 'Archiving schemas');

  let successCount = 0;
  let failureCount = 0;

  for (const schema of schemas) {
    const result = await amplienceService.archiveSchema(schema.id, schema.version);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      console.error(`❌ Failed to archive schema ${schema.schemaId}: ${result.error}`);
    }

    progressBar.increment();
  }

  progressBar.stop();
  console.log(`✅ Schemas archiving complete: ${successCount} successful, ${failureCount} failed`);
}
