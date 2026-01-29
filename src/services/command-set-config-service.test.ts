import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadCommandSetConfig,
  getCommandSetConfigPath,
  validateCommandSetConfig,
  validateCommandReferences,
  generateExampleConfig,
} from './command-set-config-service';

vi.mock('fs');

describe('Command Set Config Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  describe('validateCommandSetConfig', () => {
    it('should validate a correctly structured command set config', () => {
      const validConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Daily Sync',
            description: 'Sync operations for daily use',
            commands: [
              {
                command: 'sync-hierarchy',
                description: 'Sync content hierarchy',
                parameters: {
                  sourceHub: 'prod',
                  targetHub: 'dev',
                },
              },
            ],
          },
        ],
      };

      const result = validateCommandSetConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config without version', () => {
      const invalidConfig = {
        commandSets: [],
      } as unknown as Amplience.CommandSetConfig;

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: version');
    });

    it('should reject config without commandSets array', () => {
      const invalidConfig = {
        version: '1.0',
      } as unknown as Amplience.CommandSetConfig;

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: commandSets');
    });

    it('should reject config with non-array commandSets', () => {
      const invalidConfig = {
        version: '1.0',
        commandSets: 'not-an-array',
      } as unknown as Amplience.CommandSetConfig;

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('commandSets must be an array');
    });

    it('should reject command set without name', () => {
      const invalidConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: '',
            commands: [],
          },
        ],
      };

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command set at index 0: name is required');
    });

    it('should reject command set without commands array', () => {
      const invalidConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
          },
        ],
      } as unknown as Amplience.CommandSetConfig;

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command set "Test Set": commands must be an array');
    });

    it('should reject command entry without command name', () => {
      const invalidConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            commands: [
              {
                command: '',
              },
            ],
          },
        ],
      };

      const result = validateCommandSetConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Command set "Test Set", command at index 0: command name is required');
    });

    it('should allow command set with empty commands array', () => {
      const validConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Empty Set',
            commands: [],
          },
        ],
      };

      const result = validateCommandSetConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow optional description on command sets', () => {
      const validConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            description: 'Optional description',
            commands: [],
          },
        ],
      };

      const result = validateCommandSetConfig(validConfig);

      expect(result.isValid).toBe(true);
    });

    it('should allow optional parameters on commands', () => {
      const validConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            commands: [
              {
                command: 'sync-hierarchy',
                parameters: {
                  dryRun: true,
                },
              },
            ],
          },
        ],
      };

      const result = validateCommandSetConfig(validConfig);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getCommandSetConfigPath', () => {
    it('should return path from COMMAND_SETS_PATH environment variable when set', () => {
      process.env.COMMAND_SETS_PATH = '/custom/path/command-sets.json';

      const result = getCommandSetConfigPath();

      expect(result).toBe('/custom/path/command-sets.json');
    });

    it('should return default path when COMMAND_SETS_PATH is not set', () => {
      delete process.env.COMMAND_SETS_PATH;

      const result = getCommandSetConfigPath();

      expect(result).toBe(path.join(process.cwd(), 'command-sets.json'));
    });

    it('should trim whitespace from environment variable', () => {
      process.env.COMMAND_SETS_PATH = '  /custom/path/command-sets.json  ';

      const result = getCommandSetConfigPath();

      expect(result).toBe('/custom/path/command-sets.json');
    });

    it('should return default path when COMMAND_SETS_PATH is empty string', () => {
      process.env.COMMAND_SETS_PATH = '';

      const result = getCommandSetConfigPath();

      expect(result).toBe(path.join(process.cwd(), 'command-sets.json'));
    });
  });

  describe('loadCommandSetConfig', () => {
    it('should load and parse valid JSON configuration file', () => {
      const validConfig: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            commands: [
              {
                command: 'sync-hierarchy',
              },
            ],
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validConfig));

      const result = loadCommandSetConfig('/path/to/config.json');

      expect(result).toEqual(validConfig);
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => {
        loadCommandSetConfig('/path/to/missing.json');
      }).toThrow('Command set configuration file not found: /path/to/missing.json');
    });

    it('should throw error when JSON is invalid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json {{{');

      expect(() => {
        loadCommandSetConfig('/path/to/invalid.json');
      }).toThrow('Invalid JSON in command set configuration file');
    });

    it('should throw error when configuration structure is invalid', () => {
      const invalidConfig = {
        commandSets: 'not-an-array',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => {
        loadCommandSetConfig('/path/to/invalid.json');
      }).toThrow(/Invalid command set configuration/);
    });
  });

  describe('validateCommandReferences', () => {
    const validCommands = [
      'manage-extensions',
      'vse-management',
      'sync-hierarchy',
      'bulk-sync-hierarchies',
      'copy-content-type-schemas',
      'sync-content-type-properties',
      'copy-content-types',
      'copy-folder-with-content',
      'recreate-content-items',
      'recreate-folder-structure',
      'cleanup-folder',
      'clean-repo',
      'archive-content-type-schemas',
      'list-folder-tree',
      'update-locale',
    ];

    it('should return valid for known command names', () => {
      const config: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            commands: [
              { command: 'sync-hierarchy' },
              { command: 'copy-content-types' },
            ],
          },
        ],
      };

      const result = validateCommandReferences(config, validCommands);

      expect(result.isValid).toBe(true);
      expect(result.invalidCommands).toHaveLength(0);
    });

    it('should return invalid for unknown command names', () => {
      const config: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Test Set',
            commands: [
              { command: 'sync-hierarchy' },
              { command: 'invalid-command' },
              { command: 'another-invalid' },
            ],
          },
        ],
      };

      const result = validateCommandReferences(config, validCommands);

      expect(result.isValid).toBe(false);
      expect(result.invalidCommands).toContain('invalid-command');
      expect(result.invalidCommands).toContain('another-invalid');
    });

    it('should check commands across multiple command sets', () => {
      const config: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [
          {
            name: 'Set 1',
            commands: [{ command: 'sync-hierarchy' }],
          },
          {
            name: 'Set 2',
            commands: [{ command: 'unknown-command' }],
          },
        ],
      };

      const result = validateCommandReferences(config, validCommands);

      expect(result.isValid).toBe(false);
      expect(result.invalidCommands).toContain('unknown-command');
    });

    it('should return valid for empty command sets', () => {
      const config: Amplience.CommandSetConfig = {
        version: '1.0',
        commandSets: [],
      };

      const result = validateCommandReferences(config, validCommands);

      expect(result.isValid).toBe(true);
      expect(result.invalidCommands).toHaveLength(0);
    });
  });

  describe('generateExampleConfig', () => {
    it('should generate valid example configuration', () => {
      const exampleConfig = generateExampleConfig();

      expect(exampleConfig.version).toBe('1.0');
      expect(exampleConfig.commandSets).toBeInstanceOf(Array);
      expect(exampleConfig.commandSets.length).toBeGreaterThan(0);
    });

    it('should include example command set with name and description', () => {
      const exampleConfig = generateExampleConfig();

      const firstSet = exampleConfig.commandSets[0];
      expect(firstSet.name).toBeDefined();
      expect(firstSet.description).toBeDefined();
      expect(firstSet.commands).toBeInstanceOf(Array);
    });

    it('should include example commands with valid command names', () => {
      const exampleConfig = generateExampleConfig();

      const firstSet = exampleConfig.commandSets[0];
      expect(firstSet.commands.length).toBeGreaterThan(0);
      expect(firstSet.commands[0].command).toBeDefined();
    });

    it('should pass validation', () => {
      const exampleConfig = generateExampleConfig();
      const result = validateCommandSetConfig(exampleConfig);

      expect(result.isValid).toBe(true);
    });
  });
});
