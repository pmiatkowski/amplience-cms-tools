import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getHubVisualizationUrl,
  getDefaultSchemaIdPattern,
  getDefaultContentTypesListFilePath,
  getDefaultVisualizationConfigFilePath,
} from './env-validator';

describe('Environment Variable Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('getHubVisualizationUrl', () => {
    it('should return visualization URL for valid hub name', () => {
      process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com';

      const result = getHubVisualizationUrl('DEV');

      expect(result).toBe('https://vse.dev.example.com');
    });

    it('should throw error if hub visualization URL is not set', () => {
      expect(() => {
        getHubVisualizationUrl('PROD');
      }).toThrow('Visualization URL not configured for hub "PROD"');
    });

    it('should throw error if hub visualization URL is empty', () => {
      process.env.AMP_HUB_STAGING_VISUALISATION_APP_URL = '';

      expect(() => {
        getHubVisualizationUrl('STAGING');
      }).toThrow('Visualization URL not configured for hub "STAGING"');
    });

    it('should throw error if hub visualization URL is whitespace only', () => {
      process.env.AMP_HUB_TEST_VISUALISATION_APP_URL = '   ';

      expect(() => {
        getHubVisualizationUrl('TEST');
      }).toThrow('Visualization URL not configured for hub "TEST"');
    });

    it('should throw error if visualization URL is not a valid HTTPS URL', () => {
      process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'http://vse.dev.example.com';

      expect(() => {
        getHubVisualizationUrl('DEV');
      }).toThrow('Visualization URL must be a valid HTTPS URL');
    });

    it('should throw error if visualization URL is not a valid URL format', () => {
      process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'not-a-url';

      expect(() => {
        getHubVisualizationUrl('DEV');
      }).toThrow('Visualization URL must be a valid HTTPS URL');
    });

    it('should accept visualization URL with path', () => {
      process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com/app';

      const result = getHubVisualizationUrl('DEV');

      expect(result).toBe('https://vse.dev.example.com/app');
    });

    it('should accept visualization URL with port', () => {
      process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com:8080';

      const result = getHubVisualizationUrl('DEV');

      expect(result).toBe('https://vse.dev.example.com:8080');
    });

    it('should handle hub names with underscores', () => {
      process.env.AMP_HUB_DEV_US_VISUALISATION_APP_URL = 'https://vse.dev.us.example.com';

      const result = getHubVisualizationUrl('DEV_US');

      expect(result).toBe('https://vse.dev.us.example.com');
    });
  });

  describe('getDefaultSchemaIdPattern', () => {
    it('should return schema ID pattern if set', () => {
      process.env.AMP_DEFAULT_SCHEMA_ID = 'https://schema.example.com/.*';

      const result = getDefaultSchemaIdPattern();

      expect(result).toBe('https://schema.example.com/.*');
    });

    it('should return undefined if schema ID pattern is not set', () => {
      delete process.env.AMP_DEFAULT_SCHEMA_ID;

      const result = getDefaultSchemaIdPattern();

      expect(result).toBeUndefined();
    });

    it('should return undefined if schema ID pattern is empty', () => {
      process.env.AMP_DEFAULT_SCHEMA_ID = '';

      const result = getDefaultSchemaIdPattern();

      expect(result).toBeUndefined();
    });

    it('should return undefined if schema ID pattern is whitespace only', () => {
      process.env.AMP_DEFAULT_SCHEMA_ID = '   ';

      const result = getDefaultSchemaIdPattern();

      expect(result).toBeUndefined();
    });

    it('should accept regex pattern as schema ID', () => {
      process.env.AMP_DEFAULT_SCHEMA_ID = '.*product.*';

      const result = getDefaultSchemaIdPattern();

      expect(result).toBe('.*product.*');
    });
  });

  describe('getDefaultContentTypesListFilePath', () => {
    it('should return file path if set', () => {
      process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE =
        './config/content-types.json';

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBe('./config/content-types.json');
    });

    it('should return undefined if file path is not set', () => {
      delete process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE;

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBeUndefined();
    });

    it('should return undefined if file path is empty', () => {
      process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '';

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBeUndefined();
    });

    it('should return undefined if file path is whitespace only', () => {
      process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '   ';

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBeUndefined();
    });

    it('should accept absolute file path', () => {
      process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE =
        '/absolute/path/to/content-types.json';

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBe('/absolute/path/to/content-types.json');
    });

    it('should accept relative file path', () => {
      process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE =
        '../config/content-types.json';

      const result = getDefaultContentTypesListFilePath();

      expect(result).toBe('../config/content-types.json');
    });
  });

  describe('getDefaultVisualizationConfigFilePath', () => {
    it('should return file path if set', () => {
      process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE =
        './config/visualizations.json';

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBe('./config/visualizations.json');
    });

    it('should return undefined if file path is not set', () => {
      delete process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE;

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBeUndefined();
    });

    it('should return undefined if file path is empty', () => {
      process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE = '';

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBeUndefined();
    });

    it('should return undefined if file path is whitespace only', () => {
      process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE = '   ';

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBeUndefined();
    });

    it('should accept absolute file path', () => {
      process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE =
        '/absolute/path/to/visualizations.json';

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBe('/absolute/path/to/visualizations.json');
    });

    it('should accept relative file path', () => {
      process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE =
        '../config/visualizations.json';

      const result = getDefaultVisualizationConfigFilePath();

      expect(result).toBe('../config/visualizations.json');
    });
  });
});
