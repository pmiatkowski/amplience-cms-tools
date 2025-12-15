import inquirer from 'inquirer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { promptForUpdate } from './update-prompt';

// Mock inquirer
vi.mock('inquirer');

describe('update-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('promptForUpdate', () => {
    it('should return true when user confirms update', async () => {
      // Arrange
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';
      vi.mocked(inquirer.prompt).mockResolvedValue({ shouldUpdate: true });

      // Act
      const result = await promptForUpdate(currentVersion, latestVersion);

      // Assert
      expect(result).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'shouldUpdate',
          message: 'Would you like to update now?',
          default: true,
        },
      ]);
    });

    it('should return false when user declines update', async () => {
      // Arrange
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';
      vi.mocked(inquirer.prompt).mockResolvedValue({ shouldUpdate: false });

      // Act
      const result = await promptForUpdate(currentVersion, latestVersion);

      // Assert
      expect(result).toBe(false);
    });

    it('should display current and latest versions', async () => {
      // Arrange
      const currentVersion = '2.3.4';
      const latestVersion = '3.0.0';
      const consoleLogSpy = vi.mocked(console.log);
      vi.mocked(inquirer.prompt).mockResolvedValue({ shouldUpdate: true });

      // Act
      await promptForUpdate(currentVersion, latestVersion);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('new version'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(currentVersion));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(latestVersion));
    });

    it('should use confirm prompt with default true', async () => {
      // Arrange
      const currentVersion = '1.0.0';
      const latestVersion = '1.1.0';
      vi.mocked(inquirer.prompt).mockResolvedValue({ shouldUpdate: true });

      // Act
      await promptForUpdate(currentVersion, latestVersion);

      // Assert
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'confirm',
            default: true,
          }),
        ])
      );
    });
  });
});
