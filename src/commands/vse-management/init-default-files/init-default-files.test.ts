import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getVseFilePaths,
  validateFileExists,
  runInitDefaultFiles,
  displayMissingEnvVarsInstructions,
  displayFileValidationResults,
  CONTENT_TYPES_EXAMPLE,
  VISUALIZATIONS_EXAMPLE,
  type VseFilePaths,
} from './init-default-files';

describe('getVseFilePaths', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE;
    delete process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE;
  });

  it('should return undefined for both paths when environment variables are not set', () => {
    const result = getVseFilePaths();

    expect(result.contentTypesListFile).toBeUndefined();
    expect(result.visualizationsConfigFile).toBeUndefined();
  });

  it('should return content types list file path when env var is set', () => {
    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '/path/to/content-types.json';

    const result = getVseFilePaths();

    expect(result.contentTypesListFile).toBe('/path/to/content-types.json');
    expect(result.visualizationsConfigFile).toBeUndefined();
  });

  it('should return visualizations config file path when env var is set', () => {
    process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE = '/path/to/visualizations.json';

    const result = getVseFilePaths();

    expect(result.contentTypesListFile).toBeUndefined();
    expect(result.visualizationsConfigFile).toBe('/path/to/visualizations.json');
  });

  it('should return both paths when both env vars are set', () => {
    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '/path/to/content-types.json';
    process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE =
      '/path/to/visualizations.json';

    const result = getVseFilePaths();

    expect(result.contentTypesListFile).toBe('/path/to/content-types.json');
    expect(result.visualizationsConfigFile).toBe('/path/to/visualizations.json');
  });
});

describe('validateFileExists', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return true for existing files', () => {
    const testFile = join(tempDir, 'test.json');
    writeFileSync(testFile, '{}');

    expect(validateFileExists(testFile)).toBe(true);
  });

  it('should return false for non-existing files', () => {
    const nonExistentFile = join(tempDir, 'does-not-exist.json');

    expect(validateFileExists(nonExistentFile)).toBe(false);
  });

  it('should return true for directories (existsSync checks path existence)', () => {
    expect(validateFileExists(tempDir)).toBe(true);
  });

  it('should handle relative paths', () => {
    const testFile = join(tempDir, 'relative-test.json');
    writeFileSync(testFile, '{}');

    expect(validateFileExists(testFile)).toBe(true);
  });
});

describe('runInitDefaultFiles', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    delete process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE;
    delete process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
  });

  it('should display "not configured" message when no env vars are set', async () => {
    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith('🎨 Initialize Default Files');
    expect(consoleLogSpy).toHaveBeenCalledWith('========================\n');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Environment Variables Not Configured'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE'));
  });

  it('should display configured paths when env vars are set', async () => {
    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '/path/to/content-types.json';
    process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE =
      '/path/to/visualizations.json';

    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith('Environment variables configured:');
    expect(consoleLogSpy).toHaveBeenCalledWith('  Content Types List: /path/to/content-types.json');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '  Visualizations Config: /path/to/visualizations.json\n',
    );
  });

  it('should show "Not set" for individual missing env vars', async () => {
    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = '/path/to/content-types.json';

    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith('Environment variables configured:');
    expect(consoleLogSpy).toHaveBeenCalledWith('  Content Types List: /path/to/content-types.json');
    expect(consoleLogSpy).toHaveBeenCalledWith('  Visualizations Config: Not set\n');
  });

  it('should show "Found" for existing files', async () => {
    const existingFile = join(tempDir, 'content-types.json');
    writeFileSync(existingFile, '[]');

    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = existingFile;

    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Content Types List: ✓ Found'));
  });

  it('should show "Missing" for non-existing files', async () => {
    const nonExistentFile = join(tempDir, 'does-not-exist.json');

    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = nonExistentFile;

    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Content Types List: ✗ Missing'));
  });

  it('should validate both files when both env vars are set', async () => {
    const existingContentTypes = join(tempDir, 'content-types.json');
    const nonExistentVisualizations = join(tempDir, 'visualizations.json');
    writeFileSync(existingContentTypes, '[]');

    process.env.AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE = existingContentTypes;
    process.env.AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE = nonExistentVisualizations;

    await runInitDefaultFiles();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Content Types List: ✓ Found'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Visualizations Config: ✗ Missing'));
  });
});

