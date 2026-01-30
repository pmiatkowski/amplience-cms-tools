import { runArchiveContentTypeSchemas } from '~/commands/archive-content-type-schemas';
import { runBulkSyncHierarchies } from '~/commands/bulk-sync-hierarchies';
import { runCleanRepository } from '~/commands/clean-repository';
import { runCleanupFolderCommand } from '~/commands/cleanup-folder';
import { copyContentTypeSchemas } from '~/commands/copy-content-type-schemas';
import { runCopyContentTypes } from '~/commands/copy-content-types';
import { runCopyFolderWithContent } from '~/commands/copy-folder-with-content';
import { runListFolderTree } from '~/commands/list-folder-tree';
import { runManageExtensions } from '~/commands/manage-extensions';
import { runRecreateContentItems } from '~/commands/recreate-content-items';
import { runRecreateFolderStructure } from '~/commands/recreate-folder-structure';
import { runSyncContentTypeProperties } from '~/commands/sync-content-type-properties';
import { runSyncHierarchy } from '~/commands/sync-hierarchy';
import { runUpdateDeliveryKeysLocale } from '~/commands/update-delivery-keys-locale';
import { runVseManagement } from '~/commands/vse-management';
import { executeRunAll, executeStepByStep } from '~/services/actions/user-command-sets';
import {
  configFileExists,
  generateExampleConfig,
  getCommandSetConfigPath,
  initializeCommandSetConfig,
  VALID_COMMAND_NAMES,
  writeCommandSetConfig,
} from '~/services/command-set-config-service';
import {
  promptForCommandSelection,
  promptForCommandSet,
  promptForCreateExampleFile,
  promptForExecutionMode,
  promptForSelectedExecutionMode,
  promptForStepByStepContinue,
} from './prompts';


/**
 * Display instructions when a user declines creating an example file.
 * Provides guidance for manual setup when COMMAND_SETS_PATH is set.
 *
 * @param configPath - The expected configuration file path
 */
export function displayManualCreationInstructions(configPath: string): void {
  console.log('\nℹ️  Command sets file not found.');
  console.log(`   Create a JSON config at: ${configPath}`);
  console.log('   Then re-run the command to load your command sets.\n');
}

/**
 * Registry mapping command names to their executable functions.
 * Commands run in interactive mode - pre-configured parameters are logged
 * but actual execution prompts users for input as needed.
 */
const COMMAND_REGISTRY: Record<string, () => Promise<unknown>> = {
  'manage-extensions': runManageExtensions,
  'vse-management': runVseManagement,
  'sync-hierarchy': runSyncHierarchy,
  'bulk-sync-hierarchies': runBulkSyncHierarchies,
  'copy-content-type-schemas': copyContentTypeSchemas,
  'sync-content-type-properties': runSyncContentTypeProperties,
  'copy-content-types': runCopyContentTypes,
  'copy-folder-with-content': runCopyFolderWithContent,
  'recreate-content-items': runRecreateContentItems,
  'recreate-folder-structure': runRecreateFolderStructure,
  'cleanup-folder': runCleanupFolderCommand,
  'clean-repo': runCleanRepository,
  'archive-content-type-schemas': runArchiveContentTypeSchemas,
  'list-folder-tree': runListFolderTree,
  'update-locale': runUpdateDeliveryKeysLocale,
};

/**
 * Create a command executor function that runs CLI commands.
 * Maps command names to actual command implementations and executes them.
 * Commands run in interactive mode, prompting users for required inputs.
 *
 * @example
 * const executor = createCommandExecutor();
 * await executor('sync-hierarchy');
 * // Runs the sync-hierarchy command interactively
 *
 * @example
 * const executor = createCommandExecutor();
 * await executor('copy-content-types', { dryRun: true });
 * // Parameters are logged; command runs interactively
 */
function createCommandExecutor(): Amplience.CommandExecutor {
  return async (commandName: string, parameters?: Record<string, unknown>) => {
    console.log(`  ⏳ Executing: ${commandName}`);

    if (parameters && Object.keys(parameters).length > 0) {
      console.log(`     Pre-configured parameters: ${JSON.stringify(parameters)}`);
      console.log(`     Note: Command will run interactively`);
    }

    const commandFn = COMMAND_REGISTRY[commandName];

    if (!commandFn) {
      throw new Error(
        `Unknown command: ${commandName}. Valid commands: ${VALID_COMMAND_NAMES.join(', ')}`
      );
    }

    await commandFn();
    console.log(`  ✓ Completed: ${commandName}`);

    return { success: true };
  };
}

