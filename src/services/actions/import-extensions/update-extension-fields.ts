import * as fs from 'fs/promises';

import { DirectoryAccessError } from '../import-extensions';

export { updateExtensionFields, updateHubId, updateUrlOrigins };

// Extended hub config type to include optional extUrl
type HubConfigWithExtUrl = Amplience.HubConfig & { extUrl?: string };

/**
 * Update hub-specific fields in extension JSON file for target environment
 *
 * Reads the extension file, updates the hubId field, and optionally replaces
 * URL origins if the target hub has an extUrl configured. This ensures
 * extensions point to the correct hub environment after import.
 *
 * @param extensionPath - Absolute path to extension JSON file in temp directory
 * @param targetHub - Target hub configuration with hubId and optional extUrl
 * @example
 * await updateExtensionFields(
 *   '/temp/extensions/my-extension.json',
 *   { hubId: '5f8b...', name: 'PROD', patToken: 'token', extUrl: 'https://prod.amplience.net' }
 * );
 */
async function updateExtensionFields(
  extensionPath: string,
  targetHub: HubConfigWithExtUrl
): Promise<void> {
  let fileContent: string;
  try {
    fileContent = await fs.readFile(extensionPath, 'utf-8');
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to read extension file at ${extensionPath}.`,
      extensionPath,
      error
    );
  }

  let extension: Record<string, unknown>;
  try {
    extension = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in extension file ${extensionPath}: ${error}`);
  }

  // Update hubId field
  updateHubId(extension, targetHub.hubId);

  // Update URL origins if extUrl is configured
  if (targetHub.extUrl) {
    // Extract source origin from existing URLs in the extension
    const sourceOrigin = extractSourceOrigin(extension);

    if (sourceOrigin) {
      updateUrlOrigins(extension, sourceOrigin, targetHub.extUrl);
    }
  }

  try {
    await fs.writeFile(extensionPath, JSON.stringify(extension, null, 2), 'utf-8');
  } catch (error) {
    throw new DirectoryAccessError(
      `Unable to write updated extension file to ${extensionPath}.`,
      extensionPath,
      error
    );
  }
}

/**
 * Update the hubId field in an extension object
 *
 * Modifies the extension object in-place, setting the hubId field to the
 * target hub's ID. This ensures the extension is associated with the correct
 * hub after import.
 *
 * @param extension - Extension object to update (modified in-place)
 * @param targetHubId - Target hub ID to set
 * @example
 * const ext = { id: 'my-ext', hubId: 'old-hub-id' };
 * updateHubId(ext, 'new-hub-id');
 * // ext.hubId is now 'new-hub-id'
 */
function updateHubId(extension: Record<string, unknown>, targetHubId: string): void {
  extension.hubId = targetHubId;
}

/**
 * Replace URL origins throughout an extension object
 *
 * Recursively traverses the extension object and replaces all URL strings
 * that start with the source origin with the target origin. This handles
 * URLs in nested objects and arrays, preserving paths and query strings.
 *
 * URL matching is case-sensitive and only replaces exact origin matches.
 *
 * @param obj - Extension object to update (modified in-place)
 * @param sourceOrigin - Source origin to replace (e.g., 'https://old.amplience.net')
 * @param targetOrigin - Target origin to use (e.g., 'https://new.amplience.net')
 * @example
 * const ext = {
 *   url: 'https://source.amplience.net/extension',
 *   settings: { apiUrl: 'https://source.amplience.net/api' }
 * };
 * updateUrlOrigins(ext, 'https://source.amplience.net', 'https://target.amplience.net');
 * // URLs are now updated to target origin
 */
function updateUrlOrigins(
  obj: Record<string, unknown>,
  sourceOrigin: string,
  targetOrigin: string
): void {
  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      // Replace origin in URL strings
      if (value.startsWith(sourceOrigin)) {
        obj[key] = value.replace(sourceOrigin, targetOrigin);
      }
    } else if (Array.isArray(value)) {
      // Recursively process array elements
      value.forEach((item, index) => {
        if (typeof item === 'string' && item.startsWith(sourceOrigin)) {
          value[index] = item.replace(sourceOrigin, targetOrigin);
        } else if (typeof item === 'object' && item !== null) {
          updateUrlOrigins(item as Record<string, unknown>, sourceOrigin, targetOrigin);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      updateUrlOrigins(value as Record<string, unknown>, sourceOrigin, targetOrigin);
    }
  }
}

/**
 * Extract the source origin from URLs in the extension object
 *
 * Searches for URL fields in the extension (typically 'url' or similar fields)
 * and extracts the origin (protocol + hostname) to use as the source for
 * URL origin replacement.
 *
 * @param extension - Extension object to extract origin from
 */
function extractSourceOrigin(extension: Record<string, unknown>): string | null {
  // Common URL field names in extensions
  const urlFields = ['url', 'webhookUrl', 'apiUrl'];

  for (const field of urlFields) {
    const value = extension[field];
    if (typeof value === 'string' && value.startsWith('http')) {
      try {
        const url = new URL(value);

        return `${url.protocol}//${url.hostname}`;
      } catch {
        // Invalid URL, continue searching
      }
    }
  }

  // Search in nested settings object
  if (extension.settings && typeof extension.settings === 'object') {
    const settings = extension.settings as Record<string, unknown>;
    for (const key in settings) {
      const value = settings[key];
      if (typeof value === 'string' && value.startsWith('http')) {
        try {
          const url = new URL(value);

          return `${url.protocol}//${url.hostname}`;
        } catch {
          // Invalid URL, continue searching
        }
      }
    }
  }

  return null;
}
