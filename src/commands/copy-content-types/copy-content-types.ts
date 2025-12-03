import { getHubConfigs } from '~/app-config';
import { promptForHub, promptForConfirmation, promptForValidateSchemas } from '~/prompts';
import { AmplienceService, ContentTypeService } from '~/services';
import { createProgressBar } from '~/utils';
import { copyContentTypeSchemas } from '../copy-content-type-schemas';
import {
  promptForContentTypesToSync,
  promptForRepositoryStrategy,
  promptForRepositoryMapping,
} from './prompts';

/**
 * Main command function for copying content types from source to target hub
 */
export async function runCopyContentTypes(): Promise<void> {
  console.log('\n📋 Copy Content Types');
  console.log('This command will copy content types from a source hub to a target hub.');
  console.log(
    'Note: If you copy schemas first, content types may be automatically created during that process.\n'
  );

  try {
    // Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('No hub configurations found. Please check your .env file.');

      return;
    }

    // === HUB SELECTION ===
    console.log('📂 Select Source Hub:');
    const sourceHub = await promptForHub(hubConfigs);
    const sourceService = new AmplienceService(sourceHub);

    console.log('\n🎯 Select Target Hub:');
    const targetHub = await promptForHub(hubConfigs);
    const targetService = new AmplienceService(targetHub);

    if (sourceHub.hubId === targetHub.hubId) {
      console.error('Source and target hubs cannot be the same.');

      return;
    }

    // Initialize ContentTypeService
    const contentTypeService = new ContentTypeService();

    // === OPTIONAL SCHEMA SYNC ===
    const shouldSyncSchemas = await promptForValidateSchemas();
    if (shouldSyncSchemas) {
      console.log('\n🔄 Running content type schema copy first...');
      try {
        await copyContentTypeSchemas();
        console.log('✅ Content type schema copy completed.');
      } catch (error) {
        console.error(
          '❌ Schema sync failed:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        const continueAnyway = await promptForConfirmation(
          'Continue with content type sync anyway?'
        );
        if (!continueAnyway) {
          console.log('Operation cancelled.');

          return;
        }
      }
    }

    // === IDENTIFY MISSING CONTENT TYPES ===
    console.log('\n🔍 Identifying missing content types...');
    const missingContentTypes = await contentTypeService.getMissingContentTypes(
      sourceService,
      targetService
    );

    if (missingContentTypes.length === 0) {
      console.log('✅ All content types are already synchronized. No action needed.');

      return;
    }

    console.log(`Found ${missingContentTypes.length} content types to sync:`);
    missingContentTypes.forEach(ct => {
      console.log(`  • ${ct.settings?.label || ct.contentTypeUri} (${ct.contentTypeUri})`);
    });

    // === SELECT CONTENT TYPES TO SYNC ===
    const selectedContentTypes = await promptForContentTypesToSync(missingContentTypes);
    if (selectedContentTypes.length === 0) {
      console.log('No content types selected. Operation cancelled.');

      return;
    }

    // === SCHEMA VALIDATION & REMEDIATION ===
    console.log('\n🔍 Validating schemas...');
    const validation = await contentTypeService.validateSchemas(
      targetService,
      selectedContentTypes
    );

    // Handle missing schemas
    if (validation.missingSchemas.length > 0) {
      console.log('\n⚠️  Missing schemas detected:');
      validation.missingSchemas.forEach(schema => {
        console.log(`  • ${schema}`);
      });

      const syncMissingSchemas = await promptForConfirmation(
        'Some content types have missing schemas. Would you like to sync only the missing schemas?'
      );

      if (syncMissingSchemas) {
        console.log('\n🔄 Syncing missing schemas...');

        const syncContext = {
          sourceHub,
          targetHub,
          specificSchemas: validation.missingSchemas, // Use known missing schemas
          skipConfirmations: true, // User already confirmed
          skipValidation: false, // Still validate for safety
        };

        try {
          const result = await copyContentTypeSchemas({ context: syncContext });

          if (result.failedSchemas.length > 0) {
            console.log(`❌ ${result.failedSchemas.length} schemas failed to sync:`);
            result.failedSchemas.forEach(failed => {
              console.log(`  • ${failed.schemaId}: ${failed.error}`);
            });

            const continueAnyway = await promptForConfirmation(
              'Some schemas failed to sync. Continue with content type sync for successful schemas?'
            );

            if (!continueAnyway) {
              console.log('Operation cancelled.');

              return;
            }
          }

          if (result.processedSchemas.length > 0) {
            console.log(`✅ Successfully synced ${result.processedSchemas.length} schemas`);
            console.log(`  • Total processed: ${result.totalCount}`);
          }

          console.log('✅ Missing schemas sync completed.');

          // Wait a moment for schema indexing to complete
          console.log('⏳ Waiting for schema indexing to complete...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Check if content types were already created by the schema sync process
          console.log('🔍 Checking if content types were created during schema sync...');
          const freshTargetService = new AmplienceService(targetHub);
          const updatedMissingContentTypes = await contentTypeService.getMissingContentTypes(
            sourceService,
            freshTargetService
          );

          // Filter selected content types to only include those still missing
          const stillMissingSelected = selectedContentTypes.filter(selected =>
            updatedMissingContentTypes.some(missing => missing.id === selected.id)
          );

          if (stillMissingSelected.length < selectedContentTypes.length) {
            const alreadyCreatedCount = selectedContentTypes.length - stillMissingSelected.length;
            console.log(
              `✅ ${alreadyCreatedCount} content type(s) were automatically created during schema sync.`
            );
          }

          // Re-validate schemas for remaining content types
          if (stillMissingSelected.length > 0) {
            console.log('🔍 Re-validating schemas for remaining content types...');
            const reValidation = await contentTypeService.validateSchemas(
              freshTargetService,
              stillMissingSelected
            );

            if (reValidation.missingSchemas.length > 0 || reValidation.invalidSchemas.length > 0) {
              if (reValidation.missingSchemas.length > 0) {
                console.log('❌ Some schemas are still missing after sync:');
                reValidation.missingSchemas.forEach(schema => {
                  console.log(`  • ${schema}`);
                });
              }
              if (reValidation.invalidSchemas.length > 0) {
                console.log('❌ Some schemas are invalid for content type use:');
                reValidation.invalidSchemas.forEach(schema => {
                  console.log(`  • ${schema}`);
                });
              }
              console.log('Filtering out affected content types.');
            } else {
              console.log('✅ All remaining schemas are now available and valid.');
            }

            // Use only valid content types
            selectedContentTypes.splice(
              0,
              selectedContentTypes.length,
              ...reValidation.validContentTypes
            );
          } else {
            // All content types were created during schema sync
            selectedContentTypes.splice(0, selectedContentTypes.length);
          }
        } catch (error) {
          console.error(
            '❌ Schema sync failed:',
            error instanceof Error ? error.message : 'Unknown error'
          );
          console.log('Proceeding with only content types that have valid schemas.');
          selectedContentTypes.splice(
            0,
            selectedContentTypes.length,
            ...validation.validContentTypes
          );
        }
      } else {
        console.log('Proceeding with only content types that have valid schemas.');
        selectedContentTypes.splice(
          0,
          selectedContentTypes.length,
          ...validation.validContentTypes
        );
      }

      if (selectedContentTypes.length === 0) {
        console.log('✅ All selected content types have been processed. No further action needed.');

        return;
      }
    }

    // Handle invalid schemas (schemas that exist but aren't suitable for content types)
    if (validation.invalidSchemas.length > 0) {
      console.log('\n❌ Invalid schemas detected (not suitable for content type use):');
      validation.invalidSchemas.forEach(schema => {
        console.log(`  • ${schema}`);
      });
      console.log(
        'These content types will be skipped as their schemas cannot be used for content types.'
      );
      console.log(
        'Consider updating the schemas to include required properties (title, description, type=object, allOf extending core content type).'
      );
    }

    console.log(`\n✅ ${selectedContentTypes.length} content types ready for sync.`);

    // === REPOSITORY MAPPING ===
    console.log('\n📋 Repository Mapping:');
    let repositoryStrategy = await promptForRepositoryStrategy();

    let repositoryMap: Map<string, Amplience.ContentRepository[]>;

    if (repositoryStrategy === 'automatic') {
      console.log('\n🔄 Generating automatic repository mapping...');
      repositoryMap = await contentTypeService.generateAutomaticRepositoryMap(
        sourceService,
        targetService,
        selectedContentTypes
      );

      // Display proposed mapping for confirmation
      console.log('\n📋 Proposed automatic mapping:');
      for (const contentType of selectedContentTypes) {
        const targetRepos = repositoryMap.get(contentType.id) || [];
        console.log(`  • ${contentType.settings?.label || contentType.contentTypeUri}:`);
        if (targetRepos.length === 0) {
          console.log('    - No matching repositories found');
        } else {
          targetRepos.forEach(repo => {
            console.log(`    - ${repo.label} (${repo.name})`);
          });
        }
      }

      const confirmAutoMapping = await promptForConfirmation('Accept this automatic mapping?');
      if (!confirmAutoMapping) {
        console.log('Automatic mapping rejected. Switching to manual mapping.');
        repositoryStrategy = 'manual';
      }
    }

    if (repositoryStrategy === 'manual') {
      console.log('\n🎯 Manual repository mapping:');
      repositoryMap = new Map();

      // Get all target repositories once
      const targetRepositories = await targetService.getRepositories();
      if (targetRepositories.length === 0) {
        console.error('No repositories found in the target hub.');

        return;
      }

      for (const contentType of selectedContentTypes) {
        const selectedRepos = await promptForRepositoryMapping(contentType, targetRepositories);
        repositoryMap.set(contentType.id, selectedRepos);
      }
    }

    // === GENERATE SYNC PLAN ===
    const syncPlan: Amplience.ContentTypeSyncPlan = {
      hub: {
        id: targetHub.hubId,
        name: targetHub.name,
        label: targetHub.name,
      },
      items: selectedContentTypes.map(ct => ({
        sourceContentType: ct,
        targetRepositories: repositoryMap.get(ct.id) || [],
      })),
    };

    // Filter out items with no target repositories
    syncPlan.items = syncPlan.items.filter(item => item.targetRepositories.length > 0);

    if (syncPlan.items.length === 0) {
      console.log('No content types have target repositories assigned. Operation cancelled.');

      return;
    }

    // === DISPLAY SUMMARY & CONFIRMATION ===
    console.log('\n📋 Sync Plan Summary:');
    console.log(`Target Hub: ${targetHub.name}`);
    console.log('Operations:');

    for (const item of syncPlan.items) {
      console.log(
        `  • CREATE Content Type: ${item.sourceContentType.settings?.label || item.sourceContentType.contentTypeUri}`
      );
      console.log(`    Schema: ${item.sourceContentType.contentTypeUri}`);
      console.log('    ASSIGN to repositories:');
      item.targetRepositories.forEach(repo => {
        console.log(`      - ${repo.label} (${repo.name})`);
      });
    }

    const confirmed = await promptForConfirmation('Do you want to proceed with this sync plan?');
    if (!confirmed) {
      console.log('Operation cancelled.');

      return;
    }

    // === EXECUTE SYNC PLAN ===
    console.log('\n🚀 Executing sync plan...');
    const totalOperations = syncPlan.items.reduce(
      (total, item) => total + 1 + item.targetRepositories.length,
      0
    );
    const progressBar = createProgressBar(totalOperations, 'Syncing content types');

    const results: Array<{
      contentType: Amplience.ContentType;
      createSuccess: boolean;
      createError?: string;
      assignments: Array<{
        repository: Amplience.ContentRepository;
        success: boolean;
        error?: string;
      }>;
    }> = [];

    for (const item of syncPlan.items) {
      let createSuccess = false;
      let createError: string | undefined;
      let createdContentType: Amplience.ContentType | undefined;

      // Create content type
      try {
        const createRequest: Amplience.CreateContentTypeRequest = {
          contentTypeUri: item.sourceContentType.contentTypeUri,
          ...(item.sourceContentType.settings && { settings: item.sourceContentType.settings }),
        };

        createdContentType = await targetService.createContentType(targetHub.hubId, createRequest);
        createSuccess = true;
        progressBar.increment();
      } catch (error) {
        createError = error instanceof Error ? error.message : 'Unknown error';
        progressBar.increment();
      }

      // Assign to repositories if creation was successful
      const assignments: Array<{
        repository: Amplience.ContentRepository;
        success: boolean;
        error?: string;
      }> = [];

      if (createSuccess && createdContentType) {
        for (const repository of item.targetRepositories) {
          try {
            await targetService.assignContentTypeToRepository(repository.id, createdContentType.id);
            assignments.push({
              repository,
              success: true,
            });
          } catch (error) {
            assignments.push({
              repository,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          progressBar.increment();
        }
      } else {
        // Skip assignments if creation failed, but still increment progress
        item.targetRepositories.forEach(() => progressBar.increment());
      }

      results.push({
        contentType: item.sourceContentType,
        createSuccess,
        ...(createError && { createError }),
        assignments,
      });
    }

    progressBar.stop();

    // === DISPLAY RESULTS ===
    console.log('\n✅ Sync operation completed!');

    let totalCreated = 0;
    let totalFailed = 0;
    let totalAssignments = 0;
    let failedAssignments = 0;

    results.forEach(result => {
      if (result.createSuccess) {
        totalCreated++;
        totalAssignments += result.assignments.length;
        failedAssignments += result.assignments.filter(a => !a.success).length;
      } else {
        totalFailed++;
      }
    });

    console.log(`\nResults Summary:`);
    console.log(`• Content types created: ${totalCreated}`);
    console.log(`• Content types failed: ${totalFailed}`);
    console.log(`• Repository assignments successful: ${totalAssignments - failedAssignments}`);
    console.log(`• Repository assignments failed: ${failedAssignments}`);

    // Show detailed errors if any
    const failedResults = results.filter(
      r => !r.createSuccess || r.assignments.some(a => !a.success)
    );
    if (failedResults.length > 0) {
      console.log('\n❌ Detailed Error Report:');
      failedResults.forEach(result => {
        const ctName = result.contentType.settings?.label || result.contentType.contentTypeUri;
        if (!result.createSuccess) {
          console.log(`  • Failed to create "${ctName}": ${result.createError}`);
        } else {
          const failedAssignments = result.assignments.filter(a => !a.success);
          if (failedAssignments.length > 0) {
            console.log(`  • "${ctName}" - Assignment failures:`);
            failedAssignments.forEach(assignment => {
              console.log(`    - ${assignment.repository.label}: ${assignment.error}`);
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
  }
}
