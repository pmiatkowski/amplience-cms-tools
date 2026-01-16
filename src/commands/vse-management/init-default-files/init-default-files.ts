import { existsSync } from 'node:fs';

/**
 * Example content types URIs for the content-types.json file
 *
 * These are example content type URIs that should be included in the
 * AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE
 *
 * @example
 * import { CONTENT_TYPES_EXAMPLE } from './init-default-files';
 * console.log(CONTENT_TYPES_EXAMPLE);
 * // ["https://schema.example.com/product.json", "https://schema.example.com/category.json"]
 */
export const CONTENT_TYPES_EXAMPLE = [
  'https://schema.example.com/product.json',
  'https://schema.example.com/category.json',
] as const;




/**
 * Display file validation results for VSE configuration files
 *
 * Shows "Found" or "Missing" status for each configured file.
 * For missing files, displays example content to help users create them.
 *
 * @param vseFilePaths - Object containing paths to validate
 * @example
 * const paths = getVseFilePaths();
 * displayFileValidationResults(paths);
 */
export function displayFileValidationResults(vseFilePaths: VseFilePaths): void {
  console.log('========================================');
  console.log('  File Validation Results');
  console.log('========================================\n');

  if (vseFilePaths.contentTypesListFile) {
    const exists = validateFileExists(vseFilePaths.contentTypesListFile);
    console.log(`Content Types List: ${exists ? '✓ Found' : '✗ Missing'}`);
    console.log(`  Path: ${vseFilePaths.contentTypesListFile}`);

    if (!exists) {
      console.log('  \n  Example content:\n');
      const exampleLines = JSON.stringify(CONTENT_TYPES_EXAMPLE, null, 2)
        .split('\n')
        .map((line) => '    ' + line);
      console.log(exampleLines.join('\n'));
    }
    console.log('');
  }

  if (vseFilePaths.visualizationsConfigFile) {
    const exists = validateFileExists(vseFilePaths.visualizationsConfigFile);
    console.log(`Visualizations Config: ${exists ? '✓ Found' : '✗ Missing'}`);
    console.log(`  Path: ${vseFilePaths.visualizationsConfigFile}`);

    if (!exists) {
      console.log('  \n  Example content:\n');
      const exampleLines = JSON.stringify(VISUALIZATIONS_EXAMPLE, null, 2)
        .split('\n')
        .map((line) => '    ' + line);
      console.log(exampleLines.join('\n'));
    }
    console.log('');
  }
}







/**
 * Display instructions for setting up VSE environment variables
 *
 * Shows the required environment variable names, recommended file paths,
 * and example JSON content for both configuration files
 *
 * @example
 * displayMissingEnvVarsInstructions();
 */
export function displayMissingEnvVarsInstructions(): void {
  console.log('========================================');
  console.log('  Environment Variables Not Configured');
  console.log('========================================\n');

  console.log('To use VSE Default Files, set the following environment variables:\n');

  console.log('  AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE');
  console.log('    Recommended: .Amplience/content-types.json\n');

  console.log('  AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE');
  console.log('    Recommended: .Amplience/visualizations.json\n');

  console.log('========================================');
  console.log('  Example: content-types.json');
  console.log('========================================\n');
  console.log(JSON.stringify(CONTENT_TYPES_EXAMPLE, null, 2));
  console.log('');

  console.log('========================================');
  console.log('  Example: visualizations.json');
  console.log('========================================\n');
  console.log(JSON.stringify(VISUALIZATIONS_EXAMPLE, null, 2));
  console.log('');
}






/**
 * Reads VSE file paths from environment variables
 *
 * Looks for AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE and
 * AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE in the environment
 *
 * @returns VseFilePaths object containing the file paths from environment variables
 * @example
 * const paths = getVseFilePaths();
 * if (paths.contentTypesListFile) {
 *   console.log(`Content types file: ${paths.contentTypesListFile}`);
 * }
 */
export function getVseFilePaths(): VseFilePaths {
  return {
    contentTypesListFile: process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE,
    visualizationsConfigFile: process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE,
  };
}






/**
 * Initialize VSE Default Files command
 *
 * Displays instructions for setting up VSE default visualization configuration files
 *
 * @example
 * await runInitDefaultFiles();
 */
export async function runInitDefaultFiles(): Promise<void> {
  console.log('🎨 Initialize Default Files');
  console.log('========================\n');

  const vseFilePaths = getVseFilePaths();

  const hasEnvVarsSet =
    vseFilePaths.contentTypesListFile !== undefined ||
    vseFilePaths.visualizationsConfigFile !== undefined;

  if (!hasEnvVarsSet) {
    displayMissingEnvVarsInstructions();

    return;
  }

  console.log('Environment variables configured:');
  console.log(`  Content Types List: ${vseFilePaths.contentTypesListFile ?? 'Not set'}`);
  console.log(
    `  Visualizations Config: ${vseFilePaths.visualizationsConfigFile ?? 'Not set'}\n`,
  );

  displayFileValidationResults(vseFilePaths);
}







/**
 * Validates if a file exists at the given path
 *
 * @param filePath - The file path to check
 * @returns true if the file exists, false otherwise
 * @example
 * if (validateFileExists('/path/to/file.json')) {
 *   console.log('File exists');
 * }
 */
export function validateFileExists(filePath: string): boolean {
  return existsSync(filePath);
}






/**
 * Example visualizations configuration for the visualizations.json file
 *
 * This defines the Preview and Live View visualizations that should be included in the
 * AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE
 *
 * @example
 * import { VISUALIZATIONS_EXAMPLE } from './init-default-files';
 * console.log(VISUALIZATIONS_EXAMPLE.preview.uri);
 * // "{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}"
 */
export const VISUALIZATIONS_EXAMPLE = {
  preview: {
    label: 'Preview',
    uri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
    default: true,
  },
  liveView: {
    label: 'Live View',
    uri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
  },
} as const;



/**
 * VSE file paths configuration
 *
 * Contains the paths to the content types list file and visualizations configuration file
 */
export type VseFilePaths = {
  /** Path to the content types list JSON file */
  contentTypesListFile: string | undefined;
  /** Path to the visualizations configuration JSON file */
  visualizationsConfigFile: string | undefined;
}
