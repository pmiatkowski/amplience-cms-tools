/**
 * Replace {{ORIGIN_REPLACE}} placeholder in templated URI with hub-specific URL
 *
 * @param templatedUri - URI template containing {{ORIGIN_REPLACE}} placeholder
 * @param hubUrl - Hub-specific URL to replace the placeholder with
 * @returns URI with placeholder replaced by hub URL
 * @throws Error if templatedUri doesn't contain placeholder or if either parameter is empty
 *
 * @example
 * replaceOriginPlaceholder('{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}', 'https://vse.dev.example.com')
 * // Returns: 'https://vse.dev.example.com/preview?id={{contentItemId}}'
 */
export function replaceOriginPlaceholder(templatedUri: string, hubUrl: string): string {
  // Validate inputs
  if (!templatedUri) {
    throw new Error('Template URI cannot be empty');
  }

  if (!hubUrl) {
    throw new Error('Hub URL cannot be empty');
  }

  if (!templatedUri.includes('{{ORIGIN_REPLACE}}')) {
    throw new Error('Template URI must contain {{ORIGIN_REPLACE}} placeholder');
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
