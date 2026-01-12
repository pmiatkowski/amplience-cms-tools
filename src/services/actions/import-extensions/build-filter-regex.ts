import { InvalidPatternError } from '../import-extensions';

/**
 * Build a case-insensitive RegExp from a string pattern
 *
 * Converts user-provided filter pattern into a compiled regex for matching
 * extension fields. Empty or whitespace-only patterns are treated as match-all (.*).
 *
 * @param pattern - Regex pattern string to compile
 * @throws InvalidPatternError if pattern cannot be compiled
 * @example
 * const regex = buildFilterRegex('my-extension-.*');
 * regex.test('my-extension-test'); // true
 * @example
 * const regex = buildFilterRegex(''); // Empty pattern matches all
 * regex.test('anything'); // true
 * @example
 * buildFilterRegex('[invalid'); // Throws InvalidPatternError
 */
export function buildFilterRegex(pattern: string): RegExp {
  // Normalize pattern: treat empty/whitespace as match-all
  const normalizedPattern = pattern.trim().length > 0 ? pattern.trim() : '.*';

  try {
    // Build case-insensitive regex
    return new RegExp(normalizedPattern, 'i');
  } catch (error) {
    throw new InvalidPatternError(pattern, error);
  }
}
