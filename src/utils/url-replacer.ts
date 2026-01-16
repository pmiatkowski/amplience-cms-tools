/**
 * Replace {{ORIGIN_REPLACE}} placeholder in templated URI with hub-specific URL
 *
 * If the templatedUri does not contain {{ORIGIN_REPLACE}}, it is returned unchanged.
 * This allows for mixed configurations where some URIs are hub-specific and others are fixed.
 *
 * @param templatedUri - URI template that may contain {{ORIGIN_REPLACE}} placeholder
 * @param hubUrl - Hub-specific URL to replace the placeholder with
 * @returns URI with placeholder replaced by hub URL, or unchanged if no placeholder present
 * @throws Error if either parameter is empty
 *
 * @example
 * // With placeholder
 * replaceOriginPlaceholder('{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}', 'https://vse.dev.example.com')
 * // Returns: 'https://vse.dev.example.com/preview?id={{contentItemId}}'
 *
 * @example
 * // Without placeholder - returns unchanged
 * replaceOriginPlaceholder('https://fixed.com/preview', 'https://vse.dev.example.com')
 * // Returns: 'https://fixed.com/preview'
 */
export function replaceOriginPlaceholder(templatedUri: string, hubUrl: string): string {
  // Validate inputs
  if (!templatedUri) {
    throw new Error('Template URI cannot be empty');
  }

  if (!hubUrl) {
    throw new Error('Hub URL cannot be empty');
  }

  // If no placeholder, return URI unchanged
  if (!templatedUri.includes('{{ORIGIN_REPLACE}}')) {
    return templatedUri;
  }

  // Normalize hub URL
  let normalizedHubUrl = hubUrl.trim();

  // Add https:// if no protocol specified
  if (!normalizedHubUrl.startsWith('http://') && !normalizedHubUrl.startsWith('https://')) {
    normalizedHubUrl = `https://${normalizedHubUrl}`;
  }

  // Remove trailing slash from hub URL to avoid double slashes
  normalizedHubUrl = normalizedHubUrl.replace(/\/$/, '');

  // Replace the placeholder
  const result = templatedUri.replace('{{ORIGIN_REPLACE}}', normalizedHubUrl);

  return result;
}
