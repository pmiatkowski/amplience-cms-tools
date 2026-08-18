import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { archiveContentTypeSchemas } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';

import { runArchiveContentTypeSchemas } from './archive-content-type-schemas';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions');
vi.mock('~/services/amplience-service');

describe('runArchiveContentTypeSchemas protection', () => {
  const hub = {
    name: 'Production',
    envKey: 'PROD',
    hubId: 'production-hub-id',
    patToken: 'pat-token',
    protected: true,
  } satisfies Amplience.HubConfig;
  const schema = { schemaId: 'https://example.com/schema' } as Amplience.ContentTypeSchema;
  const getAllSchemas = vi.fn().mockResolvedValue([schema]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([hub]);
    vi.mocked(prompts.promptForHub).mockResolvedValue(hub);
    vi.mocked(prompts.promptForIncludeArchived).mockResolvedValue(false);
    vi.mocked(prompts.promptForSchemaIdFilter).mockResolvedValue('');
    vi.mocked(prompts.promptForDryRun).mockResolvedValue(false);
    vi.mocked(prompts.promptForSchemasToArchive).mockResolvedValue([schema]);
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(AmplienceService).mockImplementation(
      () => ({ getAllSchemas }) as unknown as AmplienceService
    );
    vi.mocked(archiveContentTypeSchemas).mockResolvedValue({} as never);
  });

  it('should challenge the protected hub before live execution', async () => {
    await runArchiveContentTypeSchemas();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(hub);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(archiveContentTypeSchemas).mock.invocationCallOrder[0]);
  });

  it('should not challenge the protected hub during a dry run', async () => {
    vi.mocked(prompts.promptForDryRun).mockResolvedValue(true);

    await runArchiveContentTypeSchemas();

    expect(prompts.promptForProtectedEnvironment).not.toHaveBeenCalled();
    expect(archiveContentTypeSchemas).toHaveBeenCalledWith(
      expect.objectContaining({ isDryRun: true })
    );
  });
});
