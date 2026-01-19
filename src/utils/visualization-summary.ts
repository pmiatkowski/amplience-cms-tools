import type { VisualizationConfig } from './json-file-parser';

/**
 * Display summary of visualization configuration before bulk update
 *
 * @param contentTypes - Array of content types to be updated
 * @param config - Visualization configuration to be applied
 * @param hubName - Name of the hub where updates will be performed
 *
 * @example
 * displayVisualizationSummary(contentTypes, config, 'DEV');
 */
export function displayVisualizationSummary(
  contentTypes: Amplience.ContentType[],
  config: VisualizationConfig,
  hubName: string
): void {
  console.log('\n📊 Update Summary');
  console.log('═════════════════\n');

  console.log(`Hub: ${hubName}`);
  console.log(`Content Types: ${contentTypes.length}`);
  console.log(`Visualizations: ${config.visualizations.length}\n`);

  console.log('Content Types to Update:');
  contentTypes.forEach((ct, index) => {
    const label = ct.settings?.label || ct.contentTypeUri;
    console.log(`  ${index + 1}. ${label}`);
    console.log(`     URI: ${ct.contentTypeUri}`);
  });

  console.log('\nVisualization Configuration:');
  config.visualizations.forEach((viz, index) => {
    const defaultIndicator = viz.default ? ' (default)' : '';
    console.log(`  ${index + 1}. ${viz.label}${defaultIndicator}`);
    console.log(`     Template URI: ${viz.templatedUri}`);
  });

  console.log('');
}
