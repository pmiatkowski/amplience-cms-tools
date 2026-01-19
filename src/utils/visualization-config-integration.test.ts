import fs from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHubVisualizationUrl } from './env-validator';
import { parseVisualizationConfig } from './json-file-parser';
import { replaceOriginPlaceholder } from './url-replacer';
import type { VisualizationConfig } from './json-file-parser';

vi.mock('fs');

describe('Visualization Config Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should parse config, get hub URL, and replace placeholder in complete flow', () => {
    // Arrange: Setup config file
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
          default: true,
        },
        {
          label: 'Live View',
          templatedUri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com';

    // Act: Execute complete flow
    const config: VisualizationConfig = parseVisualizationConfig('./config/visualizations.json');
    const hubUrl = getHubVisualizationUrl('DEV');
    const replacedVisualizations = config.visualizations.map(viz => ({
      ...viz,
      templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
    }));

    // Assert: Verify results
    expect(config.visualizations).toHaveLength(2);
    expect(hubUrl).toBe('https://vse.dev.example.com');
    expect(replacedVisualizations[0].templatedUri).toBe(
      'https://vse.dev.example.com/preview?id={{contentItemId}}'
    );
    expect(replacedVisualizations[1].templatedUri).toBe(
      'https://vse.dev.example.com/live?id={{contentItemId}}&locale={{locale}}'
    );
  });

  it('should preserve all visualization properties during replacement', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview',
          default: true,
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_PROD_VISUALISATION_APP_URL = 'https://vse.prod.example.com';

    // Act
    const config = parseVisualizationConfig('./config/visualizations.json');
    const hubUrl = getHubVisualizationUrl('PROD');
    const replaced = config.visualizations.map(viz => ({
      ...viz,
      templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
    }));

    // Assert
    expect(replaced[0].label).toBe('Preview');
    expect(replaced[0].default).toBe(true);
    expect(replaced[0].templatedUri).toBe('https://vse.prod.example.com/preview');
  });

  it('should handle multiple visualizations with different template variables', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview/{{contentItemId}}',
        },
        {
          label: 'Live',
          templatedUri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
        },
        {
          label: 'Debug',
          templatedUri:
            '{{ORIGIN_REPLACE}}/debug/{{contentItemId}}?version={{version}}&timestamp={{timestamp}}',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_STAGING_VISUALISATION_APP_URL = 'https://vse.staging.example.com';

    // Act
    const config = parseVisualizationConfig('./config/visualizations.json');
    const hubUrl = getHubVisualizationUrl('STAGING');
    const replaced = config.visualizations.map(viz => ({
      ...viz,
      templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
    }));

    // Assert
    expect(replaced[0].templatedUri).toBe(
      'https://vse.staging.example.com/preview/{{contentItemId}}'
    );
    expect(replaced[1].templatedUri).toBe(
      'https://vse.staging.example.com/live?id={{contentItemId}}&locale={{locale}}'
    );
    expect(replaced[2].templatedUri).toBe(
      'https://vse.staging.example.com/debug/{{contentItemId}}?version={{version}}&timestamp={{timestamp}}'
    );
  });

  it('should throw error if hub URL is not configured', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    delete process.env.AMP_HUB_TEST_VISUALISATION_APP_URL;

    // Act & Assert
    expect(() => {
      const config = parseVisualizationConfig('./config/visualizations.json');
      const hubUrl = getHubVisualizationUrl('TEST');
      config.visualizations.map(viz => ({
        ...viz,
        templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
      }));
    }).toThrow('Visualization URL not configured for hub environment "TEST"');
  });

  it('should throw error if config file has invalid structure', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: 'not an array',
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com';

    // Act & Assert
    expect(() => {
      parseVisualizationConfig('./config/visualizations.json');
    }).toThrow('Visualization config must be an object with visualizations array');
  });

  it('should throw error if hub URL is not HTTPS', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'http://vse.dev.example.com';

    // Act & Assert
    expect(() => {
      const config = parseVisualizationConfig('./config/visualizations.json');
      const hubUrl = getHubVisualizationUrl('DEV');
      config.visualizations.map(viz => ({
        ...viz,
        templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
      }));
    }).toThrow('Visualization URL must be a valid HTTPS URL');
  });

  it('should handle hub URL with port and path', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com:8080/app';

    // Act
    const config = parseVisualizationConfig('./config/visualizations.json');
    const hubUrl = getHubVisualizationUrl('DEV');
    const replaced = config.visualizations.map(viz => ({
      ...viz,
      templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
    }));

    // Assert
    expect(replaced[0].templatedUri).toBe(
      'https://vse.dev.example.com:8080/app/preview?id={{contentItemId}}'
    );
  });

  it('should handle empty visualizations array as error', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_DEV_VISUALISATION_APP_URL = 'https://vse.dev.example.com';

    // Act & Assert
    expect(() => {
      parseVisualizationConfig('./config/visualizations.json');
    }).toThrow('Visualizations array cannot be empty');
  });

  it('should complete full workflow for production hub', () => {
    // Arrange
    const configJson = JSON.stringify({
      visualizations: [
        {
          label: 'Production Preview',
          templatedUri: '{{ORIGIN_REPLACE}}/prod/preview?id={{contentItemId}}',
          default: true,
        },
        {
          label: 'Production Live',
          templatedUri: '{{ORIGIN_REPLACE}}/prod/live?id={{contentItemId}}&locale={{locale}}',
        },
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(configJson);
    process.env.AMP_HUB_PROD_VISUALISATION_APP_URL = 'https://vse.production.example.com';

    // Act
    const config = parseVisualizationConfig('./config/prod-visualizations.json');
    const hubUrl = getHubVisualizationUrl('PROD');
    const result = {
      hubName: 'PROD',
      hubUrl,
      visualizations: config.visualizations.map(viz => ({
        label: viz.label,
        templatedUri: replaceOriginPlaceholder(viz.templatedUri, hubUrl),
        default: viz.default,
      })),
    };

    // Assert
    expect(result.hubName).toBe('PROD');
    expect(result.hubUrl).toBe('https://vse.production.example.com');
    expect(result.visualizations).toHaveLength(2);
    expect(result.visualizations[0].templatedUri).toBe(
      'https://vse.production.example.com/prod/preview?id={{contentItemId}}'
    );
    expect(result.visualizations[0].default).toBe(true);
    expect(result.visualizations[1].templatedUri).toBe(
      'https://vse.production.example.com/prod/live?id={{contentItemId}}&locale={{locale}}'
    );
  });
});
