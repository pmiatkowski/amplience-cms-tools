import * as fs from 'fs/promises';
import * as path from 'path';

import { createProgressBar } from '~/utils';

import { buildFilterRegex } from './import-extensions/build-filter-regex';
import { copyAndPrepareExtensions } from './import-extensions/copy-and-prepare-extensions';
import { filterExtensions } from './import-extensions/filter-extensions';
import { runDcCliImport } from './import-extensions/run-dc-cli-import';
import { updateExtensionFields } from './import-extensions/update-extension-fields';

export {
  DcCliExecutionError,
  DirectoryAccessError,
  HubAuthenticationError,
  importExtensions,
  ImportExtensionsError,
  InvalidPatternError,
  previewExtensions,
  validateExtUrlExists,
};

/**
 * Base error class for import-extensions operations
 */
class ImportExtensionsError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ImportExtensionsError';
    this.cause = cause;
  }
}

/**
 * Error thrown when a regex pattern cannot be compiled
 *
 * @param pattern - The invalid regex pattern string
 * @param cause - Optional underlying error
 * @example
 * throw new InvalidPatternError('[invalid', syntaxError);
 */
class InvalidPatternError extends ImportExtensionsError {
  readonly pattern: string;

  constructor(pattern: string, cause?: unknown) {
    super(`Invalid regex pattern "${pattern}".`, cause);
    this.name = 'InvalidPatternError';
    this.pattern = pattern;
  }
}

/**
 * Error thrown when file system access fails (read, write, mkdir, etc.)
 *
 * @param message - Human-readable error message
 * @param targetPath - File or directory path that caused the error
 * @param cause - Optional underlying error
 * @example
 * throw new DirectoryAccessError('Cannot create directory', '/tmp/extensions', fsError);
 */
class DirectoryAccessError extends ImportExtensionsError {
  readonly targetPath: string;

  constructor(message: string, targetPath: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DirectoryAccessError';
    this.targetPath = targetPath;
  }
}

/**
 * Error thrown when dc-cli command execution fails
 *
 * @param message - Human-readable error message
 * @param stdout - Standard output from dc-cli process
 * @param stderr - Standard error from dc-cli process
 * @param cause - Optional underlying error
 * @example
 * throw new DcCliExecutionError('Import failed', stdout, stderr, processError);
 */
class DcCliExecutionError extends ImportExtensionsError {
  readonly stdout: string;
  readonly stderr: string;

  constructor(message: string, stdout: string, stderr: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DcCliExecutionError';
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

/**
 * Error thrown when hub authentication fails during dc-cli execution
 *
 * @param hubName - Name of the hub that failed authentication
 * @param stdout - Standard output from dc-cli process
 * @param stderr - Standard error from dc-cli process
 * @param cause - Optional underlying error
 * @example
 * throw new HubAuthenticationError('PROD', stdout, stderr, authError);
 */
class HubAuthenticationError extends DcCliExecutionError {
  constructor(hubName: string, stdout: string, stderr: string, cause?: unknown) {
    super(`Failed to authenticate with hub "${hubName}".`, stdout, stderr, cause);
    this.name = 'HubAuthenticationError';
  }
}

/**
 * Parameters for importing extensions
 */
type ImportExtensionsParams = {
  hub: Amplience.HubConfig;
  sourceDir: string;
  filterPattern?: string; // Optional regex pattern for filtering extensions
};

/**
 * Import extensions from a source directory to the target hub
 *
 * This function follows a safe import workflow:
 * 1. Creates temporary directory with timestamp
 * 2. Copies source extension files to temp directory
 * 3. Updates hub-specific fields (hubId, URL origins) in temp copies
 * 4. Imports from temp directory using dc-cli
 * 5. Cleans up temp directory on success or failure
 *
 * Source files are never modified directly, ensuring data safety.
 *
 * @param params - Hub configuration and source directory path
 * @example
 * const result = await importExtensions({
 *   hub: { hubId: '5f8b...', name: 'PROD', clientId: '...', clientSecret: '...' },
 *   sourceDir: './exports/extensions'
 * });
 * console.log(`Imported ${result.importedCount} extensions`);
 */
async function importExtensions(
  params: ImportExtensionsParams
): Promise<Amplience.ImportExtensionsResult> {
  const { sourceDir, hub, filterPattern = '.*' } = params;
  const resolvedSourceDir = path.resolve(sourceDir);
  const timestamp = Date.now();
  const tempDir = path.resolve(`./temp_import_${timestamp}/extensions`);

  try {
    // Phase 2: Validate EXT_URL exists for target hub
    validateExtUrlExists(hub);

    // Create temp directory for workflow
    await ensureImportDirectory(tempDir);

    // Phase 2: Copy source files to temp directory
    const copiedFiles = await copyAndPrepareExtensions(resolvedSourceDir, tempDir);

    // Phase 2: Update hub-specific fields in temp copies with progress bar
    const prepProgress = createProgressBar(copiedFiles.length, 'Preparing extension files');
    try {
      for (const filePath of copiedFiles) {
        await updateExtensionFields(filePath, hub);
        prepProgress.increment();
      }
    } finally {
      prepProgress.stop();
    }

    // Phase 3: Filter and validate extensions
    const pattern = buildFilterRegex(filterPattern);
    const filterResult = await filterExtensions(copiedFiles, pattern);

    // Log warnings for invalid files
    if (filterResult.invalid.length > 0) {
      console.warn(`⚠️ Skipping ${filterResult.invalid.length} invalid file(s):`);
      for (const invalid of filterResult.invalid) {
        console.warn(`   - ${path.basename(invalid.filePath)}: ${invalid.error}`);
      }
      console.log();
    }

    // Early exit if no valid extensions match pattern
    if (filterResult.kept.length === 0) {
      const result: Amplience.ImportExtensionsResult = {
        sourceDir: resolvedSourceDir,
        totalFilesFound: copiedFiles.length,
        matchedCount: 0,
        filteredOutCount: filterResult.removed.length,
        invalidCount: filterResult.invalid.length,
        importedCount: 0,
        invalidFiles: filterResult.invalid,
      };
      await cleanupTempDirectory(tempDir);

      return result;
    }

    // Phase 4: Import extensions using dc-cli
    await runDcCliImport(hub, tempDir);

    // Construct result with actual counts
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: resolvedSourceDir,
      totalFilesFound: copiedFiles.length,
      matchedCount: filterResult.kept.length,
      filteredOutCount: filterResult.removed.length,
      invalidCount: filterResult.invalid.length,
      importedCount: filterResult.kept.length, // DC-CLI imports all kept files
      invalidFiles: filterResult.invalid,
    };

    // Cleanup temp directory after successful operation
    await cleanupTempDirectory(tempDir);

    return result;
  } catch (error) {
    // Cleanup temp on error
    await cleanupTempDirectory(tempDir).catch(() => {
      // Ignore cleanup errors
    });

    if (error instanceof ImportExtensionsError) {
      throw error;
    }

    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ImportExtensionsError(`Failed to import extensions: ${fallbackMessage}`, error);
  }
}

/**
 * Preview extensions before import (read-only operation)
 *
 * Performs filtering and validation without modifying any files or
 * importing to hub. Returns metadata for preview display.
 *
 * @param params - Source directory and filter pattern
 * @example
 * const preview = await previewExtensions({
 *   sourceDir: './exports/extensions',
 *   filterPattern: 'my-extension'
 * });
 * console.log(`Will import ${preview.matchedCount} extensions`);
 */
async function previewExtensions(params: {
  sourceDir: string;
  filterPattern?: string;
}): Promise<Amplience.PreviewExtensionsResult> {
  const { sourceDir, filterPattern = '.*' } = params;
  const resolvedSourceDir = path.resolve(sourceDir);

  // Read all JSON files from source directory
  const files = await fs.readdir(resolvedSourceDir);
  const jsonFiles = files
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(resolvedSourceDir, f));

