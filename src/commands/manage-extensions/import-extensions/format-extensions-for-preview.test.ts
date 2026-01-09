import { describe, expect, it } from 'vitest';

import type { ExtensionWithPath } from '~/services/actions/import-extensions/filter-extensions';

import { formatExtensionsForPreview } from './format-extensions-for-preview';

describe('formatExtensionsForPreview', () => {
  const createExtension = (overrides: Partial<ExtensionWithPath> = {}): ExtensionWithPath => ({
    extension: {
      id: 'test-extension',
      url: 'https://example.com/extension.html',
      description: 'Test extension',
    },
    filePath: '/path/to/extension.json',
    ...overrides,
  });

  it('should format extension with all fields', () => {
    const extensions = [
      createExtension({
        extension: {
          id: 'my-extension-1',
          url: 'https://example.com/ext1.html',
          description: 'First extension',
        },
        filePath: '/path/to/ext1.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ID: 'my-extension-1',
      URL: 'https://example.com/ext1.html',
      Description: 'First extension',
      File: 'ext1.json',
    });
  });

  it('should format multiple extensions', () => {
    const extensions = [
      createExtension({
        extension: { id: 'ext1', url: 'https://example.com/ext1.html', description: 'First' },
        filePath: '/path/to/ext1.json',
      }),
      createExtension({
        extension: { id: 'ext2', url: 'https://example.com/ext2.html', description: 'Second' },
        filePath: '/path/to/ext2.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result).toHaveLength(2);
    expect(result[0].ID).toBe('ext1');
    expect(result[1].ID).toBe('ext2');
  });

  it('should handle missing url field', () => {
    const extensions = [
      createExtension({
        extension: { id: 'test', description: 'Test' },
        filePath: '/path/to/test.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0]).toEqual({
      ID: 'test',
      URL: 'N/A',
      Description: 'Test',
      File: 'test.json',
    });
  });

  it('should handle missing description field', () => {
    const extensions = [
      createExtension({
        extension: { id: 'test', url: 'https://example.com' },
        filePath: '/path/to/test.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0]).toEqual({
      ID: 'test',
      URL: 'https://example.com',
      Description: 'N/A',
      File: 'test.json',
    });
  });

  it('should extract filename from path', () => {
    const extensions = [
      createExtension({
        filePath: '/very/long/path/to/my-extension.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0].File).toBe('my-extension.json');
  });

  it('should handle Windows-style paths', () => {
    const extensions = [
      createExtension({
        filePath: 'C:\\Users\\test\\extensions\\my-extension.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0].File).toBe('my-extension.json');
  });

  it('should handle empty extension list', () => {
    const result = formatExtensionsForPreview([]);

    expect(result).toEqual([]);
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'a'.repeat(200);
    const extensions = [
      createExtension({
        extension: { id: 'test', description: longDescription },
        filePath: '/path/to/test.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0].Description).toHaveLength(100);
    expect(result[0].Description).toContain('...');
  });

  it('should truncate long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(200);
    const extensions = [
      createExtension({
        extension: { id: 'test', url: longUrl },
        filePath: '/path/to/test.json',
      }),
    ];

    const result = formatExtensionsForPreview(extensions);

    expect(result[0].URL).toHaveLength(80);
    expect(result[0].URL).toContain('...');
  });
});
