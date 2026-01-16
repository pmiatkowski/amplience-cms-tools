vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');

  return {
    ...actual,
    mkdir: vi.fn(actual.mkdir),
    unlink: vi.fn(actual.unlink),
    readFile: vi.fn(actual.readFile),
  };
});

vi.mock('~/services/amplience-service');

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AmplienceService } from '~/services/amplience-service';
import {
  DirectoryAccessError,
  HubAuthenticationError,
  InvalidPatternError,
  DcCliExecutionError,
  exportExtensions,
  extensionMatchesPattern,
} from './export-extensions';

const { builderMock, createDcCliCommandMock, createProgressBarMock } = vi.hoisted(() => {
  const builder = {
    withHub: vi.fn().mockReturnThis(),
    withCommand: vi.fn().mockReturnThis(),
    withArgs: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  const createProgressBarMock = vi.fn(() => ({
    increment: vi.fn(),
    stop: vi.fn(),
  }));

  return {
    builderMock: builder,
    createDcCliCommandMock: vi.fn(() => builder),
    createProgressBarMock,
  };
});

vi.mock('~/utils', () => ({
  createDcCliCommand: createDcCliCommandMock,
  createProgressBar: createProgressBarMock,
}));

const mockHub: Amplience.HubConfig = {
  name: 'Test Hub',
  envKey: 'TEST_HUB',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  hubId: 'hub-id',
};

const noopDcCliResponse = { stdout: '', stderr: '' };

const mockExtensions: Amplience.Extension[] = [
  { name: 'ext-1', id: 'ext-1', url: 'https://example.com/ext1', description: 'Extension 1' },
  { name: 'ext-2', id: 'ext-2', url: 'https://example.com/ext2', description: 'Extension 2' },
];

const writeExtensionFile = async (
  directory: string,
  fileName: string,
  data: Record<string, unknown>
): Promise<void> => {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, fileName), JSON.stringify(data), 'utf-8');
};

