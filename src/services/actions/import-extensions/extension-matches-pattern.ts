/**
 * Test if an extension matches a regex pattern
 *
 * Tests the pattern against extension's id, url, and description fields.
 * Returns true if any field matches the pattern.
 *
 * @param extension - Extension object to test
 * @param pattern - Compiled regex to test against
 * @example
 * const extension = { id: 'my-extension', url: 'https://example.com', description: 'Test' };
 * const regex = /my-extension/i;
 * extensionMatchesPattern(extension, regex); // true
 * @example
 * const extension = { id: 'abc', url: 'https://example.com' };
 * const regex = /xyz/i;
 * extensionMatchesPattern(extension, regex); // false
 */
export function extensionMatchesPattern(extension: Amplience.Extension, pattern: RegExp): boolean {
  // Test against id (required field)
  if (pattern.test(extension.id)) {
    return true;
  }

  // Test against url (optional field)
  if (extension.url && pattern.test(extension.url)) {
    return true;
  }

  // Test against description (optional field)
  if (extension.description && pattern.test(extension.description)) {
    return true;
  }

  return false;
}
