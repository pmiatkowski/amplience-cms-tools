import { runSyncContentTypes } from '~/commands/sync-content-types';

/**
 * Deprecated compatibility alias for existing command sets and integrations.
 */
export async function runCopyContentTypes(): Promise<void> {
  console.warn('The "copy-content-types" command is deprecated. Use "sync-content-types" instead.');
  await runSyncContentTypes();
}