describe('exportExtensions action', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'extensions-export-'));
    vi.clearAllMocks();
    createDcCliCommandMock.mockReturnValue(builderMock);
    builderMock.withHub.mockReturnThis();
    builderMock.withCommand.mockReturnThis();
    builderMock.withArgs.mockReturnThis();
    builderMock.execute.mockResolvedValue(noopDcCliResponse);

    // Mock AmplienceService
    vi.mocked(AmplienceService).mockImplementation(
      () =>
        ({
          getExtensions: vi.fn().mockResolvedValue(mockExtensions),
        }) as unknown as AmplienceService
    );
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('passes hub context and output directory to dc-cli', async () => {
    const outputDir = path.join(tempRoot, 'exports');
    let tempDirUsed = '';
    builderMock.execute.mockImplementation(async () => {
      // Find the temp directory from the command
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      tempDirUsed = match ? match[1] : '';

      await writeExtensionFile(tempDirUsed, 'XXXX.json', {
        id: 'XXXX',
        url: 'https://example.com',
      });

      return noopDcCliResponse;
    });

    const result = await exportExtensions({
      hub: mockHub,
      outputDir,
      pattern: 'XXX',
      mode: 'full-overwrite',
    });

    expect(createDcCliCommandMock).toHaveBeenCalledTimes(1);
    expect(builderMock.withHub).toHaveBeenCalledWith(mockHub);
    expect(tempDirUsed).toContain('temp_export_');
    expect(result.kept).toHaveLength(1);
    expect(result.outputDir).toEqual(outputDir);
    expect(result.mode).toBe('full-overwrite');
  });

  it('removes non-matching extensions and returns summary', async () => {
    const outputDir = path.join(tempRoot, 'filtered');
    builderMock.execute.mockImplementation(async () => {
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      const tempDir = match ? match[1] : '';

      await writeExtensionFile(tempDir, 'match.json', {
        id: 'XXXX',
        url: 'https://org.example.com',
      });
      await writeExtensionFile(tempDir, 'skip.json', {
        id: 'other-extension',
        description: 'does not match',
      });

      return noopDcCliResponse;
    });

    const result = await exportExtensions({
      hub: mockHub,
      outputDir,
      pattern: 'XXX',
      mode: 'full-overwrite',
    });

    expect(result.totalFilesDownloaded).toBe(2);
    expect(result.kept.map(item => item.fileName)).toEqual(['match.json']);
    expect(result.removed.map(item => item.fileName)).toEqual(['skip.json']);
    expect(
      await fs
        .access(path.join(outputDir, 'match.json'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
    expect(
      await fs
        .access(path.join(outputDir, 'skip.json'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
    expect(result.filtered).toBe(true);
  });

  it('treats blank patterns as match-all filters', async () => {
    const outputDir = path.join(tempRoot, 'all');
    builderMock.execute.mockImplementation(async () => {
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      const tempDir = match ? match[1] : '';

      await writeExtensionFile(tempDir, 'one.json', { id: 'one' });
      await writeExtensionFile(tempDir, 'two.json', { id: 'two' });

      return noopDcCliResponse;
    });

    const result = await exportExtensions({
      hub: mockHub,
      outputDir,
      pattern: '   ',
      mode: 'full-overwrite',
    });

    expect(result.kept).toHaveLength(2);
    expect(result.removed).toHaveLength(0);
    expect(result.pattern).toBeInstanceOf(RegExp);
    expect(result.pattern.source).toBe('.*');
    expect(result.filtered).toBe(true);
  });

  it('allows preview callbacks to cancel filtering', async () => {
    const outputDir = path.join(tempRoot, 'preview');
    builderMock.execute.mockImplementation(async () => {
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      const tempDir = match ? match[1] : '';

      await writeExtensionFile(tempDir, 'match.json', {
        id: 'match-me',
      });
      await writeExtensionFile(tempDir, 'skip.json', {
        id: 'skip-me',
      });

      return noopDcCliResponse;
    });

    const previewCallback = vi.fn(async () => false);

    const result = await exportExtensions({
      hub: mockHub,
      outputDir,
      pattern: 'match',
      mode: 'full-overwrite',
      onBeforeFiltering: previewCallback,
    });

    expect(previewCallback).toHaveBeenCalledTimes(1);
    expect(result.filtered).toBe(false);
    // When cancelled, no files should be in output directory
    expect(
      await fs
        .access(path.join(outputDir, 'skip.json'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
    expect(
      await fs
        .access(path.join(outputDir, 'match.json'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });

  it('throws InvalidPatternError when regex cannot be compiled', async () => {
    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir: path.join(tempRoot, 'invalid'),
        pattern: '[',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(InvalidPatternError);
  });

  it('throws DirectoryAccessError when export directory cannot be created', async () => {
    const mkdirError = new Error('denied') as NodeJS.ErrnoException;
    mkdirError.code = 'EACCES';
    const mkdirMock = vi.mocked(fs.mkdir);
    mkdirMock.mockRejectedValueOnce(mkdirError);

    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir: path.join(tempRoot, 'no-access'),
        pattern: 'XXX',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(DirectoryAccessError);
  });

  it('throws DirectoryAccessError when removal fails due to permissions', async () => {
    const outputDir = path.join(tempRoot, 'cannot-remove');

    // Create an existing file in the output directory that will need to be removed
    await writeExtensionFile(outputDir, 'existing-file.json', {
      id: 'old-extension',
      description: 'This file should be removed in full-overwrite mode',
    });

    builderMock.execute.mockImplementation(async () => {
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      const tempDir = match ? match[1] : '';

      await writeExtensionFile(tempDir, 'skip.json', {
        id: 'other-extension',
        description: 'does not match',
      });

      return noopDcCliResponse;
    });

    const unlinkError = new Error('blocked') as NodeJS.ErrnoException;
    unlinkError.code = 'EPERM';
    const unlinkMock = vi.mocked(fs.unlink);
    unlinkMock.mockRejectedValueOnce(unlinkError);

    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir,
        pattern: 'XXX',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(DirectoryAccessError);
  });

  it('throws HubAuthenticationError when dc-cli reports authentication failure', async () => {
    builderMock.execute.mockRejectedValue(
      Object.assign(new Error('401'), { stderr: '401 Unauthorized', stdout: '' })
    );

    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir: path.join(tempRoot, 'auth'),
        pattern: 'XXX',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(HubAuthenticationError);
  });

  it('throws DcCliExecutionError when dc-cli fails for other reasons', async () => {
    builderMock.execute.mockRejectedValue(
      Object.assign(new Error('boom'), { stderr: 'boom', stdout: 'details' })
    );

    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir: path.join(tempRoot, 'dc-error'),
        pattern: 'XXX',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(DcCliExecutionError);
  });

  it('cleans up downloaded files when an unexpected error occurs', async () => {
    const outputDir = path.join(tempRoot, 'cleanup-on-error');
    const readMock = vi.mocked(fs.readFile);
    readMock.mockRejectedValueOnce(new Error('read failure'));
    builderMock.execute.mockImplementation(async () => {
      const command = builderMock.withCommand.mock.calls[0][0];
      const match = command.match(/extension export "(.+?)"/);
      const tempDir = match ? match[1] : '';

      await writeExtensionFile(tempDir, 'bad.json', {
        id: 'match',
      });

      return noopDcCliResponse;
    });

    await expect(
      exportExtensions({
        hub: mockHub,
        outputDir,
        pattern: 'match',
        mode: 'full-overwrite',
      })
    ).rejects.toBeInstanceOf(DirectoryAccessError);

    // Temp directory should be cleaned up
    expect(
      await fs
        .access(path.join(outputDir, 'bad.json'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });
});

describe('extensionMatchesPattern', () => {
  it('matches when description satisfies regex', () => {
    const extension = {
      fileName: 'ext.json',
      filePath: '/tmp/ext.json',
      description: 'Contains target keyword',
    };

    expect(extensionMatchesPattern(extension, /target/)).toBe(true);
    expect(extensionMatchesPattern(extension, /missing/)).toBe(false);
  });
});
