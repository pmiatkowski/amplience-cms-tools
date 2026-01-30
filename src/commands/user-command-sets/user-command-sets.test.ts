import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as userCommandSetsAction from '~/services/actions/user-command-sets';
import * as commandSetConfigService from '~/services/command-set-config-service';
import * as prompts from './prompts';
import { displayManualCreationInstructions, runUserCommandSets } from './user-command-sets';

vi.mock('~/commands/archive-content-type-schemas');
vi.mock('~/commands/bulk-sync-hierarchies');
vi.mock('~/commands/clean-repository');
vi.mock('~/commands/cleanup-folder');
vi.mock('~/commands/copy-content-type-schemas');
vi.mock('~/commands/copy-content-types');
vi.mock('~/commands/copy-folder-with-content');
vi.mock('~/commands/list-folder-tree');
vi.mock('~/commands/manage-extensions');
vi.mock('~/commands/recreate-content-items');
vi.mock('~/commands/recreate-folder-structure');
vi.mock('~/commands/sync-content-type-properties');
vi.mock('~/commands/sync-hierarchy');
vi.mock('~/commands/update-delivery-keys-locale');
vi.mock('~/commands/vse-management');
vi.mock('~/services/actions/user-command-sets');
vi.mock('~/services/command-set-config-service');
vi.mock('./prompts');

