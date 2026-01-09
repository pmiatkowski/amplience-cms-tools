import * as fs from 'fs/promises';
import * as path from 'path';

import { DirectoryAccessError } from '../import-extensions';

export { copyAndPrepareExtensions };

/**
 * Copy extension JSON files from source directory to target temp directory
 *
 * Reads all files from source directory, filters for .json files, and copies
 * them to the target directory. Creates target directory if it doesn't exist.
 * This ensures source files remain unmodified during the import process.
 *
 * @param sourceDir - Absolute path to source directory containing extension JSON files
 * @param targetDir - Absolute path to target temp directory for prepared files
 * @example
 * const copiedFiles = await copyAndPrepareExtensions(
 *   './exports/extensions',
 *   './temp_import_1234/extensions'
 * );
 * // Returns: ['./temp_import_1234/extensions/ext1.json', './temp_import_1234/extensions/ext2.json']
 */
async function copyAndPrepareExtensions(sourceDir: string, targetDir: string): Promise<string[]> {
  try {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to create target directory. Check permissions for ${targetDir}.`,
      targetDir,
      error
    );
  }

  let sourceFiles: string[];
  try {
    sourceFiles = await fs.readdir(sourceDir);
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to read source directory. Check that ${sourceDir} exists and is accessible.`,
      sourceDir,
      error
    );
  }

  // Filter for JSON files only
  const jsonFiles = sourceFiles.filter(file => file.endsWith('.json'));

  // Copy each JSON file to target directory
  const copiedPaths: string[] = [];
  for (const filename of jsonFiles) {
    const sourcePath = path.join(sourceDir, filename);
    const targetPath = path.join(targetDir, filename);

    try {
      await fs.copyFile(sourcePath, targetPath);
      copiedPaths.push(targetPath);
    } catch (error) {
      throw new DirectoryAccessError(
        `Unable to copy file from ${sourcePath} to ${targetPath}.`,
        sourcePath,
        error
      );
    }
  }

  return copiedPaths;
}
