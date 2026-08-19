import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeContentTypeAlignment, exportContentTypeDefinitions } from './sync-content-types';

describe('executeContentTypeAlignment', () => {
  const temporaryDirectories: string[] = [];
  const targetHub: Amplience.HubConfig = {
    name: 'Target',
    envKey: 'TARGET',
    hubId: 'target-hub-id',
    patToken: 'token',
  };

  const plan: Amplience.ContentTypeAlignmentPlan = {
    repositoryMode: 'exact',
    items: [
      {
        contentTypeUri: 'https://schema.example.com/article.json',
        source: {
          contentTypeUri: 'https://schema.example.com/article.json',
          settings: {
            label: 'Article',
            icons: [],
            visualizations: [],
            cards: [],
          },
          repositories: ['Source Repository'],
        },
        desiredRepositories: ['Target Repository'],
        repositoriesToAssign: ['Target Repository'],
        repositoriesToUnassign: [],
        settingsChanges: [
          {
            setting: 'label',
            currentTargetValue: undefined,
            plannedTargetValue: 'Article',
          },
        ],
        actions: ['CREATE', 'ASSIGN'],
      },
      {
        contentTypeUri: 'https://schema.example.com/unchanged.json',
        source: {
          contentTypeUri: 'https://schema.example.com/unchanged.json',
          settings: { label: 'Unchanged' },
          repositories: [],
        },
        desiredRepositories: [],
        repositoriesToAssign: [],
        repositoriesToUnassign: [],
        settingsChanges: [],
        actions: ['NO_CHANGE'],
      },
    ],
  };

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory => fs.rm(directory, { recursive: true, force: true }))
    );
    temporaryDirectories.length = 0;
  });

  async function createTemporaryRoot(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-content-types-test-'));
    temporaryDirectories.push(directory);

    return directory;
  }

  it('does not invoke dc-cli during a dry run', async () => {
    const runCommand = vi.fn();

    const result = await executeContentTypeAlignment({
      targetHub,
      plan,
      isDryRun: true,
      runCommand,
    });

    expect(runCommand).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      dryRun: true,
      processedContentTypes: ['https://schema.example.com/article.json'],
    });
  });

  it('imports only changed definitions with the desired target repositories', async () => {
    const temporaryRoot = await createTemporaryRoot();
    let importedRecords: unknown[] = [];
    const runCommand = vi.fn(async (_hub, command: string, args: string[]) => {
      expect(command).toBe('content-type import');
      const importDirectory = args[0].replace(/^"|"$/g, '');
      const files = await fs.readdir(importDirectory);
      importedRecords = await Promise.all(
        files.map(async file =>
          JSON.parse(await fs.readFile(path.join(importDirectory, file), 'utf-8'))
        )
      );

      return { stdout: '', stderr: '' };
    });

    const result = await executeContentTypeAlignment({
      targetHub,
      plan,
      isDryRun: false,
      temporaryRoot,
      runCommand,
      exportTargetDefinitions: vi.fn().mockResolvedValue([
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Article',
            icons: [],
            visualizations: [],
            cards: [],
          },
          repositories: ['Target Repository'],
        },
      ]),
    });

    expect(importedRecords).toEqual([
      {
        contentTypeUri: 'https://schema.example.com/article.json',
        settings: {
          label: 'Article',
          icons: [],
          visualizations: [],
          cards: [],
        },
        repositories: ['Target Repository'],
      },
    ]);
    expect(result.success).toBe(true);
    expect(result.processedContentTypes).toEqual(['https://schema.example.com/article.json']);
    await expect(fs.stat(temporaryRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reports a post-import mismatch instead of assuming command success', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

    const result = await executeContentTypeAlignment({
      targetHub,
      plan,
      isDryRun: false,
      temporaryRoot,
      runCommand,
      exportTargetDefinitions: vi.fn().mockResolvedValue([
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Stale Article' },
          repositories: [],
        },
      ]),
    });

    expect(result.success).toBe(false);
    expect(result.processedContentTypes).toEqual([]);
    expect(result.failedContentTypes).toEqual([
      {
        contentTypeUri: 'https://schema.example.com/article.json',
        error: expect.stringContaining('Post-import verification failed'),
      },
    ]);
  });

  it('cleans temporary files and reports failure when import fails', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn().mockRejectedValue(new Error('Import failed'));

    const result = await executeContentTypeAlignment({
      targetHub,
      plan,
      isDryRun: false,
      temporaryRoot,
      runCommand,
      exportTargetDefinitions: vi.fn().mockResolvedValue([]),
    });

    expect(result).toMatchObject({
      success: false,
      processedContentTypes: [],
      failedContentTypes: [
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          error: expect.stringContaining('Import failed'),
        },
      ],
    });
    await expect(fs.stat(temporaryRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('verifies partial outcomes even when dc-cli import exits with an error', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const secondItem: Amplience.ContentTypeAlignmentPlanItem = {
      contentTypeUri: 'https://schema.example.com/second.json',
      source: {
        contentTypeUri: 'https://schema.example.com/second.json',
        settings: { label: 'Second' },
        repositories: [],
      },
      desiredRepositories: [],
      repositoriesToAssign: [],
      repositoriesToUnassign: [],
      settingsChanges: [
        {
          setting: 'label',
          currentTargetValue: undefined,
          plannedTargetValue: 'Second',
        },
      ],
      actions: ['CREATE'],
    };

    const result = await executeContentTypeAlignment({
      targetHub,
      plan: { ...plan, items: [plan.items[0], secondItem] },
      isDryRun: false,
      temporaryRoot,
      runCommand: vi.fn().mockRejectedValue(new Error('Import stopped after a partial update')),
      exportTargetDefinitions: vi.fn().mockResolvedValue([
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Article',
            icons: [],
            visualizations: [],
            cards: [],
          },
          repositories: ['Target Repository'],
        },
      ]),
    });

    expect(result.success).toBe(false);
    expect(result.commandError).toBe('Import stopped after a partial update');
    expect(result.processedContentTypes).toEqual(['https://schema.example.com/article.json']);
    expect(result.failedContentTypes).toEqual([
      {
        contentTypeUri: 'https://schema.example.com/second.json',
        error: expect.stringContaining('Post-import verification failed'),
      },
    ]);
  });
});