  // Filter and validate
  const pattern = buildFilterRegex(filterPattern);
  const filterResult = await filterExtensions(jsonFiles, pattern);

  return {
    sourceDir: resolvedSourceDir,
    totalFilesFound: jsonFiles.length,
    matchedCount: filterResult.kept.length,
    filteredOutCount: filterResult.removed.length,
    invalidCount: filterResult.invalid.length,
    kept: filterResult.kept,
    invalidFiles: filterResult.invalid,
  };
}

/**
 * Ensure import directory exists
 */
async function ensureImportDirectory(directory: string): Promise<void> {
  try {
    await fs.mkdir(directory, { recursive: true });
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to create import directory. Check permissions for ${directory}.`,
      directory,
      error
    );
  }
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Validate that hub configuration has a valid EXT_URL
 *
 * Checks that the hub has an extUrl field configured and that it is a valid
 * HTTPS URL with no path segments. The extUrl is required for updating URL
 * origins in extension files during import.
 *
 * @param hub - Hub configuration to validate
 * @example
 * validateExtUrlExists({ name: 'PROD', hubId: '123', extUrl: 'https://prod.amplience.net' });
 * // Passes validation
 *
 * validateExtUrlExists({ name: 'DEV', hubId: '456' });
 * // Throws: EXT_URL is required for hub "DEV"
 */
function validateExtUrlExists(hub: Amplience.HubConfig): void {
  const extUrl = hub.extUrl?.trim();

  if (!extUrl) {
    throw new ImportExtensionsError(
      `EXT_URL is required for hub "${hub.name}". ` +
        `Please configure AMP_HUB_${hub.name.toUpperCase()}_EXT_URL in your environment.`
    );
  }

  // Validate that extUrl is a valid HTTPS URL
  let url: URL;
  try {
    url = new URL(extUrl);
  } catch {
    throw new ImportExtensionsError(
      `EXT_URL must be a valid HTTPS URL for hub "${hub.name}". ` + `Current value: "${extUrl}"`
    );
  }

  // Ensure protocol is HTTPS
  if (url.protocol !== 'https:') {
    throw new ImportExtensionsError(
      `EXT_URL must be a valid HTTPS URL for hub "${hub.name}". ` +
        `Current protocol: ${url.protocol}`
    );
  }

  // Ensure no path segments (origin only)
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new ImportExtensionsError(
      `EXT_URL must be origin only (no path segments) for hub "${hub.name}". ` +
        `Current value: "${extUrl}"`
    );
  }
}

export type { ImportExtensionsParams };
