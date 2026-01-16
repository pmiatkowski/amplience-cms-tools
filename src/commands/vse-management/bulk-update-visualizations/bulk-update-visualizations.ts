import { getHubConfigs } from '~/app-config';
import { promptForHub, promptForConfirmation, promptForDryRun } from '~/prompts';
import { bulkUpdateContentTypeVisualizations } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import {
  filterContentTypesByRegex,
  parseContentTypesList,
  parseVisualizationConfig,
  getHubVisualizationUrl,
  replaceOriginPlaceholder,
  displayVisualizationSummary,
  generateBulkVisualizationsReport,
  saveBulkVisualizationsReport,
} from '~/utils';

import {
  promptForContentTypeSelectionMethod,
  promptForRegexPattern,
  promptForContentTypesFile,
  promptForContentTypeSelection,
  promptForVisualizationConfigFile,
} from './prompts';

/**
 * Bulk update visualizations for multiple content types
 *
 * @example
 * await runBulkUpdateVisualizations();
 */
export async function runBulkUpdateVisualizations(): Promise<void> {
  console.log('🎨 Bulk Update Visualizations');
  console.log('============================\n');

  try {
    // 1. Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    // 2. Select hub
    const hub = await promptForHub(hubConfigs);
    console.log(`✅ Selected hub: ${hub.name}\n`);

    // 3. Create Amplience service
    const service = new AmplienceService(hub);

    // 4. Prompt for content type selection method
    console.log('📋 Content Type Selection');
    console.log('─────────────────────────\n');

    const selectionMethod = await promptForContentTypeSelectionMethod();
    console.log(`Selected method: ${selectionMethod === 'api' ? 'API filtering' : 'File-based'}\n`);

    let selectedContentTypes: Amplience.ContentType[] = [];

    if (selectionMethod === 'api') {
      // API method: regex filtering
      const pattern = await promptForRegexPattern();
      console.log(`Using pattern: ${pattern}\n`);

      console.log('🔍 Fetching content types from API...');
      const allContentTypes = await service.getAllContentTypes();
      console.log(`Found ${allContentTypes.length} total content types\n`);

      const filteredContentTypes = filterContentTypesByRegex(allContentTypes, pattern);
      console.log(`Filtered to ${filteredContentTypes.length} content types matching pattern\n`);

      if (filteredContentTypes.length === 0) {
        console.log('❌ No content types match the specified pattern.');

        return;
      }

      selectedContentTypes = await promptForContentTypeSelection(filteredContentTypes);
    } else {
      // File method: load from JSON
      const filePath = await promptForContentTypesFile();
      console.log(`Loading content types from: ${filePath}\n`);

      console.log('📄 Parsing content types list file...');
      const contentTypeUris = await parseContentTypesList(filePath);
      console.log(`Found ${contentTypeUris.length} content type URIs in file\n`);

      console.log('🔍 Fetching content types from API...');
      const allContentTypes = await service.getAllContentTypes();

      const matchedContentTypes = allContentTypes.filter(ct =>
        contentTypeUris.includes(ct.contentTypeUri)
      );
      console.log(`Matched ${matchedContentTypes.length} content types from file\n`);

      if (matchedContentTypes.length === 0) {
        console.log('❌ No content types from the file were found in the hub.');

        return;
      }

      selectedContentTypes = await promptForContentTypeSelection(matchedContentTypes);
    }

    if (selectedContentTypes.length === 0) {
      console.log('❌ No content types selected. Operation cancelled.');

      return;
    }

    console.log(
      `\n✅ Selected ${selectedContentTypes.length} content type(s) for visualization update\n`
    );

    // 5. Prompt for visualization config file
    console.log('🎨 Visualization Configuration');
    console.log('──────────────────────────────\n');

    const configFilePath = await promptForVisualizationConfigFile();
    console.log(`Loading visualization config from: ${configFilePath}\n`);

    // 6. Parse visualization config
    console.log('📄 Parsing visualization config file...');
    const visualizationConfig = parseVisualizationConfig(configFilePath);
    console.log(`Found ${visualizationConfig.visualizations.length} visualization(s)\n`);

    // 7. Get hub-specific visualization URL
    console.log('🔗 Retrieving hub-specific visualization URL...');
    const hubVisualizationUrl = getHubVisualizationUrl(hub.name);
    console.log(`Hub visualization URL: ${hubVisualizationUrl}\n`);

    // 8. Verify URL replacement works correctly
    visualizationConfig.visualizations.forEach(viz => {
      replaceOriginPlaceholder(viz.templatedUri, hubVisualizationUrl);
    });

    // 9. Prompt for dry-run mode
    console.log('\n⚙️  Configuration Options');
    console.log('─────────────────────────\n');

    const isDryRun = await promptForDryRun();

    console.log(
      `\n✅ Configuration: ${isDryRun ? 'DRY-RUN (preview only)' : 'EXECUTE (live mode)'}\n`
    );

    // 10. Display summary and confirm
    displayVisualizationSummary(selectedContentTypes, visualizationConfig, hub.name);

    const confirmed = await promptForConfirmation(
      `Do you want to proceed with ${isDryRun ? 'previewing' : 'updating'} visualizations?`,
      false
    );

    if (!confirmed) {
      console.log('\n❌ Operation cancelled by user.\n');

      return;
    }

    // 11. Execute bulk update with progress tracking
    console.log('\n🚀 Executing Bulk Update');
    console.log('────────────────────────\n');

    const result = await bulkUpdateContentTypeVisualizations({
      service,
      contentTypes: selectedContentTypes,
      visualizationConfig,
      hubVisualizationUrl,
      isDryRun,
    });

    // 12. Display results
    console.log('\n📊 Results Summary');
    console.log('─────────────────\n');
    console.log(`Total attempted: ${result.totalAttempted}`);
    console.log(`✅ Successful: ${result.succeeded}`);
    console.log(`❌ Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(err => {
        console.log(`  - ${err.contentTypeLabel} (${err.contentTypeId}): ${err.error}`);
      });
    }

    // 13. Generate and save report
    console.log('\n📄 Generating report...');
    const report = generateBulkVisualizationsReport({
      result,
      hubName: hub.name,
      visualizationConfig,
      isDryRun,
    });
    const reportPath = await saveBulkVisualizationsReport(report);
    console.log(`Report saved to: ${reportPath}`);

    console.log('\n✅ Bulk update complete!\n');
  } catch (err) {
    console.error('❌ Error during bulk update visualizations:', err);
    throw err;
  }
}
