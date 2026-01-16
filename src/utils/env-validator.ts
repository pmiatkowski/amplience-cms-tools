

/**
 * Get default content types list file path from environment variables
 *
 * @returns The default file path, or undefined if not set
 *
 * @example
 * const filePath = getDefaultContentTypesListFilePath();
 * // Returns: './config/content-types.json' or undefined
 */
export function getDefaultContentTypesListFilePath(): string | undefined {
  const filePath = process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE;

  if (!filePath || filePath.trim() === '') {
    return undefined;
  }

  return filePath.trim();
}




/**
 * Get default schema ID pattern from environment variables
 *
 * @returns The default schema ID regex pattern, or undefined if not set
 *
 * @example
 * const pattern = getDefaultSchemaIdPattern();
 * // Returns: 'https://schema.example.com/.*' or undefined
 */
export function getDefaultSchemaIdPattern(): string | undefined {
  const pattern = process.env.AMP_DEFAULT_SCHEMA_ID;

  if (!pattern || pattern.trim() === '') {
    return undefined;
  }

  return pattern.trim();
}



/**
 * Get default visualization config file path from environment variables
 *
 * @returns The default file path, or undefined if not set
 *
 * @example
 * const filePath = getDefaultVisualizationConfigFilePath();
 * // Returns: './config/visualizations.json' or undefined
 */
export function getDefaultVisualizationConfigFilePath(): string | undefined {
  const filePath = process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE;

  if (!filePath || filePath.trim() === '') {
    return undefined;
  }

  return filePath.trim();
}


/**
 * Get visualization URL for a specific hub from environment variables
 *
 * @param hubName - The hub name (e.g., 'DEV', 'PROD')
 * @returns The HTTPS visualization URL for the hub
 * @throws Error if the URL is not configured or invalid
 *
 * @example
 * const url = getHubVisualizationUrl('DEV');
 * // Returns: 'https://vse.dev.example.com'
 */
export function getHubVisualizationUrl(hubName: string): string {
  const envKey = `AMP_HUB_${hubName}_VISUALISATION_APP_URL`;
  const url = process.env[envKey];

  if (!url || url.trim() === '') {
    throw new Error(
      `Visualization URL not configured for hub "${hubName}". ` +
        `Please set ${envKey} environment variable.`
    );
  }

  // Validate that it's a valid HTTPS URL
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      throw new Error('Visualization URL must be a valid HTTPS URL');
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Visualization URL must be a valid HTTPS URL');
    }
    throw err;
  }

  return url.trim();
}