describe('CONTENT_TYPES_EXAMPLE', () => {
  it('should be defined as an array', () => {
    expect(CONTENT_TYPES_EXAMPLE).toBeDefined();
    expect(Array.isArray(CONTENT_TYPES_EXAMPLE)).toBe(true);
  });

  it('should contain example content type URIs as strings', () => {
    CONTENT_TYPES_EXAMPLE.forEach((uri) => {
      expect(typeof uri).toBe('string');
      expect(uri).toMatch(/^https?:\/\//);
    });
  });

  it('should contain at least 2 example URIs', () => {
    expect(CONTENT_TYPES_EXAMPLE.length).toBeGreaterThanOrEqual(2);
  });

  it('should include the product.json example from PRD', () => {
    expect(CONTENT_TYPES_EXAMPLE).toContain('https://schema.example.com/product.json');
  });

  it('should include the category.json example from PRD', () => {
    expect(CONTENT_TYPES_EXAMPLE).toContain('https://schema.example.com/category.json');
  });
});

describe('VISUALIZATIONS_EXAMPLE', () => {
  it('should be defined as an object', () => {
    expect(VISUALIZATIONS_EXAMPLE).toBeDefined();
    expect(typeof VISUALIZATIONS_EXAMPLE).toBe('object');
    expect(Array.isArray(VISUALIZATIONS_EXAMPLE)).toBe(false);
  });

  it('should contain a preview visualization', () => {
    expect(VISUALIZATIONS_EXAMPLE).toHaveProperty('preview');
    const preview = VISUALIZATIONS_EXAMPLE.preview;
    expect(preview).toHaveProperty('label');
    expect(preview).toHaveProperty('uri');
    expect(preview).toHaveProperty('default');
    expect(preview.default).toBe(true);
    expect(preview.uri).toContain('{{ORIGIN_REPLACE}}');
    expect(preview.uri).toContain('{{contentItemId}}');
  });

  it('should contain a liveView visualization', () => {
    expect(VISUALIZATIONS_EXAMPLE).toHaveProperty('liveView');
    const liveView = VISUALIZATIONS_EXAMPLE.liveView;
    expect(liveView).toHaveProperty('label');
    expect(liveView).toHaveProperty('uri');
    expect(liveView.uri).toContain('{{ORIGIN_REPLACE}}');
    expect(liveView.uri).toContain('{{contentItemId}}');
    expect(liveView.uri).toContain('{{locale}}');
  });

  it('preview should match PRD specification', () => {
    expect(VISUALIZATIONS_EXAMPLE.preview.uri).toBe('{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}');
  });

  it('liveView should match PRD specification', () => {
    expect(VISUALIZATIONS_EXAMPLE.liveView.uri).toBe(
      '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
    );
  });
});

describe('displayMissingEnvVarsInstructions', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should display environment variable names', () => {
    displayMissingEnvVarsInstructions();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('AMP_DEFAULT_VISUALISATIONS_CONTENT_TYPES_LIST_FILE'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('AMP_DEFAULT_VISUALISATION_CONTENT_TYPES_CONFIGURATION_FILE'),
    );
  });

  it('should display recommended file paths', () => {
    displayMissingEnvVarsInstructions();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Amplience'));
  });

  it('should display content types example JSON', () => {
    displayMissingEnvVarsInstructions();

    const calls = consoleLogSpy.mock.calls.flat();
    const jsonOutput = calls.find((call) => typeof call === 'string' && call.includes('content-types.json'));
    expect(jsonOutput).toBeDefined();
  });

  it('should display visualizations example JSON', () => {
    displayMissingEnvVarsInstructions();

    const calls = consoleLogSpy.mock.calls.flat();
    const jsonOutput = calls.find(
      (call) => typeof call === 'string' && call.includes('visualizations.json'),
    );
    expect(jsonOutput).toBeDefined();
  });

  it('should display clear section headers', () => {
    displayMissingEnvVarsInstructions();

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('==='));
  });
});

describe('displayFileValidationResults', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
  });

  it('should display "Found" status for existing files', () => {
    const existingFile = join(tempDir, 'content-types.json');
    writeFileSync(existingFile, '[]');

    const vseFilePaths: VseFilePaths = {
      contentTypesListFile: existingFile,
      visualizationsConfigFile: undefined,
    };

    displayFileValidationResults(vseFilePaths);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Found'));
  });

  it('should display "Missing" status for non-existing files', () => {
    const nonExistentFile = join(tempDir, 'does-not-exist.json');

    const vseFilePaths: VseFilePaths = {
      contentTypesListFile: nonExistentFile,
      visualizationsConfigFile: undefined,
    };

    displayFileValidationResults(vseFilePaths);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Missing'));
  });

  it('should show example content for missing files', () => {
    const nonExistentFile = join(tempDir, 'does-not-exist.json');

    const vseFilePaths: VseFilePaths = {
      contentTypesListFile: nonExistentFile,
      visualizationsConfigFile: undefined,
    };

    displayFileValidationResults(vseFilePaths);

    const calls = consoleLogSpy.mock.calls.flat();
    const hasExampleContent = calls.some(
      (call) => typeof call === 'string' && call.includes('https://schema.example.com'),
    );
    expect(hasExampleContent).toBe(true);
  });

  it('should validate both files when both paths are provided', () => {
    const existingFile = join(tempDir, 'content-types.json');
    const missingFile = join(tempDir, 'visualizations.json');
    writeFileSync(existingFile, '[]');

    const vseFilePaths: VseFilePaths = {
      contentTypesListFile: existingFile,
      visualizationsConfigFile: missingFile,
    };

    displayFileValidationResults(vseFilePaths);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Content Types List'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Visualizations Config'));
  });

  it('should handle undefined paths gracefully', () => {
    const vseFilePaths: VseFilePaths = {
      contentTypesListFile: undefined,
      visualizationsConfigFile: undefined,
    };

    expect(() => displayFileValidationResults(vseFilePaths)).not.toThrow();
  });
});
