import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Validate an extension JSON file
 *
 * Checks that the file:
 * - Can be read from filesystem
 * - Contains valid JSON syntax
 * - Is a JSON object (not array, string, etc.)
 * - Has a non-empty id field
 *
 * Invalid files are skipped with warnings, allowing import to continue with valid files.
 *
 * @param filePath - Absolute path to extension JSON file
 * @example
 * const result = await validateExtensionFile('/path/to/extension.json');
 * if (result.isValid) {
 *   console.log('Valid extension:', result.extension.id);
 * } else {
 *   console.warn('Invalid file:', result.error);
 * }
 */
export async function validateExtensionFile(filePath: string): Promise<ValidationResult> {
  const fileName = path.basename(filePath);

  // Read file
  let fileContent: string;
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    return {
      isValid: false,
      error: `Cannot read file "${fileName}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON in "${fileName}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Check if parsed result is an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: `Extension file must contain a JSON object in "${fileName}"`,
    };
  }

  const extension = parsed as Amplience.Extension;

  // Validate required field: id
  if (!extension.id || typeof extension.id !== 'string' || extension.id.trim().length === 0) {
    return {
      isValid: false,
      error: `Missing required field: id in "${fileName}"`,
    };
  }

  return {
    isValid: true,
    extension,
  };
}

/**
 * Result of validating an extension file
 */
export type ValidationResult = {
  isValid: boolean;
  extension?: Amplience.Extension;
  error?: string;
};
