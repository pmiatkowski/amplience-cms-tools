import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { AmplienceService } from '~/services/amplience-service';
import { filterContentItems } from '~/services/filter-service';
import { createProgressBar } from '~/utils';

import { promptForPublishUpdatedItems } from './prompts';
import { runUpdateDeliveryKeysLocale } from './update-delivery-keys-locale';
import { generateNewDeliveryKey } from './utils';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/amplience-service');
vi.mock('~/services/filter-service');
vi.mock('~/utils');
vi.mock('./prompts');
vi.mock('./utils');

describe('runUpdateDeliveryKeysLocale protection', () => {
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
    body: { _meta: { schema: 'https://example.com/schema', deliveryKey: 'en/item' } },
  } as Amplience.ContentItem;
  const updateDeliveryKey = vi.fn().mockResolvedValue({ success: false, error: 'stop' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([hub]);
    vi.mocked(prompts.promptForHub).mockResolvedValue(hub);
    vi.mocked(prompts.promptForRepository).mockResolvedValue(repository);
    vi.mocked(prompts.promptForFilters).mockResolvedValue({} as never);
    vi.mocked(prompts.promptForLocale).mockResolvedValue('fr');
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(filterContentItems).mockReturnValue([item]);
    vi.mocked(generateNewDeliveryKey).mockReturnValue('fr/item');
    vi.mocked(createProgressBar).mockReturnValue({ increment: vi.fn(), stop: vi.fn() } as never);
    vi.mocked(promptForPublishUpdatedItems).mockResolvedValue(false);
    vi.mocked(AmplienceService).mockImplementation(
      () =>
        ({
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getAllContentItems: vi.fn().mockResolvedValue([item]),
          updateDeliveryKey,
        }) as never
    );
  });

  it('should challenge the selected hub and repository before updating an item', async () => {
    await runUpdateDeliveryKeysLocale();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(hub, repository);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(updateDeliveryKey.mock.invocationCallOrder[0]);
  });
});
