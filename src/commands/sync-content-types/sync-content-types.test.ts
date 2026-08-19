import { describe, expect, it, vi } from 'vitest';
import {
  displayContentTypeAlignmentPlan,
  executePreparedContentTypeSync,
  prepareContentTypeSync,
  runSyncContentTypes,
} from './sync-content-types';

describe('executePreparedContentTypeSync', () => {
  const sourceHub: Amplience.HubConfig = {
    name: 'Source',
    envKey: 'SOURCE',
    hubId: 'source-hub-id',
    patToken: 'token',
  };
  const targetHub: Amplience.HubConfig = {
    name: 'Target',
    envKey: 'TARGET',
    hubId: 'target-hub-id',
    patToken: 'token',
  };
  const alignmentPlan: Amplience.ContentTypeAlignmentPlan = {
    repositoryMode: 'exact',
    items: [
      {
        contentTypeUri: 'https://schema.example.com/article.json',
        source: {
          contentTypeUri: 'https://schema.example.com/article.json',
          settings: { label: 'Article' },
          repositories: ['Content'],
        },
        desiredRepositories: ['Content'],
        repositoriesToAssign: ['Content'],
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
    ],
  };

  it('runs the confirmed stages without prompts and scopes property sync to successful types', async () => {
    const order: string[] = [];
    const copySchemas = vi.fn(async () => {
      order.push('schemas');

      return {
        success: true,
        processedSchemas: ['https://schema.example.com/article.json'],
        failedSchemas: [],
        totalCount: 1,
      };
    });
    const executeAlignment = vi.fn(async () => {
      order.push('alignment');

      return {
        success: true,
        dryRun: false,
        processedContentTypes: ['https://schema.example.com/article.json'],
        failedContentTypes: [],
      };
    });
    const waitForSchemaIndexing = vi.fn(async () => {
      order.push('indexing');
    });
    const listTargetContentTypes = vi.fn(async () => {
      order.push('list');

      return [
        {
          id: 'target-content-type-id',
          hubContentTypeId: 'target-hub-content-type-id',
          contentTypeUri: 'https://schema.example.com/article.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
        },
      ];
    });
    const syncProperties = vi.fn(async options => {
      order.push('properties');
      expect(options.context).toMatchObject({
        targetHub,
        targetContentTypeIds: ['target-content-type-id'],
        skipConfirmations: true,
        protectedEnvironmentConfirmed: true,
      });

      return {
        success: true,
        processedContentTypes: ['target-content-type-id'],
        failedContentTypes: [],
        totalCount: 1,
      };
    });

    const result = await executePreparedContentTypeSync(
      {
        sourceHub,
        targetHub,
        alignmentPlan,
        schemaIds: ['https://schema.example.com/article.json'],
        copySchemas: true,
        syncProperties: true,
        isDryRun: false,
      },
      {
        copySchemas,
        waitForSchemaIndexing,
        executeAlignment,
        listTargetContentTypes,
        syncProperties,
      }
    );

    expect(order).toEqual(['schemas', 'indexing', 'alignment', 'list', 'properties']);
    expect(waitForSchemaIndexing).toHaveBeenCalledWith(['https://schema.example.com/article.json']);
    expect(result.success).toBe(true);
    expect(result.propertySync?.processedContentTypes).toEqual(['target-content-type-id']);
  });

  it('does not perform remote schema or property stages in dry-run mode', async () => {
    const copySchemas = vi.fn();
    const executeAlignment = vi.fn().mockResolvedValue({
      success: true,
      dryRun: true,
      processedContentTypes: ['https://schema.example.com/article.json'],
      failedContentTypes: [],
    });
    const listTargetContentTypes = vi.fn();
    const syncProperties = vi.fn();

    const result = await executePreparedContentTypeSync(
      {
        sourceHub,
        targetHub,
        alignmentPlan,
        schemaIds: ['https://schema.example.com/article.json'],
        copySchemas: true,
        syncProperties: true,
        isDryRun: true,
      },
      { copySchemas, executeAlignment, listTargetContentTypes, syncProperties }
    );

    expect(copySchemas).not.toHaveBeenCalled();
    expect(listTargetContentTypes).not.toHaveBeenCalled();
    expect(syncProperties).not.toHaveBeenCalled();
    expect(result.propertySyncStatus).toBe('PLANNED');
  });

  it('fails closed before alignment when confirmed schema copying fails', async () => {
    const copySchemas = vi.fn().mockResolvedValue({
      success: false,
      processedSchemas: [],
      failedSchemas: [{ schemaId: 'bulk-import', error: 'Import failed' }],
      totalCount: 0,
    });
    const executeAlignment = vi.fn();

    const result = await executePreparedContentTypeSync(
      {
        sourceHub,
        targetHub,
        alignmentPlan,
        schemaIds: ['https://schema.example.com/article.json'],
        copySchemas: true,
        syncProperties: false,
        isDryRun: false,
      },
      {
        copySchemas,
        executeAlignment,
        listTargetContentTypes: vi.fn(),
        syncProperties: vi.fn(),
      }
    );

    expect(executeAlignment).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.alignment).toBeUndefined();
  });
});

