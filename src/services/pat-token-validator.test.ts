import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceApiError } from './amplience-api-error';
import { AmplienceService } from './amplience-service';
import { validatePatToken } from './pat-token-validator';

const { mockValidateAuthentication } = vi.hoisted(() => ({
  mockValidateAuthentication: vi.fn(),
}));

vi.mock('./amplience-service', () => ({
  AmplienceService: vi.fn(() => ({
    validateAuthentication: mockValidateAuthentication,
  })),
}));

describe('validatePatToken', () => {
  const firstPatHub: Amplience.HubPATConfig = {
    name: 'Development',
    envKey: 'DEV',
    hubId: 'dev-hub-id',
    patToken: 'shared-pat-token',
  };
  const secondPatHub: Amplience.HubPATConfig = {
    name: 'Production',
    envKey: 'PROD',
    hubId: 'prod-hub-id',
    patToken: 'shared-pat-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAuthentication.mockResolvedValue(undefined);
  });

  it('validates the shared PAT once using the first configured PAT hub', async () => {
    await validatePatToken([firstPatHub, secondPatHub]);

    expect(AmplienceService).toHaveBeenCalledTimes(1);
    expect(AmplienceService).toHaveBeenCalledWith(firstPatHub);
    expect(mockValidateAuthentication).toHaveBeenCalledTimes(1);
  });

  it('does nothing for OAuth-only hub configurations', async () => {
    const oauthHub: Amplience.HubOAuthConfig = {
      name: 'Development',
      envKey: 'DEV',
      hubId: 'dev-hub-id',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    };

    await validatePatToken([oauthHub]);

    expect(AmplienceService).not.toHaveBeenCalled();
    expect(mockValidateAuthentication).not.toHaveBeenCalled();
  });

  it('identifies an invalid PAT on a 401 response', async () => {
    mockValidateAuthentication.mockRejectedValue(
      new AmplienceApiError(401, 'Unauthorized', 'Invalid credentials')
    );

    await expect(validatePatToken([firstPatHub])).rejects.toThrow(
      'PAT_TOKEN is invalid. Update PAT_TOKEN in your .env file before running a command.'
    );
  });

  it('identifies missing hub access on a 403 response', async () => {
    mockValidateAuthentication.mockRejectedValue(
      new AmplienceApiError(403, 'Forbidden', 'Access denied')
    );

    await expect(validatePatToken([firstPatHub])).rejects.toThrow(
      'PAT_TOKEN does not have access to hub "Development". Check the token permissions before running a command.'
    );
  });

  it('blocks startup when PAT validation cannot be completed', async () => {
    mockValidateAuthentication.mockRejectedValue(new Error('Network unavailable'));

    await expect(validatePatToken([firstPatHub])).rejects.toThrow(
      'Could not validate PAT_TOKEN using hub "Development": Network unavailable'
    );
  });
});
