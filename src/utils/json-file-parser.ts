import fs from 'fs';

/**
 * Content types list structure - array of schema URIs
 */
export type ContentTypesList = string[];



/**
 * Parse and validate content types list from JSON file
 *
 * @param filePath - Path to JSON file containing array of content type URIs
 * @returns Array of content type URI strings
 * @throws Error if file cannot be read, JSON is invalid, or structure is incorrect
 *
 * @example
 * const contentTypes = parseContentTypesList('./content-types.json');
 * // Returns: ['https://schema.example.com/type1.json', ...]
 */
export function parseContentTypesList(filePath: string): ContentTypesList {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;

    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new Error('Invalid JSON in content types list file');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Content types list must be an array of strings');
    }

    if (parsed.length === 0) {
      throw new Error('Content types list cannot be empty');
    }

    if (!parsed.every(item => typeof item === 'string')) {
      throw new Error('Content types list must be an array of strings');
    }

    return parsed;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('ENOENT')) {
        throw new Error(`Failed to read content types list file: ${filePath}`);
      }
      throw err;
    }
    throw new Error('Failed to read content types list file');
  }
}





/**
 * Parse and validate visualization config from JSON file
 *
 * @param filePath - Path to JSON file containing visualization configuration
 * @returns Validated visualization config object
 * @throws Error if file cannot be read, JSON is invalid, or structure is incorrect
 *
 * @example
 * const config = parseVisualizationConfig('./visualizations.json');
 * // Returns: { visualizations: [{ label: 'Preview', templatedUri: '...' }] }
 */
export function parseVisualizationConfig(filePath: string): VisualizationConfig {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;

    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new Error('Invalid JSON in visualization config file');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Visualization config must be an object with visualizations array');
    }

    const config = parsed as Record<string, unknown>;

    if (!('visualizations' in config) || !Array.isArray(config.visualizations)) {
      throw new Error('Visualization config must be an object with visualizations array');
    }

    if (config.visualizations.length === 0) {
      throw new Error('Visualizations array cannot be empty');
    }

    // Validate each visualization item
    for (const item of config.visualizations) {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('label' in item) ||
        !('templatedUri' in item) ||
        typeof item.label !== 'string' ||
        typeof item.templatedUri !== 'string'
      ) {
        throw new Error('Each visualization must have label and templatedUri properties');
      }
    }

    return config as VisualizationConfig;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('ENOENT')) {
        throw new Error(`Failed to read visualization config file: ${filePath}`);
      }
      throw err;
    }
    throw new Error('Failed to read visualization config file');
  }
}




/**
 * Visualization config structure
 */
export type VisualizationConfig = {
  visualizations: VisualizationItem[];
}


/**
 * Visualization item structure
 */
export type VisualizationItem = {
  label: string;
  templatedUri: string;
  default?: boolean;
}