describe('exportContentTypeDefinitions', () => {
  const temporaryDirectories: string[] = [];
  const sourceHub: Amplience.HubConfig = {
    name: 'Source',
    envKey: 'SOURCE',
    hubId: 'source-hub-id',
    patToken: 'token',
  };

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory => fs.rm(directory, { recursive: true, force: true }))
    );
    temporaryDirectories.length = 0;
  });

  async function createTemporaryRoot(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'export-content-types-test-'));
    temporaryDirectories.push(directory);

    return directory;
  }

  it('exports and parses definitions using the documented archived and force flags', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn(async (_hub, command: string, args: string[]) => {
      expect(command).toBe('content-type export');
      expect(args).toContain('--archived');
      expect(args).toContain('--force');
      const exportDirectory = args[0].replace(/^"|"$/g, '');
      await fs.writeFile(
        path.join(exportDirectory, 'article.json'),
        JSON.stringify({
          contentTypeUri: 'https://schema.example.com/article.json',
          status: 'ACTIVE',
          settings: { label: 'Article', visualizations: [], icons: [], cards: [] },
          repositories: ['Content'],
        })
      );

      return { stdout: '', stderr: '' };
    });

    const result = await exportContentTypeDefinitions({
      hub: sourceHub,
      includeArchived: true,
      temporaryRoot,
      runCommand,
    });

    expect(result).toEqual([
      {
        contentTypeUri: 'https://schema.example.com/article.json',
        status: 'ACTIVE',
        settings: { label: 'Article', visualizations: [], icons: [], cards: [] },
        repositories: ['Content'],
      },
    ]);
    await expect(fs.stat(temporaryRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects malformed exported definitions', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn(async (_hub, _command: string, args: string[]) => {
      const exportDirectory = args[0].replace(/^"|"$/g, '');
      await fs.writeFile(
        path.join(exportDirectory, 'invalid.json'),
        JSON.stringify({ settings: {} })
      );

      return { stdout: '', stderr: '' };
    });

    await expect(
      exportContentTypeDefinitions({
        hub: sourceHub,
        includeArchived: false,
        temporaryRoot,
        runCommand,
      })
    ).rejects.toThrow('invalid.json: contentTypeUri must be a non-empty string');
  });

  it('accepts sparse settings allowed by the installed management SDK', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn(async (_hub, _command: string, args: string[]) => {
      const exportDirectory = args[0].replace(/^"|"$/g, '');
      await fs.writeFile(
        path.join(exportDirectory, 'sparse.json'),
        JSON.stringify({
          contentTypeUri: 'https://schema.example.com/sparse.json',
          settings: {
            icons: [{}],
            visualizations: [{ label: 'Preview' }],
            cards: [{ templatedUri: 'https://cards.example.com/{{contentItemId}}' }],
          },
          repositories: [],
        })
      );

      return { stdout: '', stderr: '' };
    });

    const result = await exportContentTypeDefinitions({
      hub: sourceHub,
      includeArchived: false,
      temporaryRoot,
      runCommand,
    });

    expect(result).toHaveLength(1);
    expect(result[0].settings?.icons).toEqual([{}]);
  });

  it('rejects duplicate content type URIs across export files', async () => {
    const temporaryRoot = await createTemporaryRoot();
    const runCommand = vi.fn(async (_hub, _command: string, args: string[]) => {
      const exportDirectory = args[0].replace(/^"|"$/g, '');
      const definition = JSON.stringify({
        contentTypeUri: 'https://schema.example.com/article.json',
        settings: { label: 'Article' },
        repositories: [],
      });
      await fs.writeFile(path.join(exportDirectory, 'article.json'), definition);
      await fs.writeFile(path.join(exportDirectory, 'duplicate.json'), definition);

      return { stdout: '', stderr: '' };
    });

    await expect(
      exportContentTypeDefinitions({
        hub: sourceHub,
        includeArchived: false,
        temporaryRoot,
        runCommand,
      })
    ).rejects.toThrow(
      'Duplicate contentTypeUri in export: https://schema.example.com/article.json'
    );
  });
});
