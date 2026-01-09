import { extensionMatchesPattern } from './extension-matches-pattern';
import { validateExtensionFile } from './validate-extension-file';

/**
 * Extension with associated file path
 */
export type ExtensionWithPath = {
  extension: Amplience.Extension;
  filePath: string;
};

/**
 * Filter extension files by pattern
 *
 * Validates each file, tests valid extensions against the pattern, and
 * categorizes results into kept, removed, and invalid lists.
 *
 * Invalid files are skipped with warnings, allowing processing to continue.
 *
 * @param filePaths - List of absolute paths to extension JSON files
 * @param pattern - Compiled regex pattern to match against
 * @example
 * const filePaths = ['/path/to/ext1.json', '/path/to/ext2.json'];
 * const pattern = /my-extension/i;
 * const result = await filterExtensions(filePaths, pattern);
 * console.log(`Kept: ${result.kept.length}, Removed: ${result.removed.length}`);
 */
export async function filterExtensions(
  filePaths: string[],
  pattern: RegExp
): Promise<FilterResult> {
  const kept: ExtensionWithPath[] = [];
  const removed: ExtensionWithPath[] = [];
  const invalid: InvalidFile[] = [];

  for (const filePath of filePaths) {
    // Validate file
    const validation = await validateExtensionFile(filePath);

    if (!validation.isValid) {
      // Skip invalid files with warning
      invalid.push({
        filePath,
        error: validation.error || 'Unknown validation error',
      });
      continue;
    }

    const extension = validation.extension!;

    // Test against pattern
    if (extensionMatchesPattern(extension, pattern)) {
      kept.push({ extension, filePath });
    } else {
      removed.push({ extension, filePath });
    }
  }

  return { kept, removed, invalid };
}

/**
 * Result of filtering extensions
 */
export type FilterResult = {
  kept: ExtensionWithPath[];
  removed: ExtensionWithPath[];
  invalid: InvalidFile[];
};

/**
 * Invalid file with error details
 */
export type InvalidFile = {
  filePath: string;
  error: string;
};
