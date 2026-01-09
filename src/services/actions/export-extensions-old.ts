import * as fs from 'fs/promises';
import * as path from 'path';

import { createDcCliCommand, createProgressBar } from '~/utils';

const JSON_EXTENSION = '.json';

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
  outputDir: string;
  totalFiles: number;
  kept: ExtensionFileSummary[];
  removed: ExtensionFileSummary[];
  pattern: RegExp;
  filtered: boolean;
};

type ExportExtensionsParams = {
  hub: Amplience.HubConfig;
  outputDir: string;
  pattern: string;
  onBeforeFiltering?: (preview: ExportExtensionsResult) => Promise<boolean>;
};

/**
 * Export extensions for the selected hub, then filter the downloaded files by regex.
 *
 * @param params - Hub configuration, output directory, and regex pattern string
 * @example
 * await exportExtensions({ hub, outputDir: './exports/extensions', pattern: 'XXXX' });
 */
async function exportExtensions(params: ExportExtensionsParams): Promise<ExportExtensionsResult> {
  const { hub, outputDir, pattern, onBeforeFiltering } = params;
  const resolvedOutputDir = path.resolve(outputDir);
  await ensureExportDirectory(resolvedOutputDir);

  const exportedFiles: ExtensionFileSummary[] = [];

  try {
    await runDcCliExport(hub, resolvedOutputDir);

    const extensionFiles = await collectExtensionJsonFiles(resolvedOutputDir);
    const regex = buildFilterRegex(pattern);
    const kept: ExtensionFileSummary[] = [];
    const removed: ExtensionFileSummary[] = [];
    const filteringProgress =
      extensionFiles.length > 0
        ? createProgressBar(extensionFiles.length, 'Filtering extensions')
        : null;

    for (const filePath of extensionFiles) {
      const fallbackSummary: ExtensionFileSummary = {
        fileName: path.basename(filePath),
        filePath,
      };

      const summary = await readExtensionMetadata(filePath).catch(error => {
        exportedFiles.push(fallbackSummary);
        throw error;
      });

      exportedFiles.push(summary);

      if (extensionMatchesPattern(summary, regex)) {
        kept.push(summary);
      } else {
        removed.push(summary);
      }

      filteringProgress?.increment();
    }

    filteringProgress?.stop();

    let shouldApplyFilter = true;
    if (onBeforeFiltering) {
      shouldApplyFilter = await onBeforeFiltering({
        outputDir: resolvedOutputDir,
        totalFiles: extensionFiles.length,
        kept,
        removed,
        pattern: regex,
        filtered: false,
      });
    }

    if (shouldApplyFilter) {
      await removeFiles(removed);
    } else {
      await removeFiles(exportedFiles);
    }

    return {
      outputDir: resolvedOutputDir,
      totalFiles: extensionFiles.length,
      kept,
      removed,
      pattern: regex,
      filtered: shouldApplyFilter,
    };
  } catch (error) {
    await removeFiles(exportedFiles, { ignoreErrors: true });

    if (error instanceof ExportExtensionsError) {
      throw error;
    }

    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ExportExtensionsError(`Failed to export extensions: ${fallbackMessage}`, error);
  }
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

function readProcessOutput(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAuthenticationError(output: string): boolean {
  if (!output) {
    return false;
  }

  return /401|unauthor/i.test(output);
}

export {
  DcCliExecutionError,
  DirectoryAccessError,
  exportExtensions,
  ExportExtensionsError,
  extensionMatchesPattern,
  HubAuthenticationError,
  InvalidPatternError,
};
export type { ExportExtensionsParams, ExportExtensionsResult, ExtensionFileSummary };
