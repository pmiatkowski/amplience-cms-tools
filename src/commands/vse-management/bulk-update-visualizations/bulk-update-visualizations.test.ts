import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { bulkUpdateContentTypeVisualizations } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import * as utils from '~/utils';

import { runBulkUpdateVisualizations } from './bulk-update-visualizations';
import {
  promptForContentTypeSelection,
  promptForContentTypeSelectionMethod,
  promptForRegexPattern,
  promptForVisualizationConfigFile,
} from './prompts';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions');
vi.mock('~/services/amplience-service');
vi.mock('~/utils');
vi.mock('./prompts');

describe('runBulkUpdateVisualizations protection', () => {
  const hub = {
    name: 'Production',
    envKey: 'PROD',
    hubId: 'production-hub-id',
    patToken: 'pat-token',
    protected: true,
  } satisfies Amplience.HubConfig;
  const contentType = {
    id: 'content-type-id',
    contentTypeUri: 'https://example.com/content-type',
    status: 'ACTIVE',
    settings: { label: 'Content type' },
  } as Amplience.ContentType;
  const getAllContentTypes = vi.fn().mockResolvedValue([contentType]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getHubConfigs).mockReturnValue([hub]);
    vi.mocked(prompts.promptForHub).mockResolvedValue(hub);
    vi.mocked(prompts.promptForDryRun).mockResolvedValue(false);
    vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
    vi.mocked(prompts.promptForProtectedEnvironment).mockResolvedValue(undefined);
    vi.mocked(AmplienceService).mockImplementation(
      () => ({ getAllContentTypes }) as unknown as AmplienceService
    );
    vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('api');
    vi.mocked(promptForRegexPattern).mockResolvedValue('.*');
    vi.mocked(promptForContentTypeSelection).mockResolvedValue([contentType]);
    vi.mocked(promptForVisualizationConfigFile).mockResolvedValue('./visualizations.json');
    vi.mocked(utils.filterContentTypesByRegex).mockReturnValue([contentType]);
    vi.mocked(utils.parseVisualizationConfig).mockReturnValue({
      visualizations: [{ templatedUri: 'https://{{ORIGIN_REPLACE}}/preview' }],
    } as never);
    vi.mocked(utils.getHubVisualizationUrl).mockReturnValue('https://visualizations.example.com');
    vi.mocked(utils.replaceOriginPlaceholder).mockReturnValue('https://example.com/preview');
    vi.mocked(utils.generateBulkVisualizationsReport).mockReturnValue('report');
    vi.mocked(utils.saveBulkVisualizationsReport).mockResolvedValue('reports/report.md');
    vi.mocked(bulkUpdateContentTypeVisualizations).mockResolvedValue({
      totalAttempted: 1,
      succeeded: 1,
      failed: 0,
      errors: [],
    });
  });

  it('should challenge the protected hub before live updates', async () => {
    await runBulkUpdateVisualizations();

    expect(prompts.promptForProtectedEnvironment).toHaveBeenCalledWith(hub);
    expect(
      vi.mocked(prompts.promptForProtectedEnvironment).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(bulkUpdateContentTypeVisualizations).mock.invocationCallOrder[0]);
  });

  it('should not challenge the protected hub during a dry run', async () => {
    vi.mocked(prompts.promptForDryRun).mockResolvedValue(true);

    await runBulkUpdateVisualizations();

    expect(prompts.promptForProtectedEnvironment).not.toHaveBeenCalled();
    expect(bulkUpdateContentTypeVisualizations).toHaveBeenCalledWith(
      expect.objectContaining({ isDryRun: true })
    );
  });
});
