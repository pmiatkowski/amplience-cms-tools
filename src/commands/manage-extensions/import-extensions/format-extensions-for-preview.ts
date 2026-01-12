import * as path from 'path';

import type { ExtensionWithPath } from '~/services/actions/import-extensions/filter-extensions';

/**
 * Preview row for display table
 */
type PreviewRow = Record<string, unknown>;

/**
 * Format extensions for preview table display
 *
 * Converts extension data into table rows suitable for console.table display.
 * Shows Name, URL, Description, and filename for each extension.
 * Truncates long values for readability.
 *
 * @param extensions - List of extensions with file paths to format
 * @example
 * const extensions = [
 *   { extension: { name: 'test', url: 'https://example.com' }, filePath: '/path/to/test.json' }
 * ];
 * const rows = formatExtensionsForPreview(extensions);
 * displayTable(rows);
 */
export function formatExtensionsForPreview(extensions: ExtensionWithPath[]): PreviewRow[] {
  return extensions.map(({ extension, filePath }) => ({
    Name: extension.name || 'N/A',
    URL: truncate(extension.url || 'N/A', 80),
    Description: truncate(extension.description || 'N/A', 100),
    File: extractFilename(filePath),
  }));
}

/**
 * Extract filename from path, handling both Unix and Windows separators
 */
function extractFilename(filePath: string): string {
  // Normalize path separators to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');

  return path.basename(normalizedPath);
}

/**
 * Truncate string to max length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength - 3) + '...';
}
