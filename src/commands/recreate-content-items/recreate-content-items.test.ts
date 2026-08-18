import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHubConfigs } from '~/app-config';
import { promptForConfirmation, promptForProtectedEnvironment } from '~/prompts';
import {
  preflightContentItemRecreation,
  recreateContentItems,
  type ContentItemRecreationPreflightResult,
  type ContentItemRecreationPreflightReady,
} from '~/services/actions';
import type { ResolverResult } from '~/services/content-reference';
import { analyzeHierarchyStructure } from '../shared/content-operations';
import { displayContentTypePreflightResult } from '../shared/content-type-preflight';
import { selectSourceLocation, selectTargetLocation } from '../shared/location-selection';
import {
  promptForItemsToRecreate,
  promptForRecreationFilters,
  promptForTargetLocale,
} from './prompts';
import { runRecreateContentItems } from './recreate-content-items';
import { applyFilters } from './utils';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions');
vi.mock('../shared/content-operations');
vi.mock('../shared/content-type-preflight');
vi.mock('../shared/location-selection');
vi.mock('./prompts');
vi.mock('./utils');

describe('runRecreateContentItems content type preflight', () => {
  const sourceService = {
    getAllContentItems: vi.fn(),
    getContentItemWithDetails: vi.fn(),
  };
  const targetService = {};
  const sourceFolder = { id: 'source-folder', name: 'Translations' } as Amplience.Folder;
  const sourceItem = {
    id: 'source-item',
    label: 'Translation root',
    schemaId: 'https://schema.example.com/translation-root',
    body: { _meta: { schema: 'https://schema.example.com/translation-root' } },
  } as Amplience.ContentItem;
  const sourceItemDetails = {
    ...sourceItem,
    hierarchy: undefined,
  } as unknown as Amplience.ContentItemWithDetails;
  const source = {
    hub: { name: 'Source Hub' },
    service: sourceService,
    repository: { id: 'source-repo', name: 'Source Repository' },
    folder: sourceFolder,
  };
  const target = {
    hub: { name: 'Target Hub' },
    service: targetService,
    repository: { id: 'target-repo', name: 'Newsroom' },
    folder: null,
  };
  const readyPreflight: ContentItemRecreationPreflightReady = {
    status: 'ready',
    sourceRepositoryId: 'source-repo',
    targetRepositoryId: 'target-repo',
    initialItemIds: ['source-item'],
    validation: {
      status: 'valid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: ['https://schema.example.com/translation-root'],
    },
    referenceResolution: { success: true } as unknown as ResolverResult,
    referenceSummary: {
      totalDiscovered: 4,
      matchedReferences: 1,
      itemsToCreate: 3,
      externalReferences: 0,
      circularGroups: 0,
    },
    sourceItems: new Map([['source-item', sourceItemDetails]]),
    warnings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(getHubConfigs).mockReturnValue([{ name: 'Hub' }] as Amplience.HubConfig[]);
    vi.mocked(selectSourceLocation).mockResolvedValue(
      source as unknown as Awaited<ReturnType<typeof selectSourceLocation>>
    );
    vi.mocked(selectTargetLocation).mockResolvedValue(
      target as unknown as Awaited<ReturnType<typeof selectTargetLocation>>
    );
    vi.mocked(promptForRecreationFilters).mockResolvedValue({ rootHierarchyOnly: false });
    sourceService.getAllContentItems.mockResolvedValue([sourceItem]);
    vi.mocked(applyFilters).mockReturnValue([sourceItem]);
    vi.mocked(promptForItemsToRecreate).mockResolvedValue([sourceItem]);
    sourceService.getContentItemWithDetails.mockResolvedValue(sourceItemDetails);
    vi.mocked(analyzeHierarchyStructure).mockResolvedValue({
      allItemsToProcess: ['source-item'],
      hierarchyChildrenFound: 0,
      hierarchyRootItems: [],
    });
    vi.mocked(promptForTargetLocale).mockResolvedValue(null);
    vi.mocked(promptForConfirmation).mockResolvedValue(true);
    vi.mocked(promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(recreateContentItems).mockResolvedValue({
      success: true,
      itemsCreated: 3,
      itemsUpdated: 0,
      failed: 0,
      publishFailed: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops before confirmation and execution when preflight is blocked', async () => {
    const blockedPreflight: ContentItemRecreationPreflightResult = {
      status: 'blocked',
      reason: 'content-type-validation-failed',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['source-item'],
      validation: {
        status: 'invalid',
        targetRepositoryId: 'target-repo',
        requiredContentTypeUris: ['https://schema.example.com/translation-root'],
        missingContentTypes: [
          {
            contentTypeUri: 'https://schema.example.com/translation-root',
            itemCount: 1,
            items: [{ id: 'source-item', label: 'Translation root' }],
          },
        ],
        itemsWithoutSchema: [],
      },
    };
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(blockedPreflight);

    await runRecreateContentItems();

    expect(preflightContentItemRecreation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceService,
        targetService,
        sourceRepositoryId: 'source-repo',
        targetRepositoryId: 'target-repo',
        initialItemIds: ['source-item'],
      })
    );
    expect(displayContentTypePreflightResult).toHaveBeenCalledWith(blockedPreflight, 'Newsroom');
    expect(promptForConfirmation).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('passes the ready preflight to recreation after confirmation', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runRecreateContentItems();

    expect(displayContentTypePreflightResult).toHaveBeenCalledWith(readyPreflight, 'Newsroom');
    expect(promptForConfirmation).toHaveBeenCalledOnce();
    expect(promptForProtectedEnvironment).toHaveBeenCalledOnce();
    expect(promptForProtectedEnvironment).toHaveBeenCalledWith(target.hub, target.repository);
    expect(vi.mocked(promptForProtectedEnvironment).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(recreateContentItems).mock.invocationCallOrder[0]
    );
    expect(console.log).toHaveBeenCalledWith('Referenced items to create: 2');
    expect(console.log).toHaveBeenCalledWith('Total items to create: 3');
    expect(recreateContentItems).toHaveBeenCalledWith(
      sourceService,
      targetService,
      [{ itemId: 'source-item', sourceFolderId: 'source-folder' }],
      'target-repo',
      new Map(),
      undefined,
      null,
      true,
      'source-repo',
      readyPreflight
    );
  });

  it('stops before target selection and preflight when hierarchy analysis fails', async () => {
    vi.mocked(analyzeHierarchyStructure).mockRejectedValue(
      new Error('Failed to load selected content item details: source-item')
    );
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await expect(runRecreateContentItems()).rejects.toThrow(
      'Failed to load selected content item details: source-item'
    );

    expect(selectTargetLocation).not.toHaveBeenCalled();
    expect(preflightContentItemRecreation).not.toHaveBeenCalled();
    expect(promptForConfirmation).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('reports actual recreation failures without claiming command success', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);
    vi.mocked(recreateContentItems).mockResolvedValue({
      success: false,
      itemsCreated: 1,
      itemsUpdated: 0,
      failed: 2,
      publishFailed: 0,
    });

    await runRecreateContentItems();

    expect(console.error).toHaveBeenCalledWith(
      '\n❌ Content item recreation completed with failures: 1 created, 2 failed.'
    );
    expect(console.log).not.toHaveBeenCalledWith('\n✅ Content item recreation completed!');
  });

  it('reports publication failures without claiming command success', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);
    vi.mocked(recreateContentItems).mockResolvedValue({
      success: false,
      itemsCreated: 3,
      itemsUpdated: 0,
      failed: 0,
      publishFailed: 1,
    });

    await runRecreateContentItems();

    expect(console.error).toHaveBeenCalledWith(
      '\n❌ Content item recreation completed with failures: 3 created, 0 failed, 1 publish failed.'
    );
    expect(console.log).not.toHaveBeenCalledWith('\n✅ Content item recreation completed!');
  });
});
