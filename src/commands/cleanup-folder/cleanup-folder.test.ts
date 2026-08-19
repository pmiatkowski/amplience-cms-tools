import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { cleanupFolder } from '~/services/actions/cleanup-folder';
import { AmplienceService } from '~/services/amplience-service';

import { runCleanupFolderCommand } from './cleanup-folder';
import { promptForCleanupOptions } from './prompts';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions/cleanup-folder');
vi.mock('~/services/amplience-service');
vi.mock('./prompts');

describe('runCleanupFolderCommand protection', () => {
  const hub = {
    name: 'Production',
    envKey: 'PROD',
    hubId: 'production-hub-id',
    patToken: 'pat-token',
    protected: true,
  } satisfies Amplience.HubConfig;
  const repository = {
    id: 'repository-id',
    name: 'content-production',
    label: 'Content Production',
  } as Amplience.ContentRepository;
  const options = {
    deletedFolderName: '__deleted',
    clearDeliveryKey: true,
    unpublishIfNeeded: true,
    unarchiveIfNeeded: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([hub]);
    vi.mocked(prompts.promptForHub).mockResolvedValue(hub);
    vi.mocked(prompts.promptForRepository).mockResolvedValue(repository);
    vi.mocked(prompts.promptForFolder).mockResolvedValue(null);
    vi.mocked(promptForCleanupOptions).mockResolvedValue(options);
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(cleanupFolder).mockResolvedValue({
      targetFolderId: 'repository-root',
      repositoryId: repository.id,
      deletedFolderId: null,
      overallSuccess: true,
      foldersProcessed: [],
      contentItemsProcessed: [],
      foldersDeleted: [],
      errors: [],
    });
    vi.mocked(AmplienceService).mockImplementation(
      () => ({ getRepositories: vi.fn().mockResolvedValue([repository]) }) as never
    );
  });

  it('should challenge the selected hub and repository before cleanup', async () => {
    await runCleanupFolderCommand();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(hub, repository);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(cleanupFolder).mock.invocationCallOrder[0]);
  });
});
