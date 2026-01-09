import { getHubConfigs } from '~/app-config';
import { promptForHub } from '~/prompts';
import {
  DcCliExecutionError,
  DirectoryAccessError,
  ExportExtensionsError,
  HubAuthenticationError,
  InvalidPatternError,
  exportExtensions,
  type ExportExtensionsResult,
  type ExportMode,
} from '~/services/actions/export-extensions';
import { checkDcCliAvailability } from '~/utils';

import { formatExportSummary } from './format-export-summary';
import { promptForExportMode } from './prompt-for-export-mode';
import { promptForExtensionOutputDirectory } from './prompt-for-extension-output-dir';
import { promptForExtensionFilterPattern } from './prompt-for-extension-pattern';
import { promptForPreviewConfirmation } from './prompt-for-preview-confirmation';
import { promptForPreviewMode } from './prompt-for-preview-mode';
import { validateExistingFiles } from './validate-existing-files';

/**
 * Main command to orchestrate extension export
 *
 * @example
 * await runExportExtensions();
 */
export async function runExportExtensions(): Promise<void> {
  console.log('📦 Export Extensions');
  console.log('===================\n');

  let selectedHub: Amplience.HubConfig | null = null;

  try {
    // Check dc-cli availability
    const isDcCliAvailable = await checkDcCliAvailability();
    if (!isDcCliAvailable) {
      console.log('❌ dc-cli is not installed or not available in your PATH.');
      console.log('   Please install dc-cli first: npm install -g @amplience/dc-cli');
      console.log('   Then try again.\n');

      return;
    }

    // Load available hubs
    const hubConfigs = getHubConfigs();
    if (hubConfigs.length === 0) {
      console.error('❌ No hub configurations found. Please check your .env file.');

      return;
    }

    // Select hub
    const hub = await promptForHub(hubConfigs);
    selectedHub = hub;
    console.log(`✅ Selected hub: ${hub.name}\n`);

    // Get output directory
    const outputDir = await promptForExtensionOutputDirectory();

    // Validate existing files (fail fast if corrupted)
    const validation = await validateExistingFiles(outputDir);
    if (!validation.valid) {
      console.error('❌ Invalid or corrupted files detected in export directory:\n');
      for (const error of validation.errors) {
        console.error(`   • ${error.filePath}`);
        console.error(`     ${error.error}\n`);
      }
      console.error('Please fix or remove these files before proceeding.\n');

      return;
    }

    // Prompt for export mode if existing files found
    let mode: ExportMode | null = null;
    if (validation.fileCount > 0) {
      console.log(`ℹ️  Found ${validation.fileCount} existing file(s) in ${outputDir}\n`);
      mode = await promptForExportMode();
      console.log('');
    } else {
      // Default to full-overwrite for empty directories
      mode = 'full-overwrite';
    }

    // Get regex pattern
    const pattern = await promptForExtensionFilterPattern();

    // Get preview mode
    const previewMode = await promptForPreviewMode();

    // Execute export
    const result = await exportExtensions({
      hub,
      outputDir,
      pattern,
      mode,
      ...(previewMode === 'preview'
        ? {
            onBeforeFiltering: async (summary): Promise<boolean> => {
              displayPreview(summary);

              return promptForPreviewConfirmation(summary.kept.length, summary.removed.length);
            },
          }
        : {}),
    });

    // Display results
    if (result.totalFilesInHub === 0) {
      console.log('ℹ️  No extensions were returned for the selected hub.');
    } else if (result.kept.length === 0) {
      console.log('ℹ️  No extensions matched the provided regex pattern.');
    }

    if (previewMode === 'preview' && !result.filtered) {
      console.log('⚠️  Operation cancelled. No changes were made.\n');
    }

    console.log('📊 Export Summary');
    for (const line of formatExportSummary(result)) {
      console.log(`  ${line}`);
    }
    console.log('');
  } catch (err) {
    handleExportError(err, selectedHub);
  }
}

function displayPreview(summary: ExportExtensionsResult): void {
  console.log('👀 Preview of matching extensions:');

  if (summary.kept.length === 0) {
    console.log('No matching extensions found for the provided pattern.');

    return;
  }

  const tableRows = summary.kept.map(extension => ({
    ID: extension.id ?? '(no id)',
    URL: extension.url ?? '—',
    Description: extension.description ?? '—',
    File: extension.fileName,
  }));

  console.table(tableRows);
  console.log(`Total matching: ${summary.kept.length}/${summary.totalFilesInHub}\n`);
}

function handleExportError(error: unknown, hub: Amplience.HubConfig | null): void {
  if (error instanceof InvalidPatternError) {
    console.error(`❌ Invalid regex pattern: ${error.message}`);

    return;
  }

  if (error instanceof DirectoryAccessError) {
    console.error(`❌ ${error.message}`);

    return;
  }

  if (error instanceof HubAuthenticationError) {
    console.error(`❌ ${error.message}`);
    const stderr = error.stderr?.trim();
    if (stderr && stderr.length > 0) {
      console.error(stderr);
    }

    return;
  }

  if (error instanceof DcCliExecutionError) {
    console.error('❌ dc-cli command failed. See output below.');
    const stdout = error.stdout?.trim();
    if (stdout && stdout.length > 0) {
      console.error(`stdout:\n${stdout}`);
    }
    const stderr = error.stderr?.trim();
    if (stderr && stderr.length > 0) {
      console.error(`stderr:\n${stderr}`);
    }

    return;
  }

  if (error instanceof ExportExtensionsError) {
    console.error(`❌ ${error.message}`);

    return;
  }

  if (error instanceof Error) {
    const hubName = hub ? ` for hub ${hub.name}` : '';
    console.error(`❌ Unexpected error${hubName}: ${error.message}`);

    return;
  }

  console.error('❌ Unexpected error during extension export.');
}
