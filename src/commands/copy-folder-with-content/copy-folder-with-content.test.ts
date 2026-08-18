import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHubConfigs } from '~/app-config';
import { promptForProtectedEnvironment } from '~/prompts';
import { listNestedSubfolders } from '~/services/actions/list-nested-subfolders';
import {
  preflightContentItemRecreation,
  type ContentItemRecreationPreflightResult,
  type ContentItemRecreationPreflightReady,
} from '~/services/actions/preflight-content-item-recreation';
import { recreateContentItems } from '~/services/actions/recreate-content-items';
import { recreateFolderStructure } from '~/services/actions/recreate-folder-structure';
import type { ResolverResult } from '~/services/content-reference';
import {
  countTotalFolders,
  createPhaseProgressBar,
  createProgressBar,
  getAllSubfolderIds,
} from '~/utils';
import {
  analyzeHierarchyStructure,
  confirmOperation,
  createFolderMapping,
  displayContentTypePreflightResult,
  selectSourceLocation,
  selectTargetLocation,
  sortContentForRecreation,
} from '../shared';
import { runCopyFolderWithContent } from './copy-folder-with-content';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions/list-nested-subfolders');
vi.mock('~/services/actions/preflight-content-item-recreation');
vi.mock('~/services/actions/recreate-content-items');
vi.mock('~/services/actions/recreate-folder-structure');
vi.mock('~/utils');
vi.mock('../shared');

