import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as appConfig from '~/app-config';
import * as prompts from '~/prompts';
import {
  DirectoryAccessError,
  HubAuthenticationError,
  InvalidPatternError,
  DcCliExecutionError,
  exportExtensions,
} from '~/services/actions/export-extensions';
import * as utils from '~/utils';

import { runExportExtensions } from './export-extensions';
import * as exportModePrompt from './prompt-for-export-mode';
import * as outputPrompt from './prompt-for-extension-output-dir';
import * as patternPrompt from './prompt-for-extension-pattern';
import * as previewConfirmPrompt from './prompt-for-preview-confirmation';
import * as previewModePrompt from './prompt-for-preview-mode';
import * as validation from './validate-existing-files';

// Mock dependencies
vi.mock('~/prompts');
vi.mock('~/utils');
vi.mock('~/app-config');
vi.mock('~/services/actions/export-extensions', async () => {
  const actual = await vi.importActual<typeof import('~/services/actions/export-extensions')>(
    '~/services/actions/export-extensions'
  );

  return {
    ...actual,
    exportExtensions: vi.fn(),
  };
});
vi.mock('./prompt-for-extension-output-dir');
vi.mock('./prompt-for-extension-pattern');
vi.mock('./prompt-for-preview-mode');
vi.mock('./prompt-for-preview-confirmation');
vi.mock('./validate-existing-files');
vi.mock('./prompt-for-export-mode');

