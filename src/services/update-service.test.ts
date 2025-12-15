import * as semver from 'semver';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mocks using vi.hoisted to ensure proper hoisting
const { mockExecAsync, mockFetch } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockFetch: vi.fn(),
}));

// Mock dependencies before any imports
vi.mock('child_process');
vi.mock('util', () => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  promisify: () => mockExecAsync,
}));
vi.mock('semver');
vi.mock('~/utils');

// Set global fetch mock
global.fetch = mockFetch as never;

import { getAppVersion } from '~/utils';

import {
  checkForUpdates,
  performUpdate,
  restartApplication,
  type UpdateCheckResult,
} from './update-service';

describe('update-service', () => {
  const mockCurrentVersion = '1.0.0';
  const mockLatestVersion = '1.1.0';
  const mockGitHubApiUrl =
    'https://api.github.com/repos/pmiatkowski/amplience-cms-tools/releases/latest';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(getAppVersion).mockReturnValue(mockCurrentVersion);
    vi.mocked(semver.gt).mockReturnValue(true);

    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkForUpdates', () => {
    it('should return update available when latest version is newer', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: `v${mockLatestVersion}` }),
      });
      vi.mocked(semver.gt).mockReturnValue(true);

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result).toEqual({
        updateAvailable: true,
        currentVersion: mockCurrentVersion,
        latestVersion: mockLatestVersion,
      });
      expect(mockFetch).toHaveBeenCalledWith(mockGitHubApiUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
    });

    it('should return no update when current version is latest', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: `v${mockCurrentVersion}` }),
      });
      vi.mocked(semver.gt).mockReturnValue(false);

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result).toEqual({
        updateAvailable: false,
        currentVersion: mockCurrentVersion,
        latestVersion: mockCurrentVersion,
      });
    });

    it('should handle tag names without v prefix', async () => {
      // Arrange
      const versionWithoutPrefix = '2.0.0';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: versionWithoutPrefix }),
      });
      vi.mocked(semver.gt).mockReturnValue(true);

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result.latestVersion).toBe(versionWithoutPrefix);
    });

    it('should return error when GitHub API request fails', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result).toEqual({
        updateAvailable: false,
        currentVersion: mockCurrentVersion,
        error: expect.stringContaining('Failed to fetch latest version'),
      });
    });

    it('should return error when fetch throws exception', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockFetch.mockRejectedValue(new Error(errorMessage));

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result).toEqual({
        updateAvailable: false,
        currentVersion: mockCurrentVersion,
        error: expect.stringContaining(errorMessage),
      });
    });

    it('should return error when latest version cannot be determined', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: null }),
      });

      // Act
      const result = await checkForUpdates();

      // Assert
      expect(result).toEqual({
        updateAvailable: false,
        currentVersion: mockCurrentVersion,
        error: expect.stringContaining('Failed to fetch latest version'),
      });
    });
  });

  describe('performUpdate', () => {
    it('should successfully perform update', async () => {
      // Arrange
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      // Act
      const result = await performUpdate();

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockExecAsync).toHaveBeenCalledWith('git pull origin main');
      expect(mockExecAsync).toHaveBeenCalledWith('npm install');
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it('should return error when git pull fails', async () => {
      // Arrange
      const errorMessage = 'Git pull failed';
      mockExecAsync.mockRejectedValueOnce(new Error(errorMessage));

      // Act
      const result = await performUpdate();

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Update failed: ${errorMessage}`,
      });
      expect(mockExecAsync).toHaveBeenCalledWith('git pull origin main');
      expect(mockExecAsync).toHaveBeenCalledTimes(1);
    });

    it('should return error when npm install fails', async () => {
      // Arrange
      const errorMessage = 'npm install failed';
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockRejectedValueOnce(new Error(errorMessage));

      // Act
      const result = await performUpdate();

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Update failed: ${errorMessage}`,
      });
      expect(mockExecAsync).toHaveBeenCalledWith('git pull origin main');
      expect(mockExecAsync).toHaveBeenCalledWith('npm install');
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it('should log progress messages during update', async () => {
      // Arrange
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
      const consoleLogSpy = vi.mocked(console.log);

      // Act
      await performUpdate();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Updating application'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Pulling latest changes'));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing dependencies')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Update completed successfully')
      );
    });
  });

  describe('restartApplication', () => {
    it('should exit process with code 0', () => {
      // Arrange
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Act
      restartApplication();

      // Assert
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('UpdateCheckResult type', () => {
    it('should allow valid update check result with update available', () => {
      // Arrange
      const result: UpdateCheckResult = {
        updateAvailable: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      };

      // Assert
      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBeDefined();
    });

    it('should allow valid update check result with error', () => {
      // Arrange
      const result: UpdateCheckResult = {
        updateAvailable: false,
        currentVersion: '1.0.0',
        error: 'Network error',
      };

      // Assert
      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
