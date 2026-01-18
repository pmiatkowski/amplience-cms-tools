import * as fs from 'fs/promises';
import * as path from 'path';

import { AmplienceService } from '~/services/amplience-service';
import { createDcCliCommand, createProgressBar } from '~/utils';

const JSON_EXTENSION = '.json';

export {
  DcCliExecutionError,
  DirectoryAccessError,
  exportExtensions,
  ExportExtensionsError,
  extensionMatchesPattern,
  HubAuthenticationError,
  InvalidPatternError,
};

class ExportExtensionsError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ExportExtensionsError';
    this.cause = cause;
  }
}

class InvalidPatternError extends ExportExtensionsError {
  readonly pattern: string;

  constructor(pattern: string, cause?: unknown) {
    super(`Invalid regex pattern "${pattern}".`, cause);
    this.name = 'InvalidPatternError';
    this.pattern = pattern;
  }
}

class DirectoryAccessError extends ExportExtensionsError {
  readonly targetPath: string;

  constructor(message: string, targetPath: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DirectoryAccessError';
    this.targetPath = targetPath;
  }
}

class DcCliExecutionError extends ExportExtensionsError {
  readonly stdout: string;
  readonly stderr: string;

  constructor(message: string, stdout: string, stderr: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DcCliExecutionError';
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

class HubAuthenticationError extends DcCliExecutionError {
  constructor(hubName: string, stdout: string, stderr: string, cause?: unknown) {
    super(`Failed to authenticate with hub "${hubName}".`, stdout, stderr, cause);
    this.name = 'HubAuthenticationError';
  }
}

type ExtensionFileSummary = {
  fileName: string;
  filePath: string;
  id?: string;
  url?: string;
  description?: string;
};

type ExportExtensionsResult = {
  mode: ExportMode;
  outputDir: string;
  totalFilesInHub: number;
  totalFilesDownloaded: number;
  kept: ExtensionFileSummary[];
  removed: ExtensionFileSummary[];
  existing: ExtensionFileSummary[];
  pattern: RegExp;
  filtered: boolean;
};

type ExportExtensionsParams = {
  hub: Amplience.HubConfig;
  outputDir: string;
  pattern: string;
  mode: ExportMode;
  onBeforeFiltering?: (preview: ExportExtensionsResult) => Promise<boolean>;
};

/**
 * Export extensions for the selected hub using the specified mode.
 *
 * @param params - Hub configuration, output directory, pattern, and export mode
 * @example
 * await exportExtensions({ hub, outputDir: './exports/extensions', pattern: 'XXXX', mode: 'full-overwrite' });
 */
async function exportExtensions(params: ExportExtensionsParams): Promise<ExportExtensionsResult> {
  const { hub, outputDir, pattern, mode, onBeforeFiltering } = params;
  const resolvedOutputDir = path.resolve(outputDir);
  const timestamp = Date.now();
  const tempDir = path.resolve('./temp/export', `${timestamp}`, 'extensions');

  try {
    await ensureExportDirectory(tempDir);

    const regex = buildFilterRegex(pattern);
    const ampService = new AmplienceService(hub);

    // Fetch extension list from hub API
    const hubExtensions = await fetchHubExtensions(ampService);

    // Download and prepare based on mode (but don't commit changes yet)
    let result: ExportExtensionsResult;

    switch (mode) {
      case 'full-overwrite':
        result = await prepareFullOverwrite(hub, resolvedOutputDir, tempDir, regex, hubExtensions);
        break;
      case 'overwrite-matching':
        result = await prepareOverwriteMatching(
          hub,
          resolvedOutputDir,
          tempDir,
          regex,
          hubExtensions
        );
        break;
      case 'get-missing':
        result = await prepareGetMissing(hub, resolvedOutputDir, tempDir, regex, hubExtensions);
        break;
    }

    // Preview logic - ask before committing
    let shouldApplyFilter = true;
    if (onBeforeFiltering) {
      shouldApplyFilter = await onBeforeFiltering(result);
    }

    result.filtered = shouldApplyFilter;

    if (!shouldApplyFilter) {
      // Rollback - clean temp and don't modify target
      await cleanupTempDirectory(tempDir);

      return result;
    }

    // Now commit the changes to target directory
    await ensureExportDirectory(resolvedOutputDir);

    switch (mode) {
      case 'full-overwrite':
        // Delete existing files, then copy matching from temp
        if (result.existing.length > 0) {
          await removeFiles(result.existing);
        }
        await copyFiles(result.kept, tempDir, resolvedOutputDir);
        break;
      case 'overwrite-matching':
        // Only copy matching files (overwrites existing)
        await copyFiles(result.kept, tempDir, resolvedOutputDir);
        break;
      case 'get-missing':
        // Copy only missing files
        await copyFiles(result.kept, tempDir, resolvedOutputDir);
        break;
    }

    // Cleanup temp directory after successful operation
    await cleanupTempDirectory(tempDir);

    return result;
  } catch (error) {
    // Cleanup temp on error
    await cleanupTempDirectory(tempDir).catch(() => {
      // Ignore cleanup errors
    });

    if (error instanceof ExportExtensionsError) {
      throw error;
    }

    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ExportExtensionsError(`Failed to export extensions: ${fallbackMessage}`, error);
  }
}

/**
 * Fetch all extensions from hub using API
 */
async function fetchHubExtensions(ampService: AmplienceService): Promise<Amplience.Extension[]> {
  const progress = createProgressBar(1, 'Fetching extension list from hub');

  try {
    const extensions = await ampService.getExtensions((fetched, total) => {
      progress.setTotal(total);
      progress.update(fetched);
    });

    progress.stop();

    return extensions;
  } catch (error) {
    progress.stop();
    throw new ExportExtensionsError(
      'Failed to fetch extensions from hub API.',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Mode: Full Overwrite (Preparation phase)
 * - Identify all existing files
 * - Download all extensions to temp
 * - Filter by regex
 * - Return plan (but don't modify target directory yet)
 */
async function prepareFullOverwrite(
  hub: Amplience.HubConfig,
  targetDir: string,
  tempDir: string,
  regex: RegExp,
  hubExtensions: Amplience.Extension[]
): Promise<ExportExtensionsResult> {
  // Get existing files (but don't delete them yet)
  await ensureExportDirectory(targetDir);
  const existingFiles = await collectExtensionSummariesFromDirectory(targetDir);

  // Download all extensions to temp
  await runDcCliExport(hub, tempDir);

  // Collect and filter downloaded files
  const downloadedSummaries = await collectExtensionSummariesFromDirectory(tempDir);
  const { kept, removed } = filterExtensions(downloadedSummaries, regex);

  return {
    mode: 'full-overwrite',
    outputDir: targetDir,
    totalFilesInHub: hubExtensions.length,
    totalFilesDownloaded: downloadedSummaries.length,
    kept,
    removed,
    existing: existingFiles,
    pattern: regex,
    filtered: true,
  };
}

/**
 * Mode: Overwrite Matching (Preparation phase)
 * - Keep existing non-matching files
 * - Download all extensions to temp
 * - Filter by regex
 * - Return plan (but don't copy to target yet)
 */
async function prepareOverwriteMatching(
  hub: Amplience.HubConfig,
  targetDir: string,
  tempDir: string,
  regex: RegExp,
  hubExtensions: Amplience.Extension[]
): Promise<ExportExtensionsResult> {
  await ensureExportDirectory(targetDir);

  // Get existing files
  const existingFiles = await collectExtensionSummariesFromDirectory(targetDir);

  // Download all extensions to temp
  await runDcCliExport(hub, tempDir);

  // Collect and filter downloaded files
  const downloadedSummaries = await collectExtensionSummariesFromDirectory(tempDir);
  const { kept, removed } = filterExtensions(downloadedSummaries, regex);

  return {
    mode: 'overwrite-matching',
    outputDir: targetDir,
    totalFilesInHub: hubExtensions.length,
    totalFilesDownloaded: downloadedSummaries.length,
    kept,
    removed,
    existing: existingFiles,
    pattern: regex,
    filtered: true,
  };
}

/**
 * Mode: Get Missing (Preparation phase)
 * - Keep all existing files
 * - Identify missing extensions by comparing hub IDs with local filenames
 * - Download missing extensions to temp
 * - Return plan (but don't copy to target yet)
 */
async function prepareGetMissing(
  hub: Amplience.HubConfig,
  targetDir: string,
  tempDir: string,
  regex: RegExp,
  hubExtensions: Amplience.Extension[]
): Promise<ExportExtensionsResult> {
  await ensureExportDirectory(targetDir);

  // Get existing files
  const existingFiles = await collectExtensionSummariesFromDirectory(targetDir);
  const existingExtensionIds = new Set(
    existingFiles.map(f => path.basename(f.fileName, '.json')).filter(id => id.length > 0)
  );

  // Find missing extensions
  const missingExtensions = hubExtensions.filter(
    ext => !existingExtensionIds.has(ext.id || ext.name)
  );

  // If no missing extensions, return early
  if (missingExtensions.length === 0) {
    return {
      mode: 'get-missing',
      outputDir: targetDir,
      totalFilesInHub: hubExtensions.length,
      totalFilesDownloaded: 0,
      kept: [],
      removed: [],
      existing: existingFiles,
      pattern: regex,
      filtered: true,
    };
  }

  // Download ALL extensions to temp first (dc-cli doesn't support selective export)
  await runDcCliExport(hub, tempDir);

  // Collect downloaded files
  const downloadedSummaries = await collectExtensionSummariesFromDirectory(tempDir);

  // Filter to only missing extensions
  const missingExtensionIds = new Set(missingExtensions.map(ext => ext.id));
  const toAdd = downloadedSummaries.filter(
    summary => summary.id && missingExtensionIds.has(summary.id)
  );

  return {
    mode: 'get-missing',
    outputDir: targetDir,
    totalFilesInHub: hubExtensions.length,
    totalFilesDownloaded: toAdd.length,
    kept: toAdd,
    removed: [],
    existing: existingFiles,
    pattern: regex,
    filtered: true,
  };
}

/**
 * Filter extensions by regex pattern
 */
function filterExtensions(
  extensions: ExtensionFileSummary[],
  regex: RegExp
): { kept: ExtensionFileSummary[]; removed: ExtensionFileSummary[] } {
  const kept: ExtensionFileSummary[] = [];
  const removed: ExtensionFileSummary[] = [];

  const progress = createProgressBar(extensions.length, 'Filtering extensions');

  for (const extension of extensions) {
    if (extensionMatchesPattern(extension, regex)) {
      kept.push(extension);
    } else {
      removed.push(extension);
    }
    progress.increment();
  }

  progress.stop();

  return { kept, removed };
}

/**
 * Check if an extension's metadata matches the provided regex pattern.
 *
 * @param extension - Parsed metadata for the exported extension file
 * @param regex - Compiled regex used for filtering
 * @example
 * const matches = extensionMatchesPattern({ id: 'gnh-demo', fileName: 'gnh.json', filePath: '/tmp/gnh.json' }, /gnh/);
 */
function extensionMatchesPattern(extension: ExtensionFileSummary, regex: RegExp): boolean {
  const candidates = [extension.id, extension.url, extension.description];

  return candidates.some(candidate => {
    if (typeof candidate !== 'string' || candidate.length === 0) {
      return false;
    }

    regex.lastIndex = 0;

    return regex.test(candidate);
  });
}

function buildFilterRegex(pattern: string): RegExp {
  const normalized = pattern.trim().length > 0 ? pattern.trim() : '.*';

  try {
    return new RegExp(normalized, 'i');
  } catch (error) {
    throw new InvalidPatternError(normalized, error);
  }
}

async function ensureExportDirectory(directory: string): Promise<void> {
  try {
    await fs.mkdir(directory, { recursive: true });
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to create export directory. Check permissions for ${directory}.`,
      directory,
      error
    );
  }
}

async function collectExtensionJsonFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(JSON_EXTENSION))
      .map(entry => path.join(directory, entry.name));
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to read export directory. Check permissions for ${directory}.`,
      directory,
      error
    );
  }
}

async function collectExtensionSummariesFromDirectory(
  directory: string
): Promise<ExtensionFileSummary[]> {
  const files = await collectExtensionJsonFiles(directory);
  const summaries: ExtensionFileSummary[] = [];

  for (const filePath of files) {
    try {
      const summary = await readExtensionMetadata(filePath);
      summaries.push(summary);
    } catch (error) {
      // Re-throw DirectoryAccessError (file system errors)
      if (error instanceof DirectoryAccessError) {
        throw error;
      }
      // Skip files that can't be parsed
      summaries.push({
        fileName: path.basename(filePath),
        filePath,
      });
    }
  }

  return summaries;
}

async function readExtensionMetadata(filePath: string): Promise<ExtensionFileSummary> {
  try {
    const contents = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(contents);

    return {
      fileName: path.basename(filePath),
      filePath,
      id: data.id,
      url: data.url,
      description: data.description,
    };
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to read exported extension file ${filePath}.`,
      filePath,
      error
    );
  }
}

async function copyFiles(
  files: ExtensionFileSummary[],
  sourceDir: string,
  targetDir: string
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const progress = createProgressBar(files.length, 'Copying extension files');

  for (const file of files) {
    try {
      const sourcePath = path.join(sourceDir, file.fileName);
      const targetPath = path.join(targetDir, file.fileName);

      await fs.copyFile(sourcePath, targetPath);
      progress.increment();
    } catch (error) {
      progress.stop();
      throw new DirectoryAccessError(
        `Unable to copy file ${file.fileName} to ${targetDir}.`,
        targetDir,
        error
      );
    }
  }

  progress.stop();
}

async function removeFiles(
  files: ExtensionFileSummary[],
  options: { ignoreErrors?: boolean } = {}
): Promise<void> {
  for (const summary of files) {
    try {
      await fs.unlink(summary.filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (options.ignoreErrors && err?.code === 'ENOENT') {
        continue;
      }
      if (options.ignoreErrors) {
        continue;
      }

      if (err?.code === 'ENOENT') {
        continue;
      }

      throw new DirectoryAccessError(
        `Unable to remove file ${summary.filePath}. Check permissions and try again.`,
        summary.filePath,
        error
      );
    }
  }
}

async function runDcCliExport(hub: Amplience.HubConfig, outputDir: string): Promise<void> {
  const downloadProgress = createProgressBar(1, 'Downloading extensions');
  try {
    await createDcCliCommand()
      .withHub(hub)
      .withCommand(`extension export "${outputDir}"`)
      .execute();
    downloadProgress.increment();
  } catch (error) {
    const stdout = readProcessOutput((error as { stdout?: unknown })?.stdout);
    const stderr = readProcessOutput((error as { stderr?: unknown })?.stderr);

    if (isAuthenticationError(stdout) || isAuthenticationError(stderr)) {
      throw new HubAuthenticationError(hub.name, stdout, stderr, error);
    }

    throw new DcCliExecutionError('dc-cli command failed.', stdout, stderr, error);
  } finally {
    downloadProgress.stop();
  }
}

async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

function readProcessOutput(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAuthenticationError(output: string): boolean {
  if (!output) {
    return false;
  }

  return /401|unauthor/i.test(output);
}

export type { ExportExtensionsParams, ExportExtensionsResult, ExtensionFileSummary };
/**
 * Export mode determines how existing files in the target directory are handled
 */
export type ExportMode = 'full-overwrite' | 'overwrite-matching' | 'get-missing';
