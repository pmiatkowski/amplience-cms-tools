import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { checkDcCliAvailability, createDcCliCommand, createProgressBar } from '~/utils';

import { syncContentTypeProperties } from './sync-content-type-properties';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/utils');

type MockCommandBuilder = {
  withHub: ReturnType<typeof vi.fn>;
  withCommand: ReturnType<typeof vi.fn>;
  withArg: ReturnType<typeof vi.fn>;
  withArgs: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
};

function createCommandBuilder(execute: ReturnType<typeof vi.fn>): MockCommandBuilder {
  const builder = {
    withHub: vi.fn(),
    withCommand: vi.fn(),
    withArg: vi.fn(),
    withArgs: vi.fn(),
    execute,
  };
  builder.withHub.mockReturnValue(builder);
  builder.withCommand.mockReturnValue(builder);
  builder.withArg.mockReturnValue(builder);
  builder.withArgs.mockReturnValue(builder);

  return builder;
}

describe('syncContentTypeProperties protection', () => {
  const targetHub = {
    name: 'Production',
    envKey: 'PROD',
    hubId: 'production-hub-id',
    patToken: 'pat-token',
    protected: true,
  } satisfies Amplience.HubConfig;
  const listExecute = vi.fn();
  const syncExecute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    listExecute.mockResolvedValue({
      stdout: JSON.stringify([
        {
          id: 'content-type-id',
          hubContentTypeId: 'hub-content-type-id',
          contentTypeUri: 'https://example.com/content-type',
          status: 'ACTIVE',
        },
      ]),
      stderr: '',
    });
    syncExecute.mockResolvedValue({ stdout: '{}', stderr: '' });
    vi.mocked(checkDcCliAvailability).mockResolvedValue(true);
    vi.mocked(getHubConfigs).mockReturnValue([targetHub]);
    vi.mocked(createDcCliCommand)
      .mockReturnValueOnce(createCommandBuilder(listExecute) as never)
      .mockReturnValueOnce(createCommandBuilder(syncExecute) as never);
    vi.mocked(createProgressBar).mockReturnValue({
      increment: vi.fn(),
      stop: vi.fn(),
    } as never);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
  });

  it('should challenge the target hub even when ordinary confirmations are skipped', async () => {
    await syncContentTypeProperties({
      context: {
        targetHub,
        skipConfirmations: true,
      },
    });

    expect(prompts.promptForConfirmation).not.toHaveBeenCalled();
    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(targetHub);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(syncExecute.mock.invocationCallOrder[0]);
  });
});
