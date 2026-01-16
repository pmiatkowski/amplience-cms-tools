import { AmplienceService } from '~/services/amplience-service';
import { type BulkUpdateVisualizationsResult, createProgressBar } from '~/utils';

/**
 * Bulk update visualizations for multiple content types
 *
 * This action updates the visualizations property in the settings of each content type
 * with the provided visualization configuration, replacing the {{ORIGIN_REPLACE}} placeholder
 * with the hub-specific visualization URL.
 *
 * @param context - The bulk update context containing service, content types, and config
 * @returns Promise resolving to the operation result with counts and errors
 *
 * @example
 * const result = await bulkUpdateContentTypeVisualizations({
 *   service: amplienceService,
 *   contentTypes: selectedContentTypes,
 *   visualizationConfig: parsedConfig,
 *   hubVisualizationUrl: 'https://vse.example.com',
 *   isDryRun: false,
 * });
 */
export async function bulkUpdateContentTypeVisualizations(
  context: BulkUpdateVisualizationsContext
): Promise<BulkUpdateVisualizationsResult> {
  const { service, contentTypes, visualizationConfig, hubVisualizationUrl, isDryRun } = context;

  const result: BulkUpdateVisualizationsResult = {
    totalAttempted: contentTypes.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  if (contentTypes.length === 0) {
    return result;
  }

  // Create progress bar
  const progress = createProgressBar(contentTypes.length, 'Updating visualizations');

  // Process each content type
  for (const contentType of contentTypes) {
    try {
      // Prepare the updated visualizations with URL replacement
      const updatedVisualizations = visualizationConfig.visualizations.map(viz => ({
        label: viz.label,
        templatedUri: viz.templatedUri.replace(/{{ORIGIN_REPLACE}}/g, hubVisualizationUrl),
        default: viz.default,
      }));

      if (isDryRun) {
        // In dry-run mode, just log what would be updated
        console.log(`  [DRY RUN] Would update ${contentType.contentTypeUri}`);
        console.log(
          `    Old visualizations: ${JSON.stringify(contentType.settings?.visualizations || [])}`
        );
        console.log(`    New visualizations: ${JSON.stringify(updatedVisualizations)}`);
        result.succeeded++;
      } else {
        // Perform the actual update
        const updateResult = await service.updateContentType(contentType.id, {
          contentTypeUri: contentType.contentTypeUri,
          settings: {
            ...contentType.settings,
            visualizations: updatedVisualizations,
          },
        });

        if (updateResult.success) {
          result.succeeded++;
        } else {
          result.failed++;
          result.errors.push({
            contentTypeId: contentType.id,
            contentTypeLabel: contentType.settings?.label || contentType.contentTypeUri,
            error: updateResult.error || 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        contentTypeId: contentType.id,
        contentTypeLabel: contentType.settings?.label || contentType.contentTypeUri,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    progress.increment();
  }

  progress.stop();

  return result;
}

/**
 * Context object for bulk update visualizations action
 */
export type BulkUpdateVisualizationsContext = {
  /** Amplience service instance for API calls */
  service: AmplienceService;
  /** Content types to update with new visualizations */
  contentTypes: Amplience.ContentType[];
  /** Visualization configuration to apply */
  visualizationConfig: VisualizationConfig;
  /** Hub-specific visualization URL to replace placeholder */
  hubVisualizationUrl: string;
  /** Whether to run in dry-run mode (no actual updates) */
  isDryRun: boolean;
};

/**
 * Visualization configuration from JSON file
 */
export type VisualizationConfig = {
  visualizations: Array<{
    label: string;
    templatedUri: string;
    default?: boolean;
  }>;
};
