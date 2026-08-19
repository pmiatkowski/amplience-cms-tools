import { describe, expect, it } from 'vitest';
import { generateContentTypeSyncReport } from './content-type-sync-report';

describe('generateContentTypeSyncReport', () => {
  it('records preflight choices, actions, and property-sync results', () => {
    const report = generateContentTypeSyncReport({
      prepared: {
        sourceHub: {
          name: 'Source',
          envKey: 'SOURCE',
          hubId: 'source-hub-id',
          patToken: 'secret',
        },
        targetHub: {
          name: 'Target',
          envKey: 'TARGET',
          hubId: 'target-hub-id',
          patToken: 'secret',
        },
        alignmentPlan: {
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
                settings: { label: 'Old Article' },
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
              ],
              actions: ['UPDATE_SETTINGS', 'ASSIGN', 'UNASSIGN'],
            },
          ],
        },
        schemaIds: ['https://schema.example.com/article.json'],
        copySchemas: true,
        syncProperties: true,
        isDryRun: false,
      },
      result: {
        success: true,
        alignment: {
          success: true,
          dryRun: false,
          processedContentTypes: ['https://schema.example.com/article.json'],
          failedContentTypes: [],
        },
        propertySync: {
          success: true,
          processedContentTypes: ['target-content-type-id'],
          failedContentTypes: [],
          totalCount: 1,
        },
        propertySyncStatus: 'SUCCEEDED',
      },
    });

    expect(report).toContain('# Sync Content Types Report');
    expect(report).toContain('**Source Hub**: Source');
    expect(report).toContain('**Target Hub**: Target');
    expect(report).toContain('**Repository Mode**: exact');
    expect(report).toContain('UPDATE_SETTINGS, ASSIGN, UNASSIGN');
    expect(report).toContain('- Settings Changes:');
    expect(report).toContain('  - label');
    expect(report).toContain('    - Current target (Target): "Old Article"');
    expect(report).toContain('    - Planned target (from Source): "Article"');
    expect(report).toContain('- Repository Assignments:');
    expect(report).toContain('  - Current target (Target): Legacy');
    expect(report).toContain('  - Planned target (exact): Content');
    expect(report).toContain('  - Assign: Content');
    expect(report).toContain('  - Unassign: Legacy');
    expect(report).toContain('**Property Sync Status**: SUCCEEDED');
    expect(report).not.toContain('secret');
  });

  it('marks a dry run as a preview with planned property synchronization', () => {
    const report = generateContentTypeSyncReport({
      prepared: {
        sourceHub: { name: 'Source', envKey: 'SOURCE', hubId: 'source', patToken: 'token' },
        targetHub: { name: 'Target', envKey: 'TARGET', hubId: 'target', patToken: 'token' },
        alignmentPlan: { repositoryMode: 'additive', items: [] },
        schemaIds: [],
        copySchemas: false,
        syncProperties: true,
        isDryRun: true,
      },
      result: { success: true, propertySyncStatus: 'PLANNED' },
    });

    expect(report).toContain('**Mode**: Dry Run (Preview)');
    expect(report).toContain('**Property Sync Status**: PLANNED');
  });

  it('includes a dc-cli import error retained alongside verified partial results', () => {
    const report = generateContentTypeSyncReport({
      prepared: {
        sourceHub: { name: 'Source', envKey: 'SOURCE', hubId: 'source', patToken: 'token' },
        targetHub: { name: 'Target', envKey: 'TARGET', hubId: 'target', patToken: 'token' },
        alignmentPlan: { repositoryMode: 'exact', items: [] },
        schemaIds: [],
        copySchemas: false,
        syncProperties: false,
        isDryRun: false,
      },
      result: {
        success: false,
        alignment: {
          success: false,
          dryRun: false,
          commandError: 'Import stopped after a partial update',
          processedContentTypes: ['https://schema.example.com/article.json'],
          failedContentTypes: [],
        },
        propertySyncStatus: 'SKIPPED_BY_USER',
      },
    });

    expect(report).toContain('dc-cli Import Error: Import stopped after a partial update');
  });
});
