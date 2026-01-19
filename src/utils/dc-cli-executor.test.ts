import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DcCliCommandBuilder, createDcCliCommand, getDcCliPath } from './dc-cli-executor';

describe('DC-CLI Executor', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDcCliPath', () => {
    it('should return the correct path to dc-cli', () => {
      const path = getDcCliPath();
      expect(path).toContain('node_modules');
      expect(path).toContain('dc-cli');
    });

    it('should add .cmd extension on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      const path = getDcCliPath();
      expect(path).toMatch(/\.cmd$/);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe('DcCliCommandBuilder', () => {
    describe('withHub', () => {
      it('should set the hub configuration', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
        };

        const builder = new DcCliCommandBuilder().withHub(hub);

        expect(builder).toBeInstanceOf(DcCliCommandBuilder);
      });
    });

    describe('withCommand', () => {
      it('should set the command', () => {
        const builder = new DcCliCommandBuilder().withCommand('content-type-schema export');

        expect(builder).toBeInstanceOf(DcCliCommandBuilder);
      });
    });

    describe('withArgs', () => {
      it('should add arguments', () => {
        const builder = new DcCliCommandBuilder().withArgs('arg1', 'arg2', 'arg3');

        expect(builder).toBeInstanceOf(DcCliCommandBuilder);
      });
    });

    describe('withArg', () => {
      it('should add a single argument', () => {
        const builder = new DcCliCommandBuilder().withArg('arg1').withArg('arg2');

        expect(builder).toBeInstanceOf(DcCliCommandBuilder);
      });
    });

    describe('getCommandString', () => {
      it('should build correct command string with PAT token', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          patToken: 'pat-token-123',
        };

        const commandString = new DcCliCommandBuilder()
          .withHub(hub)
          .withCommand('content-type-schema export')
          .withArgs('tempDir')
          .getCommandString();

        expect(commandString).toContain('content-type-schema export');
        expect(commandString).toContain('--patToken "pat-token-123"');
        expect(commandString).toContain('--hubId "hub-123"');
        expect(commandString).toContain('tempDir');
        expect(commandString).not.toContain('--clientId');
        expect(commandString).not.toContain('--clientSecret');
      });

      it('should build correct command string with OAuth credentials', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
        };

        const commandString = new DcCliCommandBuilder()
          .withHub(hub)
          .withCommand('content-type list')
          .withArgs('--json')
          .getCommandString();

        expect(commandString).toContain('content-type list');
        expect(commandString).toContain('--clientId "client-123"');
        expect(commandString).toContain('--clientSecret "secret-123"');
        expect(commandString).toContain('--hubId "hub-123"');
        expect(commandString).toContain('--json');
        expect(commandString).not.toContain('--patToken');
      });

      it('should throw error if hub is not set', () => {
        expect(() => {
          new DcCliCommandBuilder().withCommand('content-type list').getCommandString();
        }).toThrow('Hub configuration is required');
      });

      it('should handle quoted arguments correctly', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
        };

        const commandString = new DcCliCommandBuilder()
          .withHub(hub)
          .withCommand('content-type-schema import')
          .withArg('"/path/to/dir"')
          .getCommandString();

        expect(commandString).toContain('"/path/to/dir"');
      });

      it('should handle multiple arguments', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          patToken: 'pat-token-123',
        };

        const commandString = new DcCliCommandBuilder()
          .withHub(hub)
          .withCommand('content-type sync')
          .withArgs('id-1', '--json', '--force')
          .getCommandString();

        expect(commandString).toContain('id-1');
        expect(commandString).toContain('--json');
        expect(commandString).toContain('--force');
      });
    });

    describe('Builder chaining', () => {
      it('should support method chaining', () => {
        const hub: Amplience.HubConfig = {
          name: 'Test Hub',
          envKey: 'TEST_HUB',
          hubId: 'hub-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
        };

        const commandString = createDcCliCommand()
          .withHub(hub)
          .withCommand('content-type list')
          .withArg('--json')
          .getCommandString();

        expect(commandString).toContain('content-type list');
        expect(commandString).toContain('--clientId');
      });
    });
  });

  describe('createDcCliCommand', () => {
    it('should create a new DcCliCommandBuilder instance', () => {
      const builder = createDcCliCommand();

      expect(builder).toBeInstanceOf(DcCliCommandBuilder);
    });
  });
});
