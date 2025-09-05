import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForConfirmation,
  promptForSchemaIdFilter,
  promptForIncludeArchived,
  promptForSchemasToArchive,
  promptForDryRun,
} from '~/prompts';
import { archiveContentTypeSchemas } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';

/**
 * Archive Content Type Schemas Command
 *
 * This command provides an interactive interface for archiving content type schemas
 * from an Amplience hub. It handles the complete archiving workflow including:
 * - Schema discovery and filtering
 * - Dependency analysis (content types and content items)
 * - User confirmation and dry-run support
 * - Systematic archiving in dependency order
 *
 * The command follows a clean architecture pattern with separation between
 * UI orchestration (this file) and business logic (action layer).
 *
 * @example
 * ```typescript
 * // Command is typically called from CLI
 * await runArchiveContentTypeSchemas();
 * ```
 *
 * @throws {Error} When hub configuration is invalid or API operations fail
 * @returns Promise that resolves when the command completes successfully
 */
export async function runArchiveContentTypeSchemas(): Promise<void> {
  console.log('🗂️ Starting Archive Content Type Schemas');
  console.log('==========================================\n');

  try {
    // Step 1: Hub selection and validation
    const hubs = getHubConfigs();
    if (hubs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    const selectedHub = await promptForHub(hubs);
    if (!selectedHub) {
      console.log('❌ No hub selected. Aborting.');

      return;
    }

    console.log(`✅ Selected hub: ${selectedHub.name}\n`);

    // Step 2: Get configuration options
    const includeArchived = await promptForIncludeArchived();
    const schemaIdFilter = await promptForSchemaIdFilter();
    const isDryRun = await promptForDryRun();

    if (isDryRun) {
      console.log('🔍 Running in DRY-RUN mode - no changes will be made\n');
    }

    // Step 3: Initialize service for schema discovery
    const amplienceService = new AmplienceService(selectedHub);

    // Step 4: Fetch and filter schemas for selection
    console.log('🔍 Fetching content type schemas...');
    const allSchemas = await amplienceService.getAllSchemas(includeArchived);

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

    console.log(`📋 Found ${filteredSchemas.length} schemas matching criteria\n`);

    // Step 5: User selects schemas to archive
    const selectedSchemas = await promptForSchemasToArchive(filteredSchemas);

    if (selectedSchemas.length === 0) {
      console.log('ℹ️ No schemas selected for archiving.');

      return;
    }

    console.log(`✅ Selected ${selectedSchemas.length} schemas for archiving\n`);

    // Step 6: Display configuration summary
    console.log('📋 Archive Configuration:');
    console.log(`   • Hub: ${selectedHub.name}`);
    console.log(`   • Include archived: ${includeArchived ? 'Yes' : 'No'}`);
    console.log(`   • Schema filter: ${schemaIdFilter || 'None'}`);
    console.log(`   • Schemas to archive: ${selectedSchemas.length}`);
    console.log(`   • Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

    // Step 7: Final confirmation
    const shouldProceed = await promptForConfirmation(
      'Do you want to proceed with the archive operation?',
      false
    );

    if (!shouldProceed) {
      console.log('❌ Operation cancelled by user.');

      return;
    }

    // Step 8: Execute the archive action
    await archiveContentTypeSchemas({
      hub: selectedHub,
      selectedSchemas,
      includeArchived,
      isDryRun,
    });
  } catch (error) {
    console.error('❌ Error during archive content type schemas command:', error);
    throw error;
  }
}
