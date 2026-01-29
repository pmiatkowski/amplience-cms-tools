import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectParameterMode,
  validateCommandParameters,
  executeCommand,
  aggregateResults,
  executeEmptyCommandSet,
  executeRunAll,
  executeStepByStep,
  executeWithErrorRecovery,
} from './user-command-sets';

describe('User Command Sets Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectParameterMode', () => {
    it('should return "interactive" when no parameters are provided', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
      };

      const result = detectParameterMode(entry);

      expect(result).toBe('interactive');
    });

    it('should return "interactive" when parameters object is empty', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {},
      };

      const result = detectParameterMode(entry);

      expect(result).toBe('interactive');
    });

    it('should return "pre-configured" when parameters are provided', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {
          sourceHub: 'prod',
          targetHub: 'dev',
        },
      };

      const result = detectParameterMode(entry);

      expect(result).toBe('pre-configured');
    });

    it('should return "pre-configured" with single parameter', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'cleanup-folder',
        parameters: {
          dryRun: true,
        },
      };

      const result = detectParameterMode(entry);

      expect(result).toBe('pre-configured');
    });

    it('should return "interactive" when parameters is undefined', () => {
      const entry = {
        command: 'list-folder-tree',
        description: 'List folders',
      } as Amplience.CommandSetEntry;

      const result = detectParameterMode(entry);

      expect(result).toBe('interactive');
    });
  });

  describe('validateCommandParameters', () => {
    it('should return valid for command with no required parameters', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'list-folder-tree',
        parameters: {},
      };

      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(true);
      expect(result.missingParams).toHaveLength(0);
    });

    it('should return valid when all parameters are provided', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {
          sourceHub: 'prod-hub',
          targetHub: 'dev-hub',
          dryRun: false,
        },
      };

      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(true);
      expect(result.missingParams).toHaveLength(0);
    });

    it('should return valid for interactive mode (no parameters)', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
      };

      // Interactive mode doesn't validate parameters - user provides them
      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(true);
    });

    it('should handle boolean false parameters as valid values', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'cleanup-folder',
        parameters: {
          dryRun: false,
          recursive: false,
        },
      };

      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(true);
    });

    it('should handle null parameter values as invalid', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {
          sourceHub: null as unknown as string,
        },
      };

      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(false);
      expect(result.invalidParams).toContain('sourceHub');
    });

    it('should handle empty string parameters', () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {
          sourceHub: '',
        },
      };

      const result = validateCommandParameters(entry);

      expect(result.isValid).toBe(false);
      expect(result.invalidParams).toContain('sourceHub');
    });
  });

  describe('executeCommand', () => {
    it('should return success result for successful command execution', async () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'list-folder-tree',
        description: 'List folder tree',
      };

      // Mock the command executor - will be injected
      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      const result = await executeCommand(entry, mockExecutor);

      expect(result.success).toBe(true);
      expect(result.command).toBe('list-folder-tree');
      expect(result.error).toBeUndefined();
    });

    it('should return failure result when command throws error', async () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: { sourceHub: 'prod' },
      };

      const mockExecutor = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await executeCommand(entry, mockExecutor);

      expect(result.success).toBe(false);
      expect(result.command).toBe('sync-hierarchy');
      expect(result.error).toBe('Connection failed');
    });

    it('should capture execution time', async () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'list-folder-tree',
      };

      const mockExecutor = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));

        return { success: true };
      });

      const result = await executeCommand(entry, mockExecutor);

      expect(result.durationMs).toBeGreaterThanOrEqual(50);
    });

    it('should pass parameters to executor', async () => {
      const entry: Amplience.CommandSetEntry = {
        command: 'sync-hierarchy',
        parameters: {
          sourceHub: 'prod',
          dryRun: true,
        },
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      await executeCommand(entry, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith('sync-hierarchy', {
        sourceHub: 'prod',
        dryRun: true,
      });
    });
  });

  describe('aggregateResults', () => {
    it('should aggregate empty results array', () => {
      const results: Amplience.CommandExecutionResult[] = [];

      const summary = aggregateResults(results);

      expect(summary.total).toBe(0);
      expect(summary.succeeded).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.totalDurationMs).toBe(0);
    });

    it('should aggregate all successful results', () => {
      const results: Amplience.CommandExecutionResult[] = [
        { command: 'list-folder-tree', success: true, durationMs: 100 },
        { command: 'sync-hierarchy', success: true, durationMs: 200 },
        { command: 'copy-content-types', success: true, durationMs: 150 },
      ];

      const summary = aggregateResults(results);

      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(3);
      expect(summary.failed).toBe(0);
      expect(summary.totalDurationMs).toBe(450);
      expect(summary.results).toHaveLength(3);
    });

    it('should aggregate mixed success/failure results', () => {
      const results: Amplience.CommandExecutionResult[] = [
        { command: 'list-folder-tree', success: true, durationMs: 100 },
        { command: 'sync-hierarchy', success: false, error: 'Failed', durationMs: 50 },
        { command: 'copy-content-types', success: true, durationMs: 150 },
      ];

      const summary = aggregateResults(results);

      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.failedCommands).toContain('sync-hierarchy');
    });

    it('should include all failed commands in failedCommands array', () => {
      const results: Amplience.CommandExecutionResult[] = [
        { command: 'cmd-1', success: false, error: 'Error 1', durationMs: 10 },
        { command: 'cmd-2', success: true, durationMs: 20 },
        { command: 'cmd-3', success: false, error: 'Error 3', durationMs: 30 },
      ];

      const summary = aggregateResults(results);

      expect(summary.failedCommands).toEqual(['cmd-1', 'cmd-3']);
    });

    it('should calculate total duration correctly', () => {
      const results: Amplience.CommandExecutionResult[] = [
        { command: 'cmd-1', success: true, durationMs: 1000 },
        { command: 'cmd-2', success: true, durationMs: 2500 },
        { command: 'cmd-3', success: false, error: 'err', durationMs: 500 },
      ];

      const summary = aggregateResults(results);

      expect(summary.totalDurationMs).toBe(4000);
    });
  });

  describe('executeEmptyCommandSet', () => {
    it('should return appropriate result for empty command set', () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Empty Set',
        description: 'A set with no commands',
        commands: [],
      };

      const result = executeEmptyCommandSet(commandSet);

      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.message).toContain('No commands');
    });

    it('should include command set name in result message', () => {
      const commandSet: Amplience.CommandSet = {
        name: 'My Empty Set',
        commands: [],
      };

      const result = executeEmptyCommandSet(commandSet);

      expect(result.message).toContain('My Empty Set');
    });
  });

  describe('executeRunAll', () => {
    it('should execute all commands sequentially', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      const summary = await executeRunAll(commandSet, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(3);
      expect(summary.failed).toBe(0);
    });

    it('should continue executing commands even when some fail', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });

      const summary = await executeRunAll(commandSet, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(summary.succeeded).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.failedCommands).toContain('cmd-2');
    });

    it('should handle empty command set', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Empty Set',
        commands: [],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      const summary = await executeRunAll(commandSet, mockExecutor);

      expect(mockExecutor).not.toHaveBeenCalled();
      expect(summary.total).toBe(0);
      expect(summary.succeeded).toBe(0);
      expect(summary.failed).toBe(0);
    });

    it('should execute commands in order', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'first' },
          { command: 'second' },
          { command: 'third' },
        ],
      };

      const executionOrder: string[] = [];
      const mockExecutor = vi.fn().mockImplementation(async (cmdName: string) => {
        executionOrder.push(cmdName);

        return { success: true };
      });

      await executeRunAll(commandSet, mockExecutor);

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('should pass parameters to executor for each command', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1', parameters: { hub: 'prod' } },
          { command: 'cmd-2', parameters: { dryRun: true } },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      await executeRunAll(commandSet, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith('cmd-1', { hub: 'prod' });
      expect(mockExecutor).toHaveBeenCalledWith('cmd-2', { dryRun: true });
    });

    it('should aggregate results from all commands', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      const summary = await executeRunAll(commandSet, mockExecutor);

      expect(summary.results).toHaveLength(2);
      expect(summary.results[0].command).toBe('cmd-1');
      expect(summary.results[1].command).toBe('cmd-2');
    });
  });

  describe('executeStepByStep', () => {
    it('should execute commands with pause after each', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForContinue = vi.fn().mockResolvedValue('continue');

      const summary = await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      // Should prompt after each command except the last
      expect(mockPromptForContinue).toHaveBeenCalledTimes(2);
      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(3);
    });

    it('should stop execution when user chooses stop', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForContinue = vi
        .fn()
        .mockResolvedValueOnce('continue')
        .mockResolvedValueOnce('stop');

      const summary = await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      // Should execute cmd-1, prompt (continue), execute cmd-2, prompt (stop), not execute cmd-3
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(summary.total).toBe(2);
    });

    it('should not prompt after the last command', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForContinue = vi.fn().mockResolvedValue('continue');

      await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockPromptForContinue).not.toHaveBeenCalled();
    });

    it('should handle empty command set', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Empty Set',
        commands: [],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForContinue = vi.fn().mockResolvedValue('continue');

      const summary = await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      expect(mockExecutor).not.toHaveBeenCalled();
      expect(mockPromptForContinue).not.toHaveBeenCalled();
      expect(summary.total).toBe(0);
    });

    it('should pass command info to promptForContinue', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForContinue = vi.fn().mockResolvedValue('continue');

      await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      expect(mockPromptForContinue).toHaveBeenCalledWith('cmd-1', 0, 2);
    });

    it('should continue execution after failed command when user continues', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });
      const mockPromptForContinue = vi.fn().mockResolvedValue('continue');

      const summary = await executeStepByStep(commandSet, mockExecutor, mockPromptForContinue);

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(summary.failed).toBe(1);
      expect(summary.succeeded).toBe(1);
    });
  });

  describe('executeWithErrorRecovery', () => {
    it('should execute all commands successfully without prompting for error handling', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('continue');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(mockPromptForError).not.toHaveBeenCalled();
      expect(summary.total).toBe(3);
      expect(summary.succeeded).toBe(3);
    });

    it('should prompt for error handling when command fails', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('continue');

      await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockPromptForError).toHaveBeenCalledWith('cmd-1', 'Connection failed');
    });

    it('should continue to next command when user selects continue', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('continue');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(summary.failed).toBe(1);
      expect(summary.succeeded).toBe(1);
    });

    it('should stop execution when user selects stop', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
          { command: 'cmd-3' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'));
      const mockPromptForError = vi.fn().mockResolvedValue('stop');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      // Should execute cmd-1 (success), cmd-2 (fail), then stop (not execute cmd-3)
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(summary.total).toBe(2);
      expect(summary.succeeded).toBe(1);
      expect(summary.failed).toBe(1);
    });

    it('should retry command when user selects retry', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
          { command: 'cmd-2' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true }) // Retry succeeds
        .mockResolvedValueOnce({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('retry');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      // cmd-1 fails, retry cmd-1 (succeeds), cmd-2 succeeds
      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(summary.total).toBe(2);
      expect(summary.succeeded).toBe(2);
      expect(summary.failed).toBe(0);
    });

    it('should allow multiple retries until success', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
        ],
      };

      const mockExecutor = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValueOnce({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('retry');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(mockPromptForError).toHaveBeenCalledTimes(2);
      expect(summary.total).toBe(1);
      expect(summary.succeeded).toBe(1);
    });

    it('should handle empty command set', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Empty Set',
        commands: [],
      };

      const mockExecutor = vi.fn().mockResolvedValue({ success: true });
      const mockPromptForError = vi.fn().mockResolvedValue('continue');

      const summary = await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockExecutor).not.toHaveBeenCalled();
      expect(mockPromptForError).not.toHaveBeenCalled();
      expect(summary.total).toBe(0);
    });

    it('should include error message in prompt when error occurs', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'sync-hierarchy' },
        ],
      };

      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const mockPromptForError = vi.fn().mockResolvedValue('stop');

      await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockPromptForError).toHaveBeenCalledWith('sync-hierarchy', 'Network timeout');
    });

    it('should handle unknown error when error has no message', async () => {
      const commandSet: Amplience.CommandSet = {
        name: 'Test Set',
        commands: [
          { command: 'cmd-1' },
        ],
      };

      // Mock executor that throws a non-Error value
      const mockExecutor = vi.fn().mockImplementation(async () => {
        throw 'string error'; // Non-Error throw results in 'Unknown error'
      });
      const mockPromptForError = vi.fn().mockResolvedValue('stop');

      await executeWithErrorRecovery(commandSet, mockExecutor, mockPromptForError);

      expect(mockPromptForError).toHaveBeenCalledWith('cmd-1', 'Unknown error');
    });
  });
});
