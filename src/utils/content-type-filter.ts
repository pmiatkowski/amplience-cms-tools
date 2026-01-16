/**
 * Filters content types by matching their contentTypeUri against a regex pattern.
 *
 * @param contentTypes - Array of content types to filter
 * @param pattern - Regular expression pattern as a string
 * @param options - Optional filtering options
 * @returns Array of content types matching the pattern
 * @throws Error if the regex pattern is invalid
 *
 * @example
 * ```ts
 * const filtered = filterContentTypesByRegex(
 *   contentTypes,
 *   '^https://schema\\.example\\.com/.*'
 * );
 * ```
 */
export function filterContentTypesByRegex(
  contentTypes: Amplience.ContentType[],
  pattern: string,
  options: FilterOptions = {}
): Amplience.ContentType[] {
  const { caseInsensitive = false } = options;

  // Create regex with appropriate flags
  const flags = caseInsensitive ? 'i' : '';
  let regex: RegExp;

  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(
      `Invalid regex pattern: ${pattern}. ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Filter content types by matching contentTypeUri against regex
  return contentTypes.filter(contentType => regex.test(contentType.contentTypeUri));
}

/**
 * Options for filtering content types
 */
export type FilterOptions = {
  /** Whether to perform case-insensitive matching */
  caseInsensitive?: boolean;
};
