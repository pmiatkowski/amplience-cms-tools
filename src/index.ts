import { runArchiveContentTypeSchemas } from './commands/archive-content-type-schemas';
import { runCleanRepository } from './commands/clean-repository';
import { runCleanupFolderCommand } from './commands/cleanup-folder';
import { runCopyFolderWithContent } from './commands/copy-folder-with-content';
import { runListFolderTree } from './commands/list-folder-tree';
import { runRecreateContentItems } from './commands/recreate-content-items';
import { runRecreateFolderStructure } from './commands/recreate-folder-structure';
import { syncContentTypeSchemas } from './commands/sync-content-type-schemas';
import { runSyncContentTypes } from './commands/sync-content-types';
import { runSyncHierarchy } from './commands/sync-hierarchy';
import { runUpdateDeliveryKeysLocale } from './commands/update-delivery-keys-locale';
import { promptForCommand } from './prompts';

async function main(): Promise<void> {
  try {
    const command = await promptForCommand();

    switch (command) {
      case 'sync-content-type-schemas':
        await syncContentTypeSchemas();
        break;
      case 'sync-content-types':
        await runSyncContentTypes();
        break;
      case 'archive-content-type-schemas':
        await runArchiveContentTypeSchemas();
        break;
      case 'sync-hierarchy':
        await runSyncHierarchy();
        break;
      case 'update-locale':
        await runUpdateDeliveryKeysLocale();
        break;
      case 'clean-repo':
        await runCleanRepository();
        break;
      case 'list-folder-tree':
        await runListFolderTree();
        break;
      case 'cleanup-folder':
        await runCleanupFolderCommand();
        break;
      case 'recreate-folder-structure':
        await runRecreateFolderStructure();
        break;
      case 'recreate-content-items':
        await runRecreateContentItems();
        break;
      case 'copy-folder-with-content':
        await runCopyFolderWithContent();
        break;
      default:
        console.error('Unknown command selected.');
        process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
