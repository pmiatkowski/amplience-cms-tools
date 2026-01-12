import { getHubConfigs } from '~/app-config';
import { promptForHub } from '~/prompts';
import {
  DcCliExecutionError,
  DirectoryAccessError,
  HubAuthenticationError,
  ImportExtensionsError,
  importExtensions,
  InvalidPatternError,
} from '~/services/actions/import-extensions';
import { checkDcCliAvailability } from '~/utils';

import { formatImportSummary } from './format-import-summary';
import { promptForExtensionInputDirectory } from './prompt-for-extension-input-directory';

/**
 * Main command to orchestrate extension import from local filesystem to target hub
 *
 * Workflow:
 * 1. Check dc-cli availability
 * 2. Select target hub
 * 3. Prompt for source directory
 * 4. Execute import (Phase 1: basic workflow, Phase 2+: filtering, preview, field updates)
 * 5. Display import summary
 *
 * @example
 * await runImportExtensions();
 */
export async function runImportExtensions(): Promise<void> {
  console.log('📥 Import Extensions');
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

    // Select target hub
    const hub = await promptForHub(hubConfigs);
    selectedHub = hub;
    console.log(`✅ Selected target hub: ${hub.name}\n`);

    // Get source directory
    const sourceDir = await promptForExtensionInputDirectory();

    // Execute import action (Phase 1: minimal implementation)
    console.log('⏳ Starting import...\n');
    const result = await importExtensions({
      hub,
      sourceDir,
    });

    // Display comprehensive summary
    console.log('✅ Import completed!\n');
    console.log('Summary:');
    const summary = formatImportSummary(result);
    console.log(summary);
    console.log(); // Empty line after summary
  } catch (error) {
    // Handle specific error types with user-friendly messages
    if (error instanceof HubAuthenticationError) {
      console.error(`❌ Authentication failed for hub "${selectedHub?.name}".`);
      console.error('   Please check your credentials in .env file.');
      console.error(`   Error: ${error.message}\n`);

      return;
    }

    if (error instanceof DirectoryAccessError) {
      console.error('❌ Directory access error:');
      console.error(`   ${error.message}`);
      console.error(`   Path: ${error.targetPath}\n`);

      return;
    }

    if (error instanceof InvalidPatternError) {
      console.error('❌ Invalid filter pattern:');
      console.error(`   ${error.message}`);
      console.error(`   Pattern: ${error.pattern}\n`);

      return;
    }

    if (error instanceof DcCliExecutionError) {
      console.error('❌ dc-cli execution failed:');
      console.error(`   ${error.message}`);
      if (error.stdout) {
        console.error(`   Output: ${error.stdout.trim()}`);
      }
      if (error.stderr) {
        console.error(`   Error: ${error.stderr.trim()}`);
      }
      console.error();

      return;
    }

    if (error instanceof ImportExtensionsError) {
      console.error('❌ Import failed:');
      console.error(`   ${error.message}\n`);

      return;
    }

    // Unexpected errors
    console.error('❌ An unexpected error occurred:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
  }
}