describe('prepareContentTypeSync', () => {
  const sourceHub: Amplience.HubConfig = {
    name: 'Source',
    envKey: 'SOURCE',
    hubId: 'source-hub-id',
    patToken: 'token',
  };
  const targetHub: Amplience.HubConfig = {
    name: 'Target',
    envKey: 'TARGET',
    hubId: 'target-hub-id',
    patToken: 'token',
    protected: true,
  };
  const sourceDefinition: Amplience.ContentTypeExportDefinition = {
    contentTypeUri: 'https://schema.example.com/article.json',
    status: 'ACTIVE' as Amplience.ContentTypeStatus,
    settings: {
      label: 'Article',
      visualizations: [
        {
          label: 'Preview',
          templatedUri: 'https://vse.dev.example.com/preview?id={{contentItemId}}',
        },
      ],
    },
    repositories: ['Content'],
  };
  const targetRepository: Amplience.ContentRepository = {
    id: 'target-repository-id',
    name: 'Content',
    label: 'Content',
    status: 'ACTIVE' as Amplience.RepositoryStatus,
    contentTypes: [],
  };

  it('collects every choice before protection and returns a target-aware immutable plan', async () => {
    const order: string[] = [];
    const prepared = await prepareContentTypeSync({
      getHubConfigs: () => [sourceHub, targetHub],
      selectHub: async (_hubs, role) => {
        order.push(`hub-${role}`);

        return role === 'source' ? sourceHub : targetHub;
      },
      exportDefinitions: async hub => {
        order.push(`export-${hub.envKey}`);

        return hub.hubId === sourceHub.hubId ? [sourceDefinition] : [];
      },
      promptSchemaFilter: async () => {
        order.push('filter');

        return '';
      },
      selectDefinitions: async definitions => {
        order.push('types');

        return definitions;
      },
      promptCopySchemas: async () => {
        order.push('copy-schemas');

        return true;
      },
      getTargetSchemaIds: async () => [],
      getTargetRepositories: async () => [targetRepository],
      promptRepositoryMode: async () => {
        order.push('repository-mode');

        return 'exact';
      },
      promptRepositoryStrategy: async () => {
        order.push('repository-strategy');

        return 'automatic';
      },
      selectRepositories: async () => [],
      promptDryRun: async () => {
        order.push('dry-run');

        return false;
      },
      promptPropertySync: async () => {
        order.push('property-sync');

        return true;
      },
      confirmPlan: async () => {
        order.push('confirm');

        return true;
      },
      confirmProtectedEnvironment: async () => {
        order.push('protected');
      },
      getVisualizationUrl: envKey =>
        envKey === 'SOURCE' ? 'https://vse.dev.example.com' : 'https://vse.prod.example.com',
    });

    expect(order).toEqual([
      'hub-source',
      'hub-target',
      'export-SOURCE',
      'export-TARGET',
      'filter',
      'types',
      'copy-schemas',
      'repository-mode',
      'repository-strategy',
      'dry-run',
      'property-sync',
      'confirm',
      'protected',
    ]);
    expect(prepared?.syncProperties).toBe(true);
    expect(
      prepared?.alignmentPlan.items[0].source.settings?.visualizations?.[0].templatedUri
    ).toContain('https://vse.prod.example.com');
  });

  it('fails closed when automatic repository mapping cannot resolve a source name', async () => {
    await expect(
      prepareContentTypeSync({
        getHubConfigs: () => [sourceHub, targetHub],
        selectHub: async (_hubs, role) => (role === 'source' ? sourceHub : targetHub),
        exportDefinitions: async hub => (hub.hubId === sourceHub.hubId ? [sourceDefinition] : []),
        promptSchemaFilter: async () => '',
        selectDefinitions: async definitions => definitions,
        promptCopySchemas: async () => true,
        getTargetSchemaIds: async () => [],
        getTargetRepositories: async () => [],
        promptRepositoryMode: async () => 'exact',
        promptRepositoryStrategy: async () => 'automatic',
        selectRepositories: async () => [],
        promptDryRun: async () => false,
        promptPropertySync: async () => true,
        confirmPlan: async () => true,
        confirmProtectedEnvironment: async () => undefined,
        getVisualizationUrl: () => 'https://vse.example.com',
      })
    ).rejects.toThrow('No target repository mapping found for: Content');
  });
});

