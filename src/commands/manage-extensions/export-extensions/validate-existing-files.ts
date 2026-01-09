import * as fs from 'fs/promises';
import * as path from 'path';

type FileValidationError = {
  filePath: string;
  error: string;
};

type ValidationResult = {
  valid: boolean;
  fileCount: number;
  errors: FileValidationError[];
};

/**
 * Validate all JSON files in the target directory
 *
 * @param directory - Directory path to validate
 * @example
 * const result = await validateExistingFiles('./exports/extensions');
 * if (!result.valid) {
 *   console.error('Invalid files found:', result.errors);
 * }
 */
export async function validateExistingFiles(directory: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    fileCount: 0,
    errors: [],
  };

  try {
    const resolvedDir = path.resolve(directory);

    // Check if directory exists
    try {
      await fs.access(resolvedDir);
    } catch {
      // Directory doesn't exist, that's fine
      return result;
    }

    // Read directory contents
    const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
    const jsonFiles = entries.filter(
      entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json')
    );

    result.fileCount = jsonFiles.length;

    if (jsonFiles.length === 0) {
      return result;
    }

    // Validate each JSON file
    for (const file of jsonFiles) {
      const filePath = path.join(resolvedDir, file.name);

      try {
        // Check read permissions
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse JSON
        try {
          const parsed = JSON.parse(content);

          // Validate structure (basic extension fields)
          if (typeof parsed !== 'object' || parsed === null) {
            result.errors.push({
              filePath,
              error: 'Invalid structure: not a JSON object',
            });
            result.valid = false;
            continue;
          }

          // Extensions should have at least an id or url field
          if (!parsed.id && !parsed.url) {
            result.errors.push({
              filePath,
              error: 'Invalid extension: missing both id and url fields',
            });
            result.valid = false;
          }
        } catch (parseError) {
          result.errors.push({
            filePath,
            error: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          });
          result.valid = false;
        }
      } catch (readError) {
        const err = readError as NodeJS.ErrnoException;
        result.errors.push({
          filePath,
          error: `Cannot read file: ${err.code === 'EACCES' ? 'Permission denied' : err.message || 'Unknown error'}`,
        });
        result.valid = false;
      }
    }
  } catch (error) {
    result.errors.push({
      filePath: directory,
      error: `Cannot access directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    result.valid = false;
  }

  return result;
}
