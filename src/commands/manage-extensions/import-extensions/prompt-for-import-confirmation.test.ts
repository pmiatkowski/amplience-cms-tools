import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExtensionWithPath } from '~/services/actions/import-extensions/filter-extensions';

import { promptForImportConfirmation } from './prompt-for-import-confirmation';

vi.mock('inquirer');

describe('promptForImportConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createExtension = (id: string): ExtensionWithPath => ({
    extension: {
      name: id,
      url: `https://example.com/${id}.html`,
      description: `Description for ${id}`,
    },
    filePath: `/path/to/${id}.json`,
  });

  describe('confirmation prompt', () => {
    it('should prompt for confirmation with yes/no choice', async () => {
      const extensions = [createExtension('test-extension')];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      await promptForImportConfirmation(extensions);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'confirmed',
          message: expect.stringContaining('proceed'),
          default: false,
        }),
      ]);
    });

    it('should return true when user confirms', async () => {
      const extensions = [createExtension('test-extension')];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      const result = await promptForImportConfirmation(extensions);

      expect(result).toBe(true);
    });

    it('should return false when user cancels', async () => {
      const extensions = [createExtension('test-extension')];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

      const result = await promptForImportConfirmation(extensions);

      expect(result).toBe(false);
    });

    it('should default to false for safety', async () => {
      const extensions = [createExtension('test-extension')];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

      await promptForImportConfirmation(extensions);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: false,
        }),
      ]);
    });
  });

  describe('with different extension counts', () => {
    it('should handle single extension', async () => {
      const extensions = [createExtension('single')];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      const result = await promptForImportConfirmation(extensions);

      expect(result).toBe(true);
    });

    it('should handle multiple extensions', async () => {
      const extensions = [
        createExtension('ext1'),
        createExtension('ext2'),
        createExtension('ext3'),
      ];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      const result = await promptForImportConfirmation(extensions);

      expect(result).toBe(true);
    });

    it('should handle empty extension list', async () => {
      const extensions: ExtensionWithPath[] = [];
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

      const result = await promptForImportConfirmation(extensions);

      expect(result).toBe(false);
    });
  });
});
