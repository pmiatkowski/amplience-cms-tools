import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { promptForLocaleStrategy } from './prompt-for-locale-strategy';

vi.mock('inquirer');

describe('promptForLocaleStrategy', () => {
  let mockService: {
    getLocalizationGroupLocales: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getLocalizationGroupLocales: vi.fn(),
    };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('strategy selection', () => {
    it('should return keep strategy when user selects keep', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'keep',
      });

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(result).toEqual({ strategy: 'keep' });
      expect(mockService.getLocalizationGroupLocales).not.toHaveBeenCalled();
    });

    it('should return remove strategy when user selects remove', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        strategy: 'remove',
      });

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(result).toEqual({ strategy: 'remove' });
      expect(mockService.getLocalizationGroupLocales).not.toHaveBeenCalled();
    });

    it('should fetch locales when user selects replace', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'fr-FR' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(['en-GB', 'fr-FR', 'de-DE']);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(mockService.getLocalizationGroupLocales).toHaveBeenCalledWith('repo-123');
      expect(result).toEqual({ strategy: 'replace', targetLocale: 'fr-FR' });
    });
  });

  describe('replace strategy flow', () => {
    it('should prompt user to select locale when multiple locales available', async () => {
      const locales = ['en-GB', 'fr-FR', 'de-DE', 'es-ES'];

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'de-DE' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(locales);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'targetLocale',
          message: 'Select target locale:',
          choices: locales.map(locale => ({ name: locale, value: locale })),
        }),
      ]);
      expect(result).toEqual({ strategy: 'replace', targetLocale: 'de-DE' });
    });

    it('should fallback to keep strategy when no locales available', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'replace' });

      mockService.getLocalizationGroupLocales.mockResolvedValue([]);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No locales found for target repository')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to keep strategy')
      );
      expect(result).toEqual({ strategy: 'keep' });
    });

    it('should fallback to keep strategy when locale fetch fails', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'replace' });

      mockService.getLocalizationGroupLocales.mockRejectedValue(new Error('API Error'));

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(console.error).toHaveBeenCalledWith('Error fetching locales:', expect.any(Error));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to keep strategy')
      );
      expect(result).toEqual({ strategy: 'keep' });
    });

    it('should return selected locale when user makes selection', async () => {
      const locales = ['en-GB', 'fr-FR'];

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'en-GB' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(locales);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(result).toEqual({ strategy: 'replace', targetLocale: 'en-GB' });
    });
  });

  describe('service integration', () => {
    it('should call getLocalizationGroupLocales with correct repository ID', async () => {
      const targetRepoId = 'target-repo-456';

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'fr-FR' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(['fr-FR']);

      await promptForLocaleStrategy(mockService, targetRepoId);

      expect(mockService.getLocalizationGroupLocales).toHaveBeenCalledWith(targetRepoId);
      expect(mockService.getLocalizationGroupLocales).toHaveBeenCalledTimes(1);
    });

    it('should log fetching message before retrieving locales', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'en-GB' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(['en-GB']);

      await promptForLocaleStrategy(mockService, 'repo-123');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Fetching available locales')
      );
    });

    it('should not call service when keep strategy selected', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'keep' });

      await promptForLocaleStrategy(mockService, 'repo-123');

      expect(mockService.getLocalizationGroupLocales).not.toHaveBeenCalled();
    });

    it('should not call service when remove strategy selected', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'remove' });

      await promptForLocaleStrategy(mockService, 'repo-123');

      expect(mockService.getLocalizationGroupLocales).not.toHaveBeenCalled();
    });
  });

  describe('prompt configuration', () => {
    it('should present correct strategy choices', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'keep' });

      await promptForLocaleStrategy(mockService, 'repo-123');

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'strategy',
          message: 'How should locale prefixes be handled in delivery keys?',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'keep' }),
            expect.objectContaining({ value: 'remove' }),
            expect.objectContaining({ value: 'replace' }),
          ]),
        }),
      ]);
    });

    it('should format locale choices correctly', async () => {
      const locales = ['en-GB', 'fr-FR'];

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ strategy: 'replace' })
        .mockResolvedValueOnce({ targetLocale: 'en-GB' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(locales);

      await promptForLocaleStrategy(mockService, 'repo-123');

      const localePromptCall = vi.mocked(inquirer.prompt).mock.calls[1][0];
      expect(localePromptCall).toEqual([
        expect.objectContaining({
          choices: [
            { name: 'en-GB', value: 'en-GB' },
            { name: 'fr-FR', value: 'fr-FR' },
          ],
        }),
      ]);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle service returning undefined gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'replace' });

      mockService.getLocalizationGroupLocales.mockResolvedValue(undefined as unknown as string[]);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(result).toEqual({ strategy: 'keep' });
    });

    it('should handle service throwing non-Error object', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'replace' });

      mockService.getLocalizationGroupLocales.mockRejectedValue('String error');

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(console.error).toHaveBeenCalledWith('Error fetching locales:', 'String error');
      expect(result).toEqual({ strategy: 'keep' });
    });

    it('should handle network timeout gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ strategy: 'replace' });

      const timeoutError = new Error('Network timeout');
      mockService.getLocalizationGroupLocales.mockRejectedValue(timeoutError);

      const result = await promptForLocaleStrategy(mockService, 'repo-123');

      expect(result).toEqual({ strategy: 'keep' });
    });
  });
});
