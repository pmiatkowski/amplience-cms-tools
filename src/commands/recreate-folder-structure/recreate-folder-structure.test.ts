import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { listNestedSubfolders } from '~/services/actions/list-nested-subfolders';
import { recreateFolderStructure } from '~/services/actions/recreate-folder-structure';
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar } from '~/utils';

import { runRecreateFolderStructure } from './recreate-folder-structure';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions/list-nested-subfolders');
vi.mock('~/services/actions/recreate-folder-structure');
vi.mock('~/services/amplience-service');
vi.mock('~/utils');

describe('runRecreateFolderStructure protection', () => {
  const sourceHub = { name: 'Source' } as Amplience.HubConfig;
  const targetHub = { name: 'Production', protected: true } as Amplience.HubConfig;
  const sourceRepository = {
    id: 'source-repo',
    name: 'source',
    label: 'Source',
  } as Amplience.ContentRepository;
  const targetRepository = {
    id: 'target-repo',
    name: 'content-production',
    label: 'Content Production',
  } as Amplience.ContentRepository;
  const sourceFolder = { id: 'source-folder', name: 'Source Folder' } as Amplience.Folder;
  const tree = [{ id: 'child-folder', name: 'Child', children: [] }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
    vi.mocked(prompts.promptForHub)
      .mockResolvedValueOnce(sourceHub)
      .mockResolvedValueOnce(targetHub);
    vi.mocked(prompts.promptForRepository)
      .mockResolvedValueOnce(sourceRepository)
      .mockResolvedValueOnce(targetRepository);
    vi.mocked(prompts.promptForFolder)
      .mockResolvedValueOnce(sourceFolder)
      .mockResolvedValueOnce(null);
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(listNestedSubfolders).mockResolvedValue({ raw: [], tree } as never);
    vi.mocked(createProgressBar).mockReturnValue({ increment: vi.fn(), stop: vi.fn() } as never);
    vi.mocked(recreateFolderStructure).mockResolvedValue({
      totalFolders: 1,
      createdFolders: 1,
      failedFolders: 0,
      folderMapping: new Map(),
      errors: [],
    });
    vi.mocked(AmplienceService)
      .mockImplementationOnce(
        () => ({ getRepositories: vi.fn().mockResolvedValue([sourceRepository]) }) as never
      )
      .mockImplementationOnce(
        () => ({ getRepositories: vi.fn().mockResolvedValue([targetRepository]) }) as never
      );
  });

  it('should challenge the target hub and repository before recreation', async () => {
    await runRecreateFolderStructure();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(targetHub, targetRepository);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(recreateFolderStructure).mock.invocationCallOrder[0]);
  });
});