/**
 * Display a formatted summary of the execution results.
 *
 * @param summary - The aggregated execution results
 *
 * @example
 * displayExecutionSummary(summary);
 * // Outputs:
 * // ✅ Execution Complete
 * // Total: 5 | Succeeded: 4 | Failed: 1
 * // Duration: 2.5s
 */
function displayExecutionSummary(summary: Amplience.ExecutionSummary): void {
  console.log('\n' + '='.repeat(40));

  if (summary.failed === 0) {
    console.log('✅ Execution Complete');
  } else {
    console.log('⚠️  Execution Complete (with errors)');
  }

  console.log(
    `\nTotal: ${summary.total} | Succeeded: ${summary.succeeded} | Failed: ${summary.failed}`
  );

  const durationSeconds = (summary.totalDurationMs / 1000).toFixed(2);
  console.log(`Duration: ${durationSeconds}s`);

  if (summary.failedCommands.length > 0) {
    console.log('\n❌ Failed commands:');
    for (const cmd of summary.failedCommands) {
      const result = summary.results.find(r => r.command === cmd && !r.success);
      console.log(`   • ${cmd}: ${result?.error || 'Unknown error'}`);
    }
  }

  console.log('='.repeat(40) + '\n');
}


/**
 * Main command orchestrator for User Command Sets feature.
 * Loads configuration, prompts for selection, and executes the chosen command set.
 *
 * @example
 * // Called from main menu when user selects "User Sets"
 * await runUserCommandSets();
 */
export async function runUserCommandSets(): Promise<void> {
  console.log('📋 User Command Sets');
  console.log('====================\n');

  try {
    // Load configuration
    const configPath = getCommandSetConfigPath();
    const envCommandSetsPath = process.env.COMMAND_SETS_PATH;
    let created = false;
    let config: Amplience.CommandSetConfig;

    if (envCommandSetsPath && envCommandSetsPath.trim() !== '' && !configFileExists(configPath)) {
      const shouldCreateExample = await promptForCreateExampleFile(configPath);

      if (!shouldCreateExample) {
        displayManualCreationInstructions(configPath);

        return;
      }

      config = generateExampleConfig();
      writeCommandSetConfig(configPath, config);
      created = true;
    } else {
      const initResult = initializeCommandSetConfig(configPath);
      created = initResult.created;
      config = initResult.config;
    }

    if (created) {
      console.log(`✨ Created example configuration file: ${configPath}`);
      console.log('   Edit this file to define your own command sets.\n');
    }

    // Handle empty configuration
    if (config.commandSets.length === 0) {
      console.log('ℹ️  No command sets defined.');
      console.log(`   Add command sets to: ${configPath}\n`);

      return;
    }

    // Prompt for command set selection
    console.log(`Found ${config.commandSets.length} command set(s)\n`);
    const selectedSetName = await promptForCommandSet(config.commandSets, {
      includeBackOption: true,
    });

    // Handle back navigation
    if (selectedSetName === '__back__') {
      console.log('\n← Returning to main menu');

      return;
    }

    // Find the selected command set
    const selectedSet = config.commandSets.find(s => s.name === selectedSetName);
    if (!selectedSet) {
      console.error(`❌ Command set not found: ${selectedSetName}`);

      return;
    }

    // Handle empty command set
    if (selectedSet.commands.length === 0) {
      console.log(`\nℹ️  Command set "${selectedSet.name}" has no commands.`);

      return;
    }

    // Display selected set info
    console.log(`\n📦 Selected: ${selectedSet.name}`);
    if (selectedSet.description) {
      console.log(`   ${selectedSet.description}`);
    }
    console.log(`   Commands: ${selectedSet.commands.length}\n`);

    // Prompt for execution mode
    const executionMode = await promptForExecutionMode();

    // Execute based on mode
    console.log('\n🚀 Starting execution...\n');

    let summary: Amplience.ExecutionSummary;

    if (executionMode === 'pick-commands') {
      const selectedCommands = await promptForCommandSelection(selectedSet.commands);
      const selectedExecutionMode = await promptForSelectedExecutionMode();
      const selectedCommandSet: Amplience.CommandSet = {
        ...selectedSet,
        commands: selectedCommands,
      };

      if (selectedExecutionMode === 'run-all') {
        summary = await executeRunAll(selectedCommandSet, createCommandExecutor());
      } else {
        summary = await executeStepByStep(
          selectedCommandSet,
          createCommandExecutor(),
          promptForStepByStepContinue
        );
      }
    } else if (executionMode === 'run-all') {
      summary = await executeRunAll(selectedSet, createCommandExecutor());
    } else {
      summary = await executeStepByStep(
        selectedSet,
        createCommandExecutor(),
        promptForStepByStepContinue
      );
    }

    // Display execution summary
    displayExecutionSummary(summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ Error: ${errorMessage}`);
  }
}
