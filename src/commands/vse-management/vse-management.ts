import { runBulkUpdateVisualizations } from './bulk-update-visualizations';
import { runInitDefaultFiles } from './init-default-files';
import { promptForVseOperation } from './prompts';

/**
 * Main orchestrator for VSE (Visual Studio Extension) management operations
 *
 * @example
 * await runVseManagement();
 */
export async function runVseManagement(): Promise<void> {
  console.log('🎨 VSE Management');
  console.log('=================\n');

  try {
    const operation = await promptForVseOperation();

    switch (operation) {
      case 'bulk-update-visualizations':
        await runBulkUpdateVisualizations();
        break;
      case 'init-default-files':
        await runInitDefaultFiles();
        break;
      default:
        console.error('Unknown operation selected.');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during VSE management:', err);
    throw err;
  }
}