describe('runCopyFolderWithContent content type preflight', () => {
  const preflightProgress = {
    stop: vi.fn(),
    update: vi.fn(),
  };
  const progressBar = {
    increment: vi.fn(),
    setTotal: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  };
  const sourceService = {
    getAllContentItems: vi.fn(),
    getContentItemWithDetails: vi.fn(),
  };
  const targetService = {
    createFolder: vi.fn(),
    createSubFolder: vi.fn(),
  };
  const sourceFolder = { id: 'source-folder', name: 'Translations' } as Amplience.Folder;
  const createdFolder = { id: 'target-folder', name: 'Translations' } as Amplience.Folder;
  const sourceItem = {
    id: 'source-item',
    label: 'Translation root',
    schemaId: 'https://schema.example.com/translation-root',
    body: { _meta: { schema: 'https://schema.example.com/translation-root' } },
  } as Amplience.ContentItem;
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
    sourceItems: new Map([['source-item', sourceItem as Amplience.ContentItemWithDetails]]),
    warnings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.mocked(getHubConfigs).mockReturnValue([{ name: 'Hub' }] as Amplience.HubConfig[]);
    vi.mocked(selectSourceLocation).mockResolvedValue(
      source as unknown as Awaited<ReturnType<typeof selectSourceLocation>>
    );
    vi.mocked(selectTargetLocation).mockResolvedValue(
      target as unknown as Awaited<ReturnType<typeof selectTargetLocation>>
    );
    vi.mocked(listNestedSubfolders).mockResolvedValue({ raw: [], tree: [] });
    vi.mocked(countTotalFolders).mockReturnValue(0);
    vi.mocked(getAllSubfolderIds).mockReturnValue([]);
    vi.mocked(createProgressBar).mockReturnValue(
      progressBar as unknown as ReturnType<typeof createProgressBar>
    );
    vi.mocked(createPhaseProgressBar).mockReturnValue(preflightProgress);
    sourceService.getAllContentItems.mockResolvedValue([sourceItem]);
    vi.mocked(analyzeHierarchyStructure).mockResolvedValue({
      allItemsToProcess: ['source-item'],
      hierarchyChildrenFound: 0,
      hierarchyRootItems: [],
    });
    vi.mocked(sortContentForRecreation).mockImplementation(items => items);
    vi.mocked(confirmOperation).mockResolvedValue(true);
    vi.mocked(promptForProtectedEnvironment).mockResolvedValue(undefined);
    targetService.createFolder.mockResolvedValue({ success: true, updatedItem: createdFolder });
    vi.mocked(createFolderMapping).mockReturnValue(new Map());
    vi.mocked(recreateFolderStructure).mockResolvedValue({
      totalFolders: 0,
      createdFolders: 0,
      failedFolders: 0,
      folderMapping: new Map(),
      errors: [],
    });
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

  it('stops before confirmation and target mutation when preflight is blocked', async () => {
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

    await runCopyFolderWithContent();

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
    expect(preflightProgress.stop).toHaveBeenCalledOnce();
    expect(confirmOperation).not.toHaveBeenCalled();
    expect(targetService.createFolder).not.toHaveBeenCalled();
    expect(recreateFolderStructure).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('renders preflight updates through a phase progress bar', async () => {
    vi.mocked(preflightContentItemRecreation).mockImplementation(async options => {
      options.onProgress?.('matching', 2, 4);

      return readyPreflight;
    });

    await runCopyFolderWithContent();

    expect(createPhaseProgressBar).toHaveBeenCalledOnce();
    expect(preflightProgress.update).toHaveBeenCalledWith('matching', 2, 4);
    expect(preflightProgress.stop).toHaveBeenCalledOnce();
    expect(console.log).not.toHaveBeenCalledWith('  📊 matching: 2/4');
  });

  it('stops preflight progress when preflight rejects', async () => {
    const error = new Error('Preflight failed');
    vi.mocked(preflightContentItemRecreation).mockRejectedValue(error);

    await runCopyFolderWithContent();

    expect(preflightProgress.stop).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith(
      '❌ Unexpected error during folder copy operation:',
      error
    );
  });

  it('passes the ready preflight to recreation after confirmation', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runCopyFolderWithContent();

    expect(displayContentTypePreflightResult).toHaveBeenCalledWith(readyPreflight, 'Newsroom');
    expect(confirmOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        'Referenced items to create': 2,
        'Total items to create': 3,
      }),
      expect.any(String),
      true
    );
    expect(promptForProtectedEnvironment).toHaveBeenCalledOnce();
    expect(promptForProtectedEnvironment).toHaveBeenCalledWith(target.hub, target.repository);
    expect(vi.mocked(promptForProtectedEnvironment).mock.invocationCallOrder[0]).toBeLessThan(
      targetService.createFolder.mock.invocationCallOrder[0]
    );
    expect(targetService.createFolder).toHaveBeenCalledOnce();
    expect(recreateContentItems).toHaveBeenCalledWith(
      sourceService,
      targetService,
      [{ itemId: 'source-item', sourceFolderId: 'source-folder' }],
      'target-repo',
      expect.any(Map),
      progressBar,
      undefined,
      true,
      'source-repo',
      readyPreflight
    );
  });

  it('stops before preflight when a source subfolder cannot be loaded', async () => {
    vi.mocked(listNestedSubfolders).mockResolvedValue({
      raw: [],
      tree: [{ id: 'source-subfolder', name: 'Child', children: [] } as never],
    });
    vi.mocked(countTotalFolders).mockReturnValue(1);
    vi.mocked(getAllSubfolderIds).mockReturnValue(['source-subfolder']);
    sourceService.getAllContentItems.mockImplementation(
      async (_repositoryId: string, _callback: unknown, query?: { folderId?: string }) => {
        if (query?.folderId === 'source-subfolder') {
          throw new Error('Subfolder API unavailable');
        }

        return [sourceItem];
      }
    );
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runCopyFolderWithContent();

    expect(preflightContentItemRecreation).not.toHaveBeenCalled();
    expect(confirmOperation).not.toHaveBeenCalled();
    expect(targetService.createFolder).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('stops before preflight when nested folder enumeration fails', async () => {
    vi.mocked(listNestedSubfolders).mockRejectedValue(new Error('Folder API unavailable'));
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runCopyFolderWithContent();

    expect(preflightContentItemRecreation).not.toHaveBeenCalled();
    expect(confirmOperation).not.toHaveBeenCalled();
    expect(targetService.createFolder).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('stops before preflight when a hierarchy descendant cannot be loaded', async () => {
    vi.mocked(analyzeHierarchyStructure).mockResolvedValue({
      allItemsToProcess: ['source-item', 'hierarchy-child'],
      hierarchyChildrenFound: 1,
      hierarchyRootItems: [],
    });
    sourceService.getContentItemWithDetails.mockResolvedValue(null);
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runCopyFolderWithContent();

    expect(sourceService.getContentItemWithDetails).toHaveBeenCalledWith('hierarchy-child');
    expect(preflightContentItemRecreation).not.toHaveBeenCalled();
    expect(confirmOperation).not.toHaveBeenCalled();
    expect(targetService.createFolder).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('stops before preflight when selected-item hierarchy analysis fails', async () => {
    vi.mocked(analyzeHierarchyStructure).mockRejectedValue(
      new Error('Failed to load selected content item details: source-item')
    );
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);

    await runCopyFolderWithContent();

    expect(preflightContentItemRecreation).not.toHaveBeenCalled();
    expect(confirmOperation).not.toHaveBeenCalled();
    expect(targetService.createFolder).not.toHaveBeenCalled();
    expect(recreateContentItems).not.toHaveBeenCalled();
  });

  it('reports actual recreation failures without claiming folder copy success', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);
    vi.mocked(recreateContentItems).mockResolvedValue({
      success: false,
      itemsCreated: 1,
      itemsUpdated: 0,
      failed: 2,
      publishFailed: 0,
    });

    await runCopyFolderWithContent();

    expect(console.error).toHaveBeenCalledWith(
      '❌ Content item recreation completed with failures: 1 created, 2 failed.'
    );
    expect(console.log).not.toHaveBeenCalledWith(
      '\n🎉 Folder copy operation completed successfully!'
    );
  });

  it('stops before content recreation when any target subfolder creation fails', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);
    vi.mocked(listNestedSubfolders).mockResolvedValue({
      raw: [],
      tree: [{ id: 'source-subfolder', name: 'Child', children: [] } as never],
    });
    vi.mocked(countTotalFolders).mockReturnValue(1);
    vi.mocked(recreateFolderStructure).mockResolvedValue({
      totalFolders: 1,
      createdFolders: 0,
      failedFolders: 1,
      folderMapping: new Map(),
      errors: [{ folderName: 'Child', error: 'Folder creation failed' }],
    });

    await runCopyFolderWithContent();

    expect(recreateFolderStructure).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith(
      '❌ Folder structure recreation failed for 1 folder. Content recreation was not started.'
    );
    expect(recreateContentItems).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith(
      '\n🎉 Folder copy operation completed successfully!'
    );
  });

  it('reports publication failures without claiming folder copy success', async () => {
    vi.mocked(preflightContentItemRecreation).mockResolvedValue(readyPreflight);
    vi.mocked(recreateContentItems).mockResolvedValue({
      success: false,
      itemsCreated: 3,
      itemsUpdated: 0,
      failed: 0,
      publishFailed: 1,
    });

    await runCopyFolderWithContent();

    expect(console.error).toHaveBeenCalledWith(
      '❌ Content item recreation completed with failures: 3 created, 0 failed, 1 publish failed.'
    );
    expect(console.log).not.toHaveBeenCalledWith(
      '\n🎉 Folder copy operation completed successfully!'
    );
  });
});
