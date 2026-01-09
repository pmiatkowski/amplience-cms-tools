import * as fs from 'fs/promises';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { filterExtensions } from './filter-extensions';

describe('filterExtensions', () => {
  const testDir = path.resolve('./test-temp-filter-extensions');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const createExtensionFile = async (
    fileName: string,
    extension: Partial<Amplience.Extension>
  ): Promise<string> => {
    const filePath = path.join(testDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(extension));

    return filePath;
  };

  describe('filtering by pattern', () => {
    it('should keep extensions matching the pattern', async () => {
      await createExtensionFile('ext1.json', { id: 'my-extension-1' });
      await createExtensionFile('ext2.json', { id: 'my-extension-2' });
      await createExtensionFile('ext3.json', { id: 'other-extension' });

      const filePaths = [
        path.join(testDir, 'ext1.json'),
        path.join(testDir, 'ext2.json'),
        path.join(testDir, 'ext3.json'),
      ];
      const pattern = /my-extension/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(2);
      expect(result.kept[0].extension.id).toBe('my-extension-1');
      expect(result.kept[1].extension.id).toBe('my-extension-2');
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].extension.id).toBe('other-extension');
    });

    it('should remove extensions not matching the pattern', async () => {
      await createExtensionFile('ext1.json', { id: 'test-1' });
      await createExtensionFile('ext2.json', { id: 'test-2' });

      const filePaths = [path.join(testDir, 'ext1.json'), path.join(testDir, 'ext2.json')];
      const pattern = /production/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(2);
    });

    it('should match pattern against id, url, and description', async () => {
      await createExtensionFile('ext1.json', { id: 'abc', url: 'https://match-me.com' });
      await createExtensionFile('ext2.json', { id: 'def', description: 'has match-me in text' });
      await createExtensionFile('ext3.json', { id: 'match-me-id' });
      await createExtensionFile('ext4.json', { id: 'xyz', url: 'https://other.com' });

      const filePaths = [
        path.join(testDir, 'ext1.json'),
        path.join(testDir, 'ext2.json'),
        path.join(testDir, 'ext3.json'),
        path.join(testDir, 'ext4.json'),
      ];
      const pattern = /match-me/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].extension.id).toBe('xyz');
    });

    it('should handle match-all pattern', async () => {
      await createExtensionFile('ext1.json', { id: 'ext1' });
      await createExtensionFile('ext2.json', { id: 'ext2' });
      await createExtensionFile('ext3.json', { id: 'ext3' });

      const filePaths = [
        path.join(testDir, 'ext1.json'),
        path.join(testDir, 'ext2.json'),
        path.join(testDir, 'ext3.json'),
      ];
      const pattern = /.*/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(0);
    });
  });

  describe('invalid file handling', () => {
    it('should skip invalid JSON files', async () => {
      await createExtensionFile('valid.json', { id: 'valid-extension' });
      const invalidPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidPath, '{ invalid json }');

      const filePaths = [path.join(testDir, 'valid.json'), invalidPath];
      const pattern = /.*/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].extension.id).toBe('valid-extension');
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].filePath).toBe(invalidPath);
      expect(result.invalid[0].error).toContain('Invalid JSON');
    });

    it('should skip files with missing id field', async () => {
      await createExtensionFile('valid.json', { id: 'valid-extension' });
      await createExtensionFile('no-id.json', { name: 'Extension without ID' } as Record<
        string,
        unknown
      >);

      const filePaths = [path.join(testDir, 'valid.json'), path.join(testDir, 'no-id.json')];
      const pattern = /.*/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('Missing required field: id');
    });

    it('should skip non-existent files', async () => {
      await createExtensionFile('exists.json', { id: 'exists' });
      const nonExistentPath = path.join(testDir, 'does-not-exist.json');

      const filePaths = [path.join(testDir, 'exists.json'), nonExistentPath];
      const pattern = /.*/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].filePath).toBe(nonExistentPath);
      expect(result.invalid[0].error).toContain('Cannot read file');
    });

    it('should continue processing after encountering invalid file', async () => {
      await createExtensionFile('ext1.json', { id: 'ext1' });
      const invalidPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidPath, '{ invalid }');
      await createExtensionFile('ext2.json', { id: 'ext2' });

      const filePaths = [
        path.join(testDir, 'ext1.json'),
        invalidPath,
        path.join(testDir, 'ext2.json'),
      ];
      const pattern = /.*/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
    });
  });

  describe('result structure', () => {
    it('should include file paths in kept extensions', async () => {
      await createExtensionFile('ext1.json', { id: 'test-extension' });

      const filePath = path.join(testDir, 'ext1.json');
      const pattern = /.*/i;

      const result = await filterExtensions([filePath], pattern);

      expect(result.kept[0].filePath).toBe(filePath);
      expect(result.kept[0].extension.id).toBe('test-extension');
    });

    it('should include file paths in removed extensions', async () => {
      await createExtensionFile('ext1.json', { id: 'other-extension' });

      const filePath = path.join(testDir, 'ext1.json');
      const pattern = /test/i;

      const result = await filterExtensions([filePath], pattern);

      expect(result.removed[0].filePath).toBe(filePath);
      expect(result.removed[0].extension.id).toBe('other-extension');
    });

    it('should include file paths and errors in invalid files', async () => {
      const invalidPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidPath, '{ bad json }');

      const pattern = /.*/i;

      const result = await filterExtensions([invalidPath], pattern);

      expect(result.invalid[0].filePath).toBe(invalidPath);
      expect(result.invalid[0].error).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty file list', async () => {
      const pattern = /.*/i;

      const result = await filterExtensions([], pattern);

      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle all files matching', async () => {
      await createExtensionFile('ext1.json', { id: 'match-1' });
      await createExtensionFile('ext2.json', { id: 'match-2' });
      await createExtensionFile('ext3.json', { id: 'match-3' });

      const filePaths = [
        path.join(testDir, 'ext1.json'),
        path.join(testDir, 'ext2.json'),
        path.join(testDir, 'ext3.json'),
      ];
      const pattern = /match/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(3);
      expect(result.removed).toHaveLength(0);
    });

    it('should handle all files not matching', async () => {
      await createExtensionFile('ext1.json', { id: 'other-1' });
      await createExtensionFile('ext2.json', { id: 'other-2' });

      const filePaths = [path.join(testDir, 'ext1.json'), path.join(testDir, 'ext2.json')];
      const pattern = /test/i;

      const result = await filterExtensions(filePaths, pattern);

      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(2);
    });

    it('should handle all files invalid', async () => {
      const invalid1 = path.join(testDir, 'invalid1.json');
      const invalid2 = path.join(testDir, 'invalid2.json');
      await fs.writeFile(invalid1, '{ bad }');
      await fs.writeFile(invalid2, '{ also bad }');

      const pattern = /.*/i;

      const result = await filterExtensions([invalid1, invalid2], pattern);

      expect(result.kept).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.invalid).toHaveLength(2);
    });

    it('should handle file paths with spaces', async () => {
      const fileName = 'file with spaces.json';
      await createExtensionFile(fileName, { id: 'test' });

      const filePath = path.join(testDir, fileName);
      const pattern = /.*/i;

      const result = await filterExtensions([filePath], pattern);

      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].filePath).toBe(filePath);
    });

    it('should handle extensions with Unicode characters', async () => {
      await createExtensionFile('unicode.json', {
        id: 'café-extension-日本語',
        description: '🎉 Test',
      });

      const filePath = path.join(testDir, 'unicode.json');
      const pattern = /café/i;

      const result = await filterExtensions([filePath], pattern);

      expect(result.kept).toHaveLength(1);
      expect(result.kept[0].extension.id).toBe('café-extension-日本語');
    });
  });
});
