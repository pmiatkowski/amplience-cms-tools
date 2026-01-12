/**
 * Format import extensions result into human-readable summary string
 *
 * Creates a multi-line summary showing counts of total files, matched files,
 * filtered files, invalid files, and successfully imported files. If there
 * are invalid files, includes detailed error information for each.
 *
 * @param result - Import extensions operation result with counts and invalid file details
 * @example
 * const result: Amplience.ImportExtensionsResult = {
 *   sourceDir: './exports/extensions',
 *   totalFilesFound: 10,
 *   matchedCount: 8,
 *   filteredOutCount: 1,
 *   invalidCount: 1,
 *   importedCount: 8,
 *   invalidFiles: [{ filePath: 'bad.json', error: 'Invalid JSON' }]
 * };
 * const summary = formatImportSummary(result);
 * console.log(summary);
 * // Output:
 * // Source directory: ./exports/extensions
 * // Total files found: 10
 * // Files matched: 8
 * // Files filtered out: 1
 * // Invalid files: 1
 * // Successfully imported: 8
 * //
 * // Invalid files:
 * //   - bad.json: Invalid JSON
 */
export function formatImportSummary(result: Amplience.ImportExtensionsResult): string {
  const lines: string[] = [];

  lines.push(`Source directory: ${result.sourceDir}`);
  lines.push(`Total files found: ${result.totalFilesFound}`);
  lines.push(`Files matched: ${result.matchedCount}`);
  lines.push(`Files filtered out: ${result.filteredOutCount}`);
  lines.push(`Invalid files: ${result.invalidCount}`);
  lines.push(`Successfully imported: ${result.importedCount}`);

  // Add invalid file details if any
  if (result.invalidFiles.length > 0) {
    lines.push(''); // Empty line for separation
    lines.push('Invalid files:');
    for (const invalidFile of result.invalidFiles) {
      lines.push(`  - ${invalidFile.filePath}: ${invalidFile.error}`);
    }
  }

  return lines.join('\n');
}