describe('runUserCommandSets', () => {
  const mockConfig: Amplience.CommandSetConfig = {
    version: '1.0',
    commandSets: [
      {
        name: 'Daily Sync',
        description: 'Daily sync operations',
        commands: [
          { command: 'sync-hierarchy', description: 'Sync hierarchies' },
          { command: 'copy-content-types' },
        ],
      },
      {
        name: 'Schema Update',
        commands: [{ command: 'copy-content-type-schemas' }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.COMMAND_SETS_PATH;
    vi.mocked(commandSetConfigService.getCommandSetConfigPath).mockReturnValue(
      './command-sets.json'
    );
  });

  it('should load and display available command sets', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('__back__');

    await runUserCommandSets();

    expect(commandSetConfigService.initializeCommandSetConfig).toHaveBeenCalled();
    expect(prompts.promptForCommandSet).toHaveBeenCalledWith(mockConfig.commandSets, {
      includeBackOption: true,
    });
  });

  it('should return early when user selects back option', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('__back__');

    await runUserCommandSets();

    expect(prompts.promptForExecutionMode).not.toHaveBeenCalled();
  });

  it('should prompt for execution mode when command set is selected', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('run-all');
    vi.mocked(userCommandSetsAction.executeRunAll).mockResolvedValue({
      total: 2,
      succeeded: 2,
      failed: 0,
      totalDurationMs: 1000,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(prompts.promptForExecutionMode).toHaveBeenCalled();
  });

  it('should execute in run-all mode when selected', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('run-all');
    vi.mocked(userCommandSetsAction.executeRunAll).mockResolvedValue({
      total: 2,
      succeeded: 2,
      failed: 0,
      totalDurationMs: 1000,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(userCommandSetsAction.executeRunAll).toHaveBeenCalledWith(
      mockConfig.commandSets[0],
      expect.any(Function)
    );
  });

  it('should execute in step-by-step mode when selected', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('step-by-step');
    vi.mocked(userCommandSetsAction.executeStepByStep).mockResolvedValue({
      total: 2,
      succeeded: 2,
      failed: 0,
      totalDurationMs: 1000,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(userCommandSetsAction.executeStepByStep).toHaveBeenCalledWith(
      mockConfig.commandSets[0],
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should execute selected commands in pick-commands run-all mode', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('pick-commands');
    vi.mocked(prompts.promptForCommandSelection).mockResolvedValue([
      mockConfig.commandSets[0].commands[0],
    ]);
    vi.mocked(prompts.promptForSelectedExecutionMode).mockResolvedValue('run-all');
    vi.mocked(userCommandSetsAction.executeRunAll).mockResolvedValue({
      total: 1,
      succeeded: 1,
      failed: 0,
      totalDurationMs: 500,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(userCommandSetsAction.executeRunAll).toHaveBeenCalledWith(
      {
        ...mockConfig.commandSets[0],
        commands: [mockConfig.commandSets[0].commands[0]],
      },
      expect.any(Function)
    );
  });

  it('should execute selected commands in pick-commands step-by-step mode', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('pick-commands');
    vi.mocked(prompts.promptForCommandSelection).mockResolvedValue([
      mockConfig.commandSets[0].commands[1],
    ]);
    vi.mocked(prompts.promptForSelectedExecutionMode).mockResolvedValue('step-by-step');
    vi.mocked(userCommandSetsAction.executeStepByStep).mockResolvedValue({
      total: 1,
      succeeded: 1,
      failed: 0,
      totalDurationMs: 500,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(userCommandSetsAction.executeStepByStep).toHaveBeenCalledWith(
      {
        ...mockConfig.commandSets[0],
        commands: [mockConfig.commandSets[0].commands[1]],
      },
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should display summary after execution', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('run-all');
    vi.mocked(userCommandSetsAction.executeRunAll).mockResolvedValue({
      total: 2,
      succeeded: 1,
      failed: 1,
      totalDurationMs: 1500,
      results: [
        { command: 'sync-hierarchy', success: true, durationMs: 500 },
        { command: 'copy-content-types', success: false, error: 'Network error', durationMs: 1000 },
      ],
      failedCommands: ['copy-content-types'],
    });

    await runUserCommandSets();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2'));
  });

  it('should show notification when new config file is created', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: true,
      config: mockConfig,
    });
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('__back__');

    await runUserCommandSets();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created'));
  });

  it('should handle empty command sets gracefully', async () => {
    const emptyConfig: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [],
    };
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockReturnValue({
      created: false,
      config: emptyConfig,
    });

    await runUserCommandSets();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No command sets'));
    expect(prompts.promptForCommandSet).not.toHaveBeenCalled();
  });

  it('should handle config loading errors gracefully', async () => {
    vi.mocked(commandSetConfigService.initializeCommandSetConfig).mockImplementation(() => {
      throw new Error('Invalid JSON');
    });

    await runUserCommandSets();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
  });

  it('should prompt to create example file when COMMAND_SETS_PATH is set and file is missing', async () => {
    process.env.COMMAND_SETS_PATH = '/custom/command-sets.json';
    vi.mocked(commandSetConfigService.getCommandSetConfigPath).mockReturnValue(
      '/custom/command-sets.json'
    );
    vi.mocked(commandSetConfigService.configFileExists).mockReturnValue(false);
    vi.mocked(prompts.promptForCreateExampleFile).mockResolvedValue(true);
    vi.mocked(commandSetConfigService.generateExampleConfig).mockReturnValue(mockConfig);
    vi.mocked(commandSetConfigService.writeCommandSetConfig).mockReturnValue();
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('__back__');

    await runUserCommandSets();

    expect(prompts.promptForCreateExampleFile).toHaveBeenCalledWith('/custom/command-sets.json');
    expect(commandSetConfigService.generateExampleConfig).toHaveBeenCalled();
    expect(commandSetConfigService.writeCommandSetConfig).toHaveBeenCalledWith(
      '/custom/command-sets.json',
      mockConfig
    );
    expect(commandSetConfigService.initializeCommandSetConfig).not.toHaveBeenCalled();
  });

  it('should continue execution after creating example file when COMMAND_SETS_PATH is missing', async () => {
    process.env.COMMAND_SETS_PATH = '/custom/command-sets.json';
    vi.mocked(commandSetConfigService.getCommandSetConfigPath).mockReturnValue(
      '/custom/command-sets.json'
    );
    vi.mocked(commandSetConfigService.configFileExists).mockReturnValue(false);
    vi.mocked(prompts.promptForCreateExampleFile).mockResolvedValue(true);
    vi.mocked(commandSetConfigService.generateExampleConfig).mockReturnValue(mockConfig);
    vi.mocked(commandSetConfigService.writeCommandSetConfig).mockReturnValue();
    vi.mocked(prompts.promptForCommandSet).mockResolvedValue('Daily Sync');
    vi.mocked(prompts.promptForExecutionMode).mockResolvedValue('run-all');
    vi.mocked(userCommandSetsAction.executeRunAll).mockResolvedValue({
      total: 2,
      succeeded: 2,
      failed: 0,
      totalDurationMs: 1000,
      results: [],
      failedCommands: [],
    });

    await runUserCommandSets();

    expect(commandSetConfigService.initializeCommandSetConfig).not.toHaveBeenCalled();
    expect(prompts.promptForCommandSet).toHaveBeenCalledWith(mockConfig.commandSets, {
      includeBackOption: true,
    });
    expect(userCommandSetsAction.executeRunAll).toHaveBeenCalledWith(
      mockConfig.commandSets[0],
      expect.any(Function)
    );
  });

  it('should show manual instructions and return when user declines example file creation', async () => {
    process.env.COMMAND_SETS_PATH = '/custom/command-sets.json';
    vi.mocked(commandSetConfigService.getCommandSetConfigPath).mockReturnValue(
      '/custom/command-sets.json'
    );
    vi.mocked(commandSetConfigService.configFileExists).mockReturnValue(false);
    vi.mocked(prompts.promptForCreateExampleFile).mockResolvedValue(false);

    await runUserCommandSets();

    expect(prompts.promptForCommandSet).not.toHaveBeenCalled();
    expect(commandSetConfigService.initializeCommandSetConfig).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Command sets file not found')
    );
  });
});

describe('displayManualCreationInstructions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should display helpful manual creation instructions', () => {
    displayManualCreationInstructions('/custom/command-sets.json');

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Command sets file not found')
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/custom/command-sets.json'));
  });
});
