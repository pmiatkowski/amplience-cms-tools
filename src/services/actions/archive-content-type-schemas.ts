import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForConfirmation,
  promptForSchemaIdFilter,
  promptForIncludeArchived,
  promptForSchemasToArchive,
} from '~/prompts';
import { createProgressBar } from '~/utils';
import { AmplienceService } from '../amplience-service';
import { archiveContentItem } from './archive-content-item';
import { archiveContentItemWithDescendants } from './archive-content-item-with-descendants';

/**
 * Archive content type schemas and their dependencies
 */
export async function archiveContentTypeSchemas(): Promise<void> {
  try {
    console.log('\n🗂️ Archive Content Type Schemas\n');

    // Step 1: Hub selection and service initialization
    const hubs = getHubConfigs();
    const selectedHub = await promptForHub(hubs);
    const amplienceService = new AmplienceService(selectedHub);

    console.log(`\n📡 Connected to hub: ${selectedHub.name}\n`);

    // Step 2: Get filter options
    const includeArchived = await promptForIncludeArchived();
    const schemaIdFilter = await promptForSchemaIdFilter();

    // Step 3: Fetch and filter schemas
    console.log('🔍 Fetching content type schemas...');
    const allSchemas = await amplienceService.getAllSchemas(includeArchived);

    // Apply regex filter if provided
    let filteredSchemas = allSchemas;
    if (schemaIdFilter.trim()) {
      try {
        const regex = new RegExp(schemaIdFilter, 'i');
        filteredSchemas = allSchemas.filter(schema => regex.test(schema.schemaId));
      } catch {
        console.error('❌ Invalid regex pattern:', schemaIdFilter);

        return;
      }
    }

    if (filteredSchemas.length === 0) {
      console.log('ℹ️ No schemas found matching the criteria.');

      return;
    }

    console.log(`\n📋 Found ${filteredSchemas.length} schemas matching criteria`);

    // Step 4: User selects schemas to archive
    const selectedSchemas = await promptForSchemasToArchive(filteredSchemas);

    if (selectedSchemas.length === 0) {
      console.log('ℹ️ No schemas selected for archiving.');

      return;
    }

    console.log(`\n✅ Selected ${selectedSchemas.length} schemas for archiving`);

    // Step 5: Find dependent content types
    console.log('\n🔍 Searching for dependent content types...');
    const schemaIds = selectedSchemas.map(s => s.schemaId);
    const dependentContentTypes = await amplienceService.getContentTypesBySchemas(schemaIds);

    let archiveContentTypes = false;
    let archiveContentItems = false;

    if (dependentContentTypes.length > 0) {
      console.log(`\n📋 Found ${dependentContentTypes.length} content types using these schemas:`);
      dependentContentTypes.forEach(ct => {
        console.log(`  - ${ct.hubContentTypeId} (${ct.contentTypeUri})`);
      });

      archiveContentTypes = await promptForConfirmation(
        'Do you want to archive these content types as well?'
      );

      // Step 6: Find dependent content items if content types will be archived
      if (archiveContentTypes) {
        console.log('\n🔍 Searching for dependent content items...');
        const dependentContentItems = await amplienceService.getContentItemsBySchemas(schemaIds);

        if (dependentContentItems.length > 0) {
          console.log(
            `\n📋 Found ${dependentContentItems.length} content items using these schemas`
          );

          archiveContentItems = await promptForConfirmation(
            `Do you want to archive these ${dependentContentItems.length} content items as well?`
          );

          // Step 7: Archive content items
          if (archiveContentItems) {
            const confirmArchiveItems = await promptForConfirmation(
              `⚠️ This will archive ${dependentContentItems.length} content items. This action cannot be undone. Are you sure?`
            );

            if (confirmArchiveItems) {
              console.log('\n🗃️ Archiving content items...');
              const progressBar = createProgressBar(
                dependentContentItems.length,
                'Archiving items'
              );

              let successCount = 0;
              let failureCount = 0;

              for (const item of dependentContentItems) {
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
                    console.error(`\n❌ Could not find repository for item ${item.id}`);
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
                      console.error(`\n❌ Failed to archive hierarchical item ${item.id}`);
                    }
                  } else {
                    // Non-hierarchical item - use archiveContentItem
                    const result = await archiveContentItem(amplienceService, item);
                    if (result.overallSuccess) {
                      successCount++;
                    } else {
                      failureCount++;
                      console.error(`\n❌ Failed to archive item ${item.id}`);
                    }
                  }
                } catch (error) {
                  failureCount++;
                  console.error(`\n❌ Error archiving item ${item.id}:`, error);
                }

                progressBar.increment();
              }

              progressBar.stop();
              console.log(
                `\n✅ Content items archiving complete: ${successCount} successful, ${failureCount} failed`
              );
            } else {
              console.log('ℹ️ Content items archiving cancelled.');
              archiveContentItems = false;
            }
          }
        } else {
          console.log('ℹ️ No content items found using these schemas.');
        }
      }
    } else {
      console.log('ℹ️ No content types found using these schemas.');
    }

    // Step 8: Archive content types
    if (archiveContentTypes && dependentContentTypes.length > 0) {
      const confirmArchiveTypes = await promptForConfirmation(
        `⚠️ This will archive ${dependentContentTypes.length} content types. Are you sure?`
      );

      if (confirmArchiveTypes) {
        console.log('\n🗃️ Archiving content types...');
        const progressBar = createProgressBar(dependentContentTypes.length, 'Archiving types');

        let successCount = 0;
        let failureCount = 0;

        for (const contentType of dependentContentTypes) {
          const result = await amplienceService.archiveContentType(contentType.id);

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            console.error(`\n❌ Failed to archive content type ${contentType.id}: ${result.error}`);
          }

          progressBar.increment();
        }

        progressBar.stop();
        console.log(
          `\n✅ Content types archiving complete: ${successCount} successful, ${failureCount} failed`
        );
      } else {
        console.log('ℹ️ Content types archiving cancelled.');
      }
    }

    // Step 9: Archive schemas
    const confirmArchiveSchemas = await promptForConfirmation(
      `⚠️ This will archive ${selectedSchemas.length} content type schemas. Are you sure?`
    );

    if (confirmArchiveSchemas) {
      console.log('\n🗃️ Archiving content type schemas...');
      const progressBar = createProgressBar(selectedSchemas.length, 'Archiving schemas');

      let successCount = 0;
      let failureCount = 0;

      for (const schema of selectedSchemas) {
        const result = await amplienceService.archiveSchema(schema.id, schema.version);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(`\n❌ Failed to archive schema ${schema.schemaId}: ${result.error}`);
        }

        progressBar.increment();
      }

      progressBar.stop();
      console.log(
        `\n✅ Schemas archiving complete: ${successCount} successful, ${failureCount} failed`
      );
    } else {
      console.log('ℹ️ Schemas archiving cancelled.');
    }

    console.log('\n🎉 Archive operation completed!');
  } catch (error) {
    console.error('\n❌ Error during archive operation:', error);
    process.exit(1);
  }
}