describe('runExportExtensions', () => {
  const mockHub: Amplience.HubConfig = {
    name: 'Test Hub',
    clientId: 'test-client-id',
    clientSecret: 'test-secret',
    hubId: 'test-hub-id',
  };
  const mockPromptForHub = vi.mocked(prompts.promptForHub);
  const mockPromptForOutputDir = vi.mocked(outputPrompt.promptForExtensionOutputDirectory);
  const mockPromptForPattern = vi.mocked(patternPrompt.promptForExtensionFilterPattern);
  const mockPromptForPreviewMode = vi.mocked(previewModePrompt.promptForPreviewMode);
  const mockPromptForPreviewConfirmation = vi.mocked(
    previewConfirmPrompt.promptForPreviewConfirmation
  );
  const mockPromptForExportMode = vi.mocked(exportModePrompt.promptForExportMode);
  const mockValidateExistingFiles = vi.mocked(validation.validateExistingFiles);
  const mockExportExtensions = vi.mocked(exportExtensions);
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPromptForOutputDir.mockResolvedValue('./exports/extensions');
    mockPromptForPattern.mockResolvedValue('XXXX');
    mockPromptForPreviewMode.mockResolvedValue('execute');
    mockPromptForPreviewConfirmation.mockResolvedValue(true);
    mockPromptForExportMode.mockResolvedValue('full-overwrite');
    mockValidateExistingFiles.mockResolvedValue({ valid: true, fileCount: 0, errors: [] });
    mockExportExtensions.mockResolvedValue({
      mode: 'full-overwrite',
      outputDir: './exports/extensions',
      totalFilesInHub: 0,
      totalFilesDownloaded: 0,
      kept: [],
      removed: [],
      existing: [],
      pattern: /XXXX/i,
      filtered: true,
    });
  });

  describe('dc-cli availability check', () => {
    it('should check if dc-cli is available before proceeding', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(false);
      mockGetHubConfigs.mockReturnValue([mockHub]);

      await runExportExtensions();

      expect(mockCheckDcCliAvailability).toHaveBeenCalled();
    });

    it('should display error message when dc-cli is not available', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      const mockLog = vi.spyOn(console, 'log');
      mockCheckDcCliAvailability.mockResolvedValue(false);
      mockGetHubConfigs.mockReturnValue([mockHub]);

      await runExportExtensions();

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('dc-cli is not installed'));
    });

    it('should not prompt for hub when dc-cli is not available', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(false);
      mockGetHubConfigs.mockReturnValue([mockHub]);

      await runExportExtensions();

      expect(mockPromptForHub).not.toHaveBeenCalled();
      expect(mockPromptForOutputDir).not.toHaveBeenCalled();
      expect(mockPromptForPattern).not.toHaveBeenCalled();
      expect(mockExportExtensions).not.toHaveBeenCalled();
    });
  });

  describe('hub selection', () => {
    it('should check for hub configurations', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      const mockLog = vi.spyOn(console, 'error');
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([]);

      await runExportExtensions();

      expect(mockGetHubConfigs).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No hub configurations found'));
    });

    it('should prompt for hub selection when dc-cli is available', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);

      await runExportExtensions();

      expect(mockPromptForHub).toHaveBeenCalledWith([mockHub]);
    });

    it('should display selected hub name', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      const mockLog = vi.spyOn(console, 'log');
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);

      await runExportExtensions();

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Test Hub'));
    });
  });

  describe('export action integration', () => {
    it('should prompt for output directory and regex pattern before exporting', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);

      await runExportExtensions();

      expect(mockPromptForOutputDir).toHaveBeenCalledTimes(1);
      expect(mockPromptForPattern).toHaveBeenCalledTimes(1);
    });

    it('should call exportExtensions action with selected hub, directory, and pattern', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockPromptForOutputDir.mockResolvedValue('./custom-dir');
      mockPromptForPattern.mockResolvedValue('custom-pattern');

      await runExportExtensions();

      expect(mockExportExtensions).toHaveBeenCalledWith({
        hub: mockHub,
        outputDir: './custom-dir',
        pattern: 'custom-pattern',
        mode: 'full-overwrite',
        onBeforeFiltering: undefined,
      });
    });

    it('should enable preview flow when user selects preview mode', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockPromptForPreviewMode.mockResolvedValue('preview');
      mockExportExtensions.mockImplementation(async params => {
        await params.onBeforeFiltering?.({
          mode: 'full-overwrite',
          outputDir: './exports/extensions',
          totalFilesInHub: 2,
          totalFilesDownloaded: 2,
          kept: [
            {
              fileName: 'match.json',
              filePath: './exports/extensions/match.json',
              id: 'match',
            },
          ],
          removed: [],
          existing: [],
          pattern: /match/,
          filtered: false,
        });

        return {
          mode: 'full-overwrite',
          outputDir: './exports/extensions',
          totalFilesInHub: 2,
          totalFilesDownloaded: 2,
          kept: [],
          removed: [],
          existing: [],
          pattern: /match/,
          filtered: false,
        };
      });

      await runExportExtensions();

      expect(mockPromptForPreviewConfirmation).toHaveBeenCalledWith(1, 0);
      expect(mockExportExtensions).toHaveBeenCalledWith(
        expect.objectContaining({
          hub: mockHub,
          onBeforeFiltering: expect.any(Function),
        })
      );
    });

    it('logs informational message when hub export returns no files', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);

      await runExportExtensions();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No extensions were returned'));
    });

    it('logs informational message when no extensions match pattern', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockResolvedValue({
        mode: 'full-overwrite',
        outputDir: './exports/extensions',
        totalFilesInHub: 3,
        totalFilesDownloaded: 3,
        kept: [],
        removed: [
          {
            fileName: 'one.json',
            filePath: './exports/extensions/one.json',
          },
        ],
        existing: [],
        pattern: /xxx/i,
        filtered: true,
      });

      await runExportExtensions();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No extensions matched'));
    });

    it('shows cancellation message when preview is aborted', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockPromptForPreviewMode.mockResolvedValue('preview');
      mockExportExtensions.mockResolvedValue({
        mode: 'full-overwrite',
        outputDir: './exports/extensions',
        totalFilesInHub: 1,
        totalFilesDownloaded: 1,
        kept: [
          {
            fileName: 'match.json',
            filePath: './exports/extensions/match.json',
            id: 'match',
          },
        ],
        removed: [],
        existing: [],
        pattern: /match/,
        filtered: false,
      });

      await runExportExtensions();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation was cancelled by user')
      );
    });

    it('prints summary lines for a successful run (integration test)', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockResolvedValue({
        mode: 'full-overwrite',
        outputDir: './exports/extensions',
        totalFilesInHub: 2,
        totalFilesDownloaded: 2,
        kept: [
          {
            fileName: 'one.json',
            filePath: './exports/extensions/one.json',
            id: 'one',
          },
        ],
        removed: [
          {
            fileName: 'two.json',
            filePath: './exports/extensions/two.json',
            id: 'two',
          },
        ],
        existing: [],
        pattern: /one/,
        filtered: true,
      });

      await runExportExtensions();

      expect(logSpy).toHaveBeenCalledWith('📊 Export Summary');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total downloaded: 2'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Kept (1): one'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Removed: 1'));
    });
  });

  describe('error handling', () => {
    it('handles InvalidPatternError without throwing', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockRejectedValue(new InvalidPatternError('['));

      await expect(runExportExtensions()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid regex pattern'));
    });

    it('handles DirectoryAccessError without throwing', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockRejectedValue(
        new DirectoryAccessError('Permission denied', './exports/extensions')
      );

      await expect(runExportExtensions()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
    });

    it('handles HubAuthenticationError with stderr output', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockRejectedValue(
        new HubAuthenticationError('Test Hub', '', '401 Unauthorized')
      );

      await expect(runExportExtensions()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to authenticate'));
      expect(errorSpy).toHaveBeenCalledWith('401 Unauthorized');
    });

    it('handles DcCliExecutionError by printing stdout/stderr', async () => {
      const mockCheckDcCliAvailability = vi.mocked(utils.checkDcCliAvailability);
      const mockGetHubConfigs = vi.mocked(appConfig.getHubConfigs);
      mockCheckDcCliAvailability.mockResolvedValue(true);
      mockGetHubConfigs.mockReturnValue([mockHub]);
      mockPromptForHub.mockResolvedValue(mockHub);
      mockExportExtensions.mockRejectedValue(
        new DcCliExecutionError('dc-cli failed', 'out', 'err')
      );

      await expect(runExportExtensions()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('dc-cli command failed'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('stdout'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('stderr'));
    });
  });
});
