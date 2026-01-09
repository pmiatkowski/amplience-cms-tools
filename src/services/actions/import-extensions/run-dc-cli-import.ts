import { createDcCliCommand, createProgressBar } from '~/utils';

import { DcCliExecutionError, HubAuthenticationError } from '../import-extensions';

/**
 * Execute dc-cli extension import command to upload extensions to target hub
 *
 * Runs: `dc-cli extension import <importDir> --clientId <id> --clientSecret <secret> --hubId <hubId>`
 *
 * @param hub - Target hub configuration with authentication credentials
 * @param importDir - Directory containing extension JSON files to import
 * @example
 * await runDcCliImport(
 *   { hubId: '5f8b...', name: 'PROD', clientId: '...', clientSecret: '...' },
 *   './temp_import_1234/extensions'
 * );
 */
export async function runDcCliImport(hub: Amplience.HubConfig, importDir: string): Promise<void> {
  const importProgress = createProgressBar(1, 'Importing extensions');
  try {
    await createDcCliCommand()
      .withHub(hub)
      .withCommand(`extension import "${importDir}"`)
      .execute();
    importProgress.increment();
  } catch (error) {
    const stdout = readProcessOutput((error as { stdout?: unknown })?.stdout);
    const stderr = readProcessOutput((error as { stderr?: unknown })?.stderr);

    if (isAuthenticationError(stdout) || isAuthenticationError(stderr)) {
      throw new HubAuthenticationError(hub.name, stdout, stderr, error);
    }

    throw new DcCliExecutionError('dc-cli command failed.', stdout, stderr, error);
  } finally {
    importProgress.stop();
  }
}

/**
 * Safely read process output (stdout/stderr) from error object
 */
function readProcessOutput(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Check if output contains authentication error indicators
 */
function isAuthenticationError(output: string): boolean {
  if (!output) {
    return false;
  }

  return /401|unauthor/i.test(output);
}
