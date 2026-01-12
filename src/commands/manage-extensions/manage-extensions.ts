import { runExportExtensions } from './export-extensions';
import { runImportExtensions } from './import-extensions';
import { promptForExtensionOperation } from './prompts';

/**
 * Main orchestrator for extension management operations
 *
 * @example
 * await runManageExtensions();
 */
export async function runManageExtensions(): Promise<void> {
  console.log('🔧 Manage Extensions');
  console.log('===================\n');

  try {
    const operation = await promptForExtensionOperation();

    switch (operation) {
      case 'export':
        await runExportExtensions();
        break;
      case 'import':
        await runImportExtensions();
        break;
      case 'delete':
        console.log('⚠️  Delete functionality coming soon');
        break;
      default:
        console.error('Unknown operation selected.');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during extension management:', err);
    throw err;
  }
}
