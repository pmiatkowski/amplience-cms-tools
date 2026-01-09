import * as fs from 'fs/promises';
import * as path from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { validateExistingFiles } from './validate-existing-files';

describe('validateExistingFiles', () => {
  const testDir = path.join(process.cwd(), 'temp_test_validation');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return valid result for empty directory', async () => {
    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(true);
    expect(result.fileCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid result for non-existent directory', async () => {
    const nonExistent = path.join(testDir, 'does-not-exist');
    const result = await validateExistingFiles(nonExistent);

    expect(result.valid).toBe(true);
    expect(result.fileCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid result for valid extension files', async () => {
    await fs.writeFile(
      path.join(testDir, 'ext1.json'),
      JSON.stringify({ id: 'ext-1', url: 'https://example.com', description: 'Test' })
    );
    await fs.writeFile(
      path.join(testDir, 'ext2.json'),
      JSON.stringify({ id: 'ext-2', url: 'https://example.com/ext2' })
    );

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(true);
    expect(result.fileCount).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect corrupted JSON files', async () => {
    await fs.writeFile(path.join(testDir, 'corrupted.json'), '{ invalid json content ');

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(false);
    expect(result.fileCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('JSON parse error');
  });

  it('should detect files with invalid structure', async () => {
    await fs.writeFile(
      path.join(testDir, 'invalid-structure.json'),
      JSON.stringify('not an object')
    );

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(false);
    expect(result.fileCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('not a JSON object');
  });

  it('should detect extensions missing required fields', async () => {
    await fs.writeFile(
      path.join(testDir, 'missing-fields.json'),
      JSON.stringify({ name: 'Extension', description: 'Missing id and url' })
    );

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(false);
    expect(result.fileCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('missing both id and url');
  });

  it('should validate multiple files and report all errors', async () => {
    await fs.writeFile(
      path.join(testDir, 'valid.json'),
      JSON.stringify({ id: 'valid-ext', url: 'https://valid.com' })
    );
    await fs.writeFile(path.join(testDir, 'corrupted.json'), '{ bad json ');
    await fs.writeFile(path.join(testDir, 'missing-fields.json'), JSON.stringify({ name: 'Test' }));

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(false);
    expect(result.fileCount).toBe(3);
    expect(result.errors).toHaveLength(2);
  });

  it('should ignore non-JSON files', async () => {
    await fs.writeFile(path.join(testDir, 'readme.txt'), 'This is a text file');
    await fs.writeFile(
      path.join(testDir, 'ext.json'),
      JSON.stringify({ id: 'ext-1', url: 'https://example.com' })
    );

    const result = await validateExistingFiles(testDir);

    expect(result.valid).toBe(true);
    expect(result.fileCount).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
