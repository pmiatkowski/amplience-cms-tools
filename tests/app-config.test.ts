import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock process.env before importing the module
const originalEnv = process.env;

describe('app-config', () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    process.env = {} as NodeJS.ProcessEnv;
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getHubConfigs', () => {
    it('should discover and return hub configurations with new pattern', async () => {
      // Setup environment variables for two hubs
      process.env.AMP_HUB_DEV_CLIENT_ID = 'dev-client-id';
      process.env.AMP_HUB_DEV_CLIENT_SECRET = 'dev-client-secret';
      process.env.AMP_HUB_DEV_HUB_ID = 'dev-hub-id';
      process.env.AMP_HUB_DEV_HUB_NAME = 'Development';

      process.env.AMP_HUB_PROD_CLIENT_ID = 'prod-client-id';
      process.env.AMP_HUB_PROD_CLIENT_SECRET = 'prod-client-secret';
      process.env.AMP_HUB_PROD_HUB_ID = 'prod-hub-id';
      process.env.AMP_HUB_PROD_HUB_NAME = 'Production';

      const { getHubConfigs } = await import('../src/app-config');
      const configs = getHubConfigs();

      expect(configs).toHaveLength(2);
      expect(configs).toEqual(
        expect.arrayContaining([
          {
            name: 'Development',
            clientId: 'dev-client-id',
            clientSecret: 'dev-client-secret',
            hubId: 'dev-hub-id',
          },
          {
            name: 'Production',
            clientId: 'prod-client-id',
            clientSecret: 'prod-client-secret',
            hubId: 'prod-hub-id',
          },
        ])
      );
    });

    it('should return empty array and warn for incomplete hub configurations', async () => {
      // Setup incomplete configuration (missing CLIENT_SECRET)
      process.env.AMP_HUB_DEV_CLIENT_ID = 'dev-client-id';
      process.env.AMP_HUB_DEV_HUB_ID = 'dev-hub-id';
      process.env.AMP_HUB_DEV_HUB_NAME = 'Development';
      // AMP_HUB_DEV_CLIENT_SECRET is missing

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getHubConfigs } = await import('../src/app-config');

      expect(() => getHubConfigs()).toThrow(
        'No complete hub configurations found. Please ensure you have configured at least one hub'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incomplete configuration for hub "DEV"')
      );

      consoleSpy.mockRestore();
    });

    it('should handle hub with underscores in name', async () => {
      // Setup hub with underscores in name
      process.env.AMP_HUB_DEV_STAGING_CLIENT_ID = 'staging-client-id';
      process.env.AMP_HUB_DEV_STAGING_CLIENT_SECRET = 'staging-client-secret';
      process.env.AMP_HUB_DEV_STAGING_HUB_ID = 'staging-hub-id';
      process.env.AMP_HUB_DEV_STAGING_HUB_NAME = 'Dev Staging';

      const { getHubConfigs } = await import('../src/app-config');
      const configs = getHubConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual({
        name: 'Dev Staging',
        clientId: 'staging-client-id',
        clientSecret: 'staging-client-secret',
        hubId: 'staging-hub-id',
      });
    });

    it('should throw error when no hubs are configured', async () => {
      // No hub environment variables set
      process.env.SOME_OTHER_VAR = 'value';

      const { getHubConfigs } = await import('../src/app-config');

      expect(() => getHubConfigs()).toThrow(
        'No complete hub configurations found. Please ensure you have configured at least one hub'
      );
    });

    it('should ignore partially matching environment variables', async () => {
      // Setup variables that partially match but should be ignored
      process.env.AMP_HUB_DEV_CLIENT = 'not-client-id'; // Missing _ID suffix
      process.env.AMP_OTHER_DEV_CLIENT_ID = 'other-client-id'; // Wrong prefix
      process.env.HUB_DEV_CLIENT_ID = 'hub-client-id'; // Missing AMP_ prefix

      // Setup one complete configuration
      process.env.AMP_HUB_PROD_CLIENT_ID = 'prod-client-id';
      process.env.AMP_HUB_PROD_CLIENT_SECRET = 'prod-client-secret';
      process.env.AMP_HUB_PROD_HUB_ID = 'prod-hub-id';
      process.env.AMP_HUB_PROD_HUB_NAME = 'Production';

      const { getHubConfigs } = await import('../src/app-config');
      const configs = getHubConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0].name).toBe('Production');
    });

    it('should handle mixed complete and incomplete configurations', async () => {
      // Complete configuration
      process.env.AMP_HUB_PROD_CLIENT_ID = 'prod-client-id';
      process.env.AMP_HUB_PROD_CLIENT_SECRET = 'prod-client-secret';
      process.env.AMP_HUB_PROD_HUB_ID = 'prod-hub-id';
      process.env.AMP_HUB_PROD_HUB_NAME = 'Production';

      // Incomplete configuration (missing HUB_NAME)
      process.env.AMP_HUB_DEV_CLIENT_ID = 'dev-client-id';
      process.env.AMP_HUB_DEV_CLIENT_SECRET = 'dev-client-secret';
      process.env.AMP_HUB_DEV_HUB_ID = 'dev-hub-id';
      // AMP_HUB_DEV_HUB_NAME is missing

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getHubConfigs } = await import('../src/app-config');
      const configs = getHubConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0].name).toBe('Production');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incomplete configuration for hub "DEV"')
      );

      consoleSpy.mockRestore();
    });

    it('should handle numeric hub names', async () => {
      // Setup hub with numeric name
      process.env.AMP_HUB_ENV1_CLIENT_ID = 'env1-client-id';
      process.env.AMP_HUB_ENV1_CLIENT_SECRET = 'env1-client-secret';
      process.env.AMP_HUB_ENV1_HUB_ID = 'env1-hub-id';
      process.env.AMP_HUB_ENV1_HUB_NAME = 'Environment 1';

      const { getHubConfigs } = await import('../src/app-config');
      const configs = getHubConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual({
        name: 'Environment 1',
        clientId: 'env1-client-id',
        clientSecret: 'env1-client-secret',
        hubId: 'env1-hub-id',
      });
    });
  });
});