describe('displayContentTypeAlignmentPlan', () => {
  it('lists only changed settings with target and source values', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const plan: Amplience.ContentTypeAlignmentPlan = {
      repositoryMode: 'exact',
      items: [
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          source: {
            contentTypeUri: 'https://schema.example.com/article.json',
            settings: { label: 'Article', icons: [], visualizations: [], cards: [] },
          },
          target: {
            contentTypeUri: 'https://schema.example.com/article.json',
            settings: {
              label: 'Old Article',
              icons: [],
              visualizations: [
                {
                  label: 'Preview',
                  templatedUri: 'https://preview.example.com/{{contentItemId}}',
                },
              ],
              cards: [],
            },
            repositories: ['Legacy'],
          },
          desiredRepositories: ['Content'],
          repositoriesToAssign: ['Content'],
          repositoriesToUnassign: ['Legacy'],
          settingsChanges: [
            {
              setting: 'label',
              currentTargetValue: 'Old Article',
              plannedTargetValue: 'Article',
            },
            {
              setting: 'visualizations',
              currentTargetValue: [
                {
                  label: 'Preview',
                  templatedUri: 'https://preview.example.com/{{contentItemId}}',
                },
              ],
              plannedTargetValue: [],
            },
          ],
          actions: ['UPDATE_SETTINGS', 'ASSIGN', 'UNASSIGN'],
        },
      ],
    };

    displayContentTypeAlignmentPlan(plan, {
      sourceHubName: 'LIVE',
      targetHubName: 'UAT',
      copySchemas: false,
      syncProperties: true,
      isDryRun: true,
    });

    const output = log.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('Source hub: LIVE');
    expect(output).toContain('Target hub: UAT');
    expect(output).toContain('  Settings changes:');
    expect(output).toContain('    - label');
    expect(output).toContain('      Current target (UAT): "Old Article"');
    expect(output).toContain('      Planned target (from LIVE): "Article"');
    expect(output).toContain('    - visualizations');
    expect(output).toContain(
      '      Current target (UAT): [{"label":"Preview","templatedUri":"https://preview.example.com/{{contentItemId}}"}]'
    );
    expect(output).toContain(
      '      Planned target (from LIVE, visualization origin adapted for UAT): []'
    );
    expect(output).not.toContain('    - icons');
    expect(output).not.toContain('    - cards');
    expect(output).toContain('  Repository assignments:');
    expect(output).toContain('    Current target (UAT): Legacy');
    expect(output).toContain('    Planned target (exact): Content');
    expect(output).toContain('    Assign: Content');
    expect(output).toContain('    Unassign: Legacy');
    log.mockRestore();
  });

  it('states explicitly when repository assignments do not change', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const plan: Amplience.ContentTypeAlignmentPlan = {
      repositoryMode: 'exact',
      items: [
        {
          contentTypeUri: 'https://schema.example.com/article.json',
          source: {
            contentTypeUri: 'https://schema.example.com/article.json',
            settings: { label: 'Article' },
            repositories: ['Content'],
          },
          target: {
            contentTypeUri: 'https://schema.example.com/article.json',
            settings: { label: 'Article' },
            repositories: ['Content'],
          },
          desiredRepositories: ['Content'],
          repositoriesToAssign: [],
          repositoriesToUnassign: [],
          settingsChanges: [],
          actions: ['NO_CHANGE'],
        },
      ],
    };

    displayContentTypeAlignmentPlan(plan, {
      sourceHubName: 'LIVE',
      targetHubName: 'UAT',
      copySchemas: false,
      syncProperties: false,
      isDryRun: true,
    });

    const output = log.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('  Repository assignments:');
    expect(output).toContain('    Current target (UAT): Content');
    expect(output).toContain('    Planned target (exact): Content');
    expect(output).toContain('    Changes: none');
    log.mockRestore();
  });
});

describe('runSyncContentTypes', () => {
  it('does not execute when preflight is cancelled', async () => {
    const execute = vi.fn();

    const result = await runSyncContentTypes({
      prepare: vi.fn().mockResolvedValue(undefined),
      execute,
    });

    expect(result).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it('executes the prepared plan exactly once', async () => {
    const prepared = {
      sourceHub: {
        name: 'Source',
        envKey: 'SOURCE',
        hubId: 'source-hub-id',
        patToken: 'token',
      },
      targetHub: {
        name: 'Target',
        envKey: 'TARGET',
        hubId: 'target-hub-id',
        patToken: 'token',
      },
      alignmentPlan: { repositoryMode: 'exact' as const, items: [] },
      schemaIds: [],
      copySchemas: false,
      syncProperties: false,
      isDryRun: false,
    };
    const executionResult = {
      success: true,
      propertySyncStatus: 'SKIPPED_BY_USER' as const,
    };
    const execute = vi.fn().mockResolvedValue(executionResult);
    const saveReport = vi.fn().mockResolvedValue('reports/sync-content-types.md');

    const result = await runSyncContentTypes({
      prepare: vi.fn().mockResolvedValue(prepared),
      execute,
      saveReport,
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(prepared);
    expect(saveReport).toHaveBeenCalledWith(prepared, executionResult);
    expect(result).toBe(executionResult);
  });
});
