import { runArchiveContentTypeSchemas } from './commands/archive-content-type-schemas';
import { runCleanRepository } from './commands/clean-repository';
import { runCleanupFolderCommand } from './commands/cleanup-folder';
import { copyContentTypeSchemas } from './commands/copy-content-type-schemas';
import { runCopyContentTypes } from './commands/copy-content-types';
import { runCopyFolderWithContent } from './commands/copy-folder-with-content';
import { runListFolderTree } from './commands/list-folder-tree';
import { runRecreateContentItems } from './commands/recreate-content-items';
import { runRecreateFolderStructure } from './commands/recreate-folder-structure';
import { runSyncContentTypeProperties } from './commands/sync-content-type-properties';
import { runSyncHierarchy } from './commands/sync-hierarchy';
import { runUpdateDeliveryKeysLocale } from './commands/update-delivery-keys-locale';
import { promptForCommand } from './prompts';
import { getAppVersion } from './utils/version';

async function main(): Promise<void> {
  try {
    console.log(`Amplience CMS Tools v${getAppVersion()}`);
    const command = await promptForCommand();

    switch (command) {
      case 'copy-content-type-schemas':
        await copyContentTypeSchemas();
        break;
      case 'copy-content-types':
        await runCopyContentTypes();
        break;
      case 'sync-content-type-properties':
        await runSyncContentTypeProperties();
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
