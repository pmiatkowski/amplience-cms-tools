import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { ensureDeletedFolder } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { filterContentItems } from '~/services/filter-service';
import { displayTable } from '~/utils';

import { runCleanRepository } from './clean-repository';
import { promptForIncludeHierarchyDescendants } from './prompts';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions');
vi.mock('~/services/amplience-service');
vi.mock('~/services/filter-service');
vi.mock('~/utils');
vi.mock('./prompts');

describe('runCleanRepository protection', () => {
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
  const item = {
    id: 'item-id',
    label: 'Item',
    version: 1,
    status: 'ACTIVE',
    body: { _meta: { schema: 'https://example.com/schema', deliveryKey: 'en/item' } },
  } as Amplience.ContentItem;
  const getAllContentItems = vi.fn().mockResolvedValue([item]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([hub]);
    vi.mocked(prompts.promptForHub).mockResolvedValue(hub);
    vi.mocked(prompts.promptForRepository).mockResolvedValue(repository);
    vi.mocked(prompts.promptForCleanupFilters).mockResolvedValue({} as never);
    vi.mocked(promptForIncludeHierarchyDescendants).mockResolvedValue(false);
    vi.mocked(filterContentItems).mockReturnValue([item]);
    vi.mocked(displayTable).mockReturnValue(undefined);
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForItemsToClean).mockResolvedValue([item.id]);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(ensureDeletedFolder).mockResolvedValue({ success: false, error: 'stop' });
    vi.mocked(AmplienceService).mockImplementation(
      () =>
        ({ getRepositories: vi.fn().mockResolvedValue([repository]), getAllContentItems }) as never
    );
  });

  it('should challenge the selected hub and repository before the first cleanup write', async () => {
    await runCleanRepository();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(hub, repository);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(ensureDeletedFolder).mock.invocationCallOrder[0]);
  });
});
