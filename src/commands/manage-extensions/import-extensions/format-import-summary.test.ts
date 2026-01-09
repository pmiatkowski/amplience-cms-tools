import { describe, expect, it } from 'vitest';

import { formatImportSummary } from './format-import-summary';

describe('formatImportSummary', () => {
  it('formats summary with all files successfully imported', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/path/to/extensions',
      totalFilesFound: 5,
      matchedCount: 5,
      filteredOutCount: 0,
      invalidCount: 0,
      importedCount: 5,
      invalidFiles: [],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Source directory: /path/to/extensions');
    expect(summary).toContain('Total files found: 5');
    expect(summary).toContain('Files matched: 5');
    expect(summary).toContain('Files filtered out: 0');
    expect(summary).toContain('Invalid files: 0');
    expect(summary).toContain('Successfully imported: 5');
  });

  it('formats summary with some files filtered out', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/exports/extensions',
      totalFilesFound: 10,
      matchedCount: 7,
      filteredOutCount: 3,
      invalidCount: 0,
      importedCount: 7,
      invalidFiles: [],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Total files found: 10');
    expect(summary).toContain('Files matched: 7');
    expect(summary).toContain('Files filtered out: 3');
    expect(summary).toContain('Successfully imported: 7');
  });

  it('formats summary with invalid files and includes error details', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/extensions',
      totalFilesFound: 8,
      matchedCount: 5,
      filteredOutCount: 1,
      invalidCount: 2,
      importedCount: 5,
      invalidFiles: [
        { filePath: '/extensions/broken.json', error: 'Invalid JSON syntax' },
        { filePath: '/extensions/missing-id.json', error: 'Missing required field: id' },
      ],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Total files found: 8');
    expect(summary).toContain('Files matched: 5');
    expect(summary).toContain('Files filtered out: 1');
    expect(summary).toContain('Invalid files: 2');
    expect(summary).toContain('Successfully imported: 5');
    expect(summary).toContain('/extensions/broken.json');
    expect(summary).toContain('Invalid JSON syntax');
    expect(summary).toContain('/extensions/missing-id.json');
    expect(summary).toContain('Missing required field: id');
  });

  it('formats summary when no files found', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/empty/dir',
      totalFilesFound: 0,
      matchedCount: 0,
      filteredOutCount: 0,
      invalidCount: 0,
      importedCount: 0,
      invalidFiles: [],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Total files found: 0');
    expect(summary).toContain('Files matched: 0');
  });

  it('formats summary when all files are filtered out', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/extensions',
      totalFilesFound: 5,
      matchedCount: 0,
      filteredOutCount: 5,
      invalidCount: 0,
      importedCount: 0,
      invalidFiles: [],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Total files found: 5');
    expect(summary).toContain('Files matched: 0');
    expect(summary).toContain('Files filtered out: 5');
    expect(summary).toContain('Successfully imported: 0');
  });

  it('formats summary when all files are invalid', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/bad/extensions',
      totalFilesFound: 3,
      matchedCount: 0,
      filteredOutCount: 0,
      invalidCount: 3,
      importedCount: 0,
      invalidFiles: [
        { filePath: 'file1.json', error: 'Corrupt' },
        { filePath: 'file2.json', error: 'Invalid' },
        { filePath: 'file3.json', error: 'Broken' },
      ],
    };

    const summary = formatImportSummary(result);

    expect(summary).toContain('Total files found: 3');
    expect(summary).toContain('Invalid files: 3');
    expect(summary).toContain('Successfully imported: 0');
    expect(summary).toContain('file1.json');
    expect(summary).toContain('file2.json');
    expect(summary).toContain('file3.json');
  });

  it('includes newlines for readability', () => {
    const result: Amplience.ImportExtensionsResult = {
      sourceDir: '/path',
      totalFilesFound: 1,
      matchedCount: 1,
      filteredOutCount: 0,
      invalidCount: 0,
      importedCount: 1,
      invalidFiles: [],
    };

    const summary = formatImportSummary(result);

    // Should have multiple lines
    expect(summary.split('\n').length).toBeGreaterThan(1);
  });
});
