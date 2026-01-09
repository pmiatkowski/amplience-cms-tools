import type { ExportExtensionsResult } from '~/services/actions/export-extensions';

/**
 * Build human-readable summary lines for an extension export operation.
 */
export function formatExportSummary(result: ExportExtensionsResult): string[] {
  const keptIds = result.kept.map(extension => extension.id ?? extension.fileName);

  const lines: string[] = [];

  // Mode-specific summaries
  switch (result.mode) {
    case 'full-overwrite':
      lines.push(`Mode: Full overwrite`);
      lines.push(`Total extensions in hub: ${result.totalFilesInHub}`);
      lines.push(`Total downloaded: ${result.totalFilesDownloaded}`);
      lines.push(
        keptIds.length > 0
          ? `Kept (${keptIds.length}): ${keptIds.join(', ')}`
          : 'Kept: 0 (no matching extensions)'
      );
      lines.push(`Removed: ${result.removed.length}`);
      if (result.existing.length > 0) {
        lines.push(`Existing files deleted: ${result.existing.length}`);
      }
      break;

    case 'overwrite-matching':
      lines.push(`Mode: Overwrite matching only`);
      lines.push(`Total extensions in hub: ${result.totalFilesInHub}`);
      lines.push(`Total downloaded: ${result.totalFilesDownloaded}`);
      lines.push(
        keptIds.length > 0
          ? `Matching extensions updated (${keptIds.length}): ${keptIds.join(', ')}`
          : 'No matching extensions found'
      );
      lines.push(`Non-matching files preserved: ${result.existing.length}`);
      break;

    case 'get-missing':
      lines.push(`Mode: Get missing only`);
      lines.push(`Total extensions in hub: ${result.totalFilesInHub}`);
      lines.push(
        keptIds.length > 0
          ? `New extensions added (${keptIds.length}): ${keptIds.join(', ')}`
          : 'No new extensions added'
      );
      lines.push(`Existing files unchanged: ${result.existing.length}`);
      break;
  }

  lines.push(`Export directory: ${result.outputDir}`);

  if (!result.filtered) {
    lines.push('Operation was cancelled by user.');
  }

  return lines;
}
