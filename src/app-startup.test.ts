import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHubConfigs } from './app-config';
import { runPatTokenPreflight } from './app-startup';
import { validatePatToken } from './services';

vi.mock('./app-config', () => ({
  getHubConfigs: vi.fn(),
}));

vi.mock('./services', () => ({
  validatePatToken: vi.fn(),
}));

describe('runPatTokenPreflight', () => {
  const originalPatToken = process.env.PAT_TOKEN;
  const patHub: Amplience.HubPATConfig = {
    name: 'Development',
    envKey: 'DEV',
    hubId: 'dev-hub-id',
    patToken: 'shared-pat-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([patHub]);
    vi.mocked(validatePatToken).mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalPatToken === undefined) {
      delete process.env.PAT_TOKEN;
    } else {
      process.env.PAT_TOKEN = originalPatToken;
    }
  });

  it('loads hub configuration and validates when PAT_TOKEN is set', async () => {
    process.env.PAT_TOKEN = 'shared-pat-token';

    await runPatTokenPreflight();

    expect(getHubConfigs).toHaveBeenCalledTimes(1);
    expect(validatePatToken).toHaveBeenCalledWith([patHub]);
  });

  it('skips configuration loading for OAuth-only startup', async () => {
    delete process.env.PAT_TOKEN;

    await runPatTokenPreflight();

    expect(getHubConfigs).not.toHaveBeenCalled();
    expect(validatePatToken).not.toHaveBeenCalled();
  });

  it('propagates validation failures and does not continue silently', async () => {
    process.env.PAT_TOKEN = 'invalid-token';
    vi.mocked(validatePatToken).mockRejectedValue(new Error('PAT_TOKEN is invalid.'));

    await expect(runPatTokenPreflight()).rejects.toThrow('PAT_TOKEN is invalid.');
    expect(validatePatToken).toHaveBeenCalledTimes(1);
  });
});
