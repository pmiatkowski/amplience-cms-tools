import * as fs from 'fs/promises';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateExtensionFile } from './validate-extension-file';

describe('validateExtensionFile', () => {
  const testDir = path.resolve('./test-temp-validate-extension');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('valid extension files', () => {
    it('should validate extension with all required fields', async () => {
      const filePath = path.join(testDir, 'valid-extension.json');
      const extension = {
        id: 'test-extension',
        name: 'Test Extension',
        url: 'https://example.com/extension.html',
        description: 'A test extension',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.extension).toEqual(extension);
      expect(result.error).toBeUndefined();
    });

    it('should validate extension with only id field', async () => {
      const filePath = path.join(testDir, 'minimal-extension.json');
      const extension = {
        id: 'minimal-extension',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.extension).toEqual(extension);
    });

    it('should validate extension with additional fields', async () => {
      const filePath = path.join(testDir, 'full-extension.json');
      const extension = {
        id: 'full-extension',
        name: 'Full Extension',
        url: 'https://example.com/extension.html',
        description: 'Full extension with all fields',
        category: 'content',
        label: 'My Extension',
        snippet: 'snippet-code',
        height: 500,
        status: 'ACTIVE',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.extension).toEqual(extension);
    });

    it('should validate extension with whitespace in JSON', async () => {
      const filePath = path.join(testDir, 'formatted-extension.json');
      const extension = {
        id: 'formatted-extension',
        name: 'Formatted Extension',
      };
      await fs.writeFile(filePath, JSON.stringify(extension, null, 2));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.extension).toEqual(extension);
    });
  });

  describe('invalid JSON syntax', () => {
    it('should return error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid-json.json');
      await fs.writeFile(filePath, '{ invalid json }');

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.extension).toBeUndefined();
      expect(result.error).toContain('Invalid JSON');
      expect(result.error).toContain('invalid-json.json');
    });

    it('should return error for unclosed brace', async () => {
      const filePath = path.join(testDir, 'unclosed.json');
      await fs.writeFile(filePath, '{ "id": "test"');

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should return error for trailing comma', async () => {
      const filePath = path.join(testDir, 'trailing-comma.json');
      await fs.writeFile(filePath, '{ "id": "test", }');

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should return error for empty file', async () => {
      const filePath = path.join(testDir, 'empty.json');
      await fs.writeFile(filePath, '');

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('missing required fields', () => {
    it('should return error when id field is missing', async () => {
      const filePath = path.join(testDir, 'no-id.json');
      const extension = {
        name: 'Extension without ID',
        url: 'https://example.com',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required field: id');
      expect(result.error).toContain('no-id.json');
    });

    it('should return error when id is empty string', async () => {
      const filePath = path.join(testDir, 'empty-id.json');
      const extension = {
        id: '',
        name: 'Extension with empty ID',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required field: id');
    });

    it('should return error when id is null', async () => {
      const filePath = path.join(testDir, 'null-id.json');
      const extension = {
        id: null,
        name: 'Extension with null ID',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required field: id');
    });
  });

  describe('invalid file types', () => {
    it('should return error when extension is not an object', async () => {
      const filePath = path.join(testDir, 'array.json');
      await fs.writeFile(filePath, JSON.stringify(['not', 'an', 'object']));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Extension file must contain a JSON object');
      expect(result.error).toContain('array.json');
    });

    it('should return error when extension is a string', async () => {
      const filePath = path.join(testDir, 'string.json');
      await fs.writeFile(filePath, JSON.stringify('just a string'));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Extension file must contain a JSON object');
    });

    it('should return error when extension is a number', async () => {
      const filePath = path.join(testDir, 'number.json');
      await fs.writeFile(filePath, JSON.stringify(123));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Extension file must contain a JSON object');
    });
  });

  describe('file access errors', () => {
    it('should return error for non-existent file', async () => {
      const filePath = path.join(testDir, 'does-not-exist.json');

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot read file');
      expect(result.error).toContain('does-not-exist.json');
    });

    it('should return error for directory instead of file', async () => {
      const dirPath = path.join(testDir, 'is-directory');
      await fs.mkdir(dirPath);

      const result = await validateExtensionFile(dirPath);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot read file');
    });
  });

  describe('edge cases', () => {
    it('should handle file path with spaces', async () => {
      const filePath = path.join(testDir, 'file with spaces.json');
      const extension = { id: 'test' };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
    });

    it('should handle very large extension file', async () => {
      const filePath = path.join(testDir, 'large.json');
      const extension = {
        id: 'large-extension',
        description: 'a'.repeat(10000), // Large description
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
    });

    it('should handle Unicode characters in extension data', async () => {
      const filePath = path.join(testDir, 'unicode.json');
      const extension = {
        id: 'café-extension-日本語',
        name: 'Café Extension 日本語',
        description: '🎉 Unicode support',
      };
      await fs.writeFile(filePath, JSON.stringify(extension));

      const result = await validateExtensionFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.extension).toEqual(extension);
    });
  });
});
