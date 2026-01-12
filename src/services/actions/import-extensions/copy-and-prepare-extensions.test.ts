vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');

  return {
    ...actual,
    readdir: vi.fn(actual.readdir),
    copyFile: vi.fn(actual.copyFile),
    mkdir: vi.fn(actual.mkdir),
    stat: vi.fn(actual.stat),
  };
});

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DirectoryAccessError } from '../import-extensions';
import { copyAndPrepareExtensions } from './copy-and-prepare-extensions';

describe('copyAndPrepareExtensions', () => {
  let tempSourceDir: string;
  let tempTargetDir: string;

  beforeEach(async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-prepare-test-'));
    tempSourceDir = path.join(tempRoot, 'source');
    tempTargetDir = path.join(tempRoot, 'target');

    await fs.mkdir(tempSourceDir, { recursive: true });
    await fs.mkdir(tempTargetDir, { recursive: true });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      const parentDir = path.dirname(tempSourceDir);
      await fs.rm(parentDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('copies all JSON files from source to target directory', async () => {
    // Arrange
    const ext1 = path.join(tempSourceDir, 'extension-1.json');
    const ext2 = path.join(tempSourceDir, 'extension-2.json');

    await fs.writeFile(ext1, JSON.stringify({ id: 'ext-1' }));
    await fs.writeFile(ext2, JSON.stringify({ id: 'ext-2' }));

    // Act
    const result = await copyAndPrepareExtensions(tempSourceDir, tempTargetDir);

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContain(path.join(tempTargetDir, 'extension-1.json'));
    expect(result).toContain(path.join(tempTargetDir, 'extension-2.json'));

    const copiedExt1 = await fs.readFile(path.join(tempTargetDir, 'extension-1.json'), 'utf-8');
    const copiedExt2 = await fs.readFile(path.join(tempTargetDir, 'extension-2.json'), 'utf-8');

    expect(JSON.parse(copiedExt1)).toEqual({ id: 'ext-1' });
    expect(JSON.parse(copiedExt2)).toEqual({ id: 'ext-2' });
  });

  it('creates target directory if it does not exist', async () => {
    // Arrange
    const newTargetDir = path.join(tempTargetDir, 'new-subdirectory');
    const ext = path.join(tempSourceDir, 'extension.json');

    await fs.writeFile(ext, JSON.stringify({ id: 'ext' }));

    // Act
    await copyAndPrepareExtensions(tempSourceDir, newTargetDir);

    // Assert
    const targetStat = await fs.stat(newTargetDir);
    expect(targetStat.isDirectory()).toBe(true);

    const copiedFile = await fs.readFile(path.join(newTargetDir, 'extension.json'), 'utf-8');
    expect(JSON.parse(copiedFile)).toEqual({ id: 'ext' });
  });

  it('returns empty array when source directory has no JSON files', async () => {
    // Arrange
    await fs.writeFile(path.join(tempSourceDir, 'readme.txt'), 'Not JSON');

    // Act
    const result = await copyAndPrepareExtensions(tempSourceDir, tempTargetDir);

    // Assert
    expect(result).toEqual([]);
  });

  it('only copies .json files and ignores other file types', async () => {
    // Arrange
    await fs.writeFile(path.join(tempSourceDir, 'extension.json'), JSON.stringify({ id: 'ext' }));
    await fs.writeFile(path.join(tempSourceDir, 'readme.txt'), 'Text file');
    await fs.writeFile(path.join(tempSourceDir, 'config.yaml'), 'yaml: content');

    // Act
    const result = await copyAndPrepareExtensions(tempSourceDir, tempTargetDir);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('extension.json');

    const targetFiles = await fs.readdir(tempTargetDir);
    expect(targetFiles).toEqual(['extension.json']);
  });

  it('throws DirectoryAccessError when source directory does not exist', async () => {
    // Arrange
    const nonExistentDir = path.join(tempSourceDir, 'does-not-exist');

    // Act & Assert
    await expect(copyAndPrepareExtensions(nonExistentDir, tempTargetDir)).rejects.toThrow(
      DirectoryAccessError
    );
  });

  it('throws DirectoryAccessError when source directory cannot be read', async () => {
    // Arrange
    const mockFs = await import('fs/promises');
    vi.mocked(mockFs.readdir).mockRejectedValueOnce(new Error('EACCES: permission denied'));

    // Act & Assert
    await expect(copyAndPrepareExtensions(tempSourceDir, tempTargetDir)).rejects.toThrow(
      DirectoryAccessError
    );

    expect(vi.mocked(mockFs.readdir)).toHaveBeenCalledWith(tempSourceDir);
  });

  it('throws DirectoryAccessError when target directory cannot be created', async () => {
    // Arrange
    const mockFs = await import('fs/promises');
    const ext = path.join(tempSourceDir, 'extension.json');
    await fs.writeFile(ext, JSON.stringify({ id: 'ext' }));

    vi.mocked(mockFs.mkdir).mockRejectedValueOnce(new Error('EACCES: permission denied'));

    // Act & Assert
    await expect(copyAndPrepareExtensions(tempSourceDir, tempTargetDir)).rejects.toThrow(
      DirectoryAccessError
    );
  });

  it('throws DirectoryAccessError when file copy fails', async () => {
    // Arrange
    const mockFs = await import('fs/promises');
    const ext = path.join(tempSourceDir, 'extension.json');
    await fs.writeFile(ext, JSON.stringify({ id: 'ext' }));

    vi.mocked(mockFs.copyFile).mockRejectedValueOnce(new Error('ENOSPC: no space left'));

    // Act & Assert
    await expect(copyAndPrepareExtensions(tempSourceDir, tempTargetDir)).rejects.toThrow(
      DirectoryAccessError
    );
  });

  it('preserves original filenames when copying', async () => {
    // Arrange
    const filename = 'my-custom-extension-name.json';
    const sourcePath = path.join(tempSourceDir, filename);
    await fs.writeFile(sourcePath, JSON.stringify({ id: 'custom-ext' }));

    // Act
    const result = await copyAndPrepareExtensions(tempSourceDir, tempTargetDir);

    // Assert
    expect(result[0]).toBe(path.join(tempTargetDir, filename));
  });

  it('handles multiple extensions with various naming patterns', async () => {
    // Arrange
    const extensions = [
      'simple.json',
      'with-hyphens.json',
      'with_underscores.json',
      'MixedCase.json',
      'with.dots.json',
    ];

    for (const ext of extensions) {
      await fs.writeFile(path.join(tempSourceDir, ext), JSON.stringify({ id: ext }));
    }

    // Act
    const result = await copyAndPrepareExtensions(tempSourceDir, tempTargetDir);

    // Assert
    expect(result).toHaveLength(extensions.length);
    for (const ext of extensions) {
      expect(result).toContain(path.join(tempTargetDir, ext));
      const copied = await fs.readFile(path.join(tempTargetDir, ext), 'utf-8');
      expect(JSON.parse(copied)).toEqual({ id: ext });
    }
  });
});
