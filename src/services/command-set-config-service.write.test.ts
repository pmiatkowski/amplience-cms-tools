import fs from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  addCommandSetToConfig,
  removeCommandSetFromConfig,
  updateCommandSetInConfig,
  writeCommandSetConfig,
} from './command-set-config-service';

vi.mock('fs');

describe('writeCommandSetConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should write config as formatted JSON', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [
        {
          name: 'Test Set',
          commands: [{ command: 'sync-hierarchy' }],
        },
      ],
    };

    writeCommandSetConfig('/path/to/config.json', config);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/path/to/config.json',
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  });

  it('should preserve order of properties', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [],
    };

    writeCommandSetConfig('/path/to/config.json', config);

    const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenContent);

    expect(Object.keys(parsed)).toEqual(['version', 'commandSets']);
  });
});

describe('addCommandSetToConfig', () => {
  it('should add command set to config', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Existing Set', commands: [] }],
    };

    const newSet: Amplience.CommandSet = {
      name: 'New Set',
      description: 'Description',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const result = addCommandSetToConfig(config, newSet);

    expect(result.commandSets).toHaveLength(2);
    expect(result.commandSets[1]).toEqual(newSet);
  });

  it('should not mutate original config', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [],
    };

    const newSet: Amplience.CommandSet = {
      name: 'New Set',
      commands: [],
    };

    const result = addCommandSetToConfig(config, newSet);

    expect(config.commandSets).toHaveLength(0);
    expect(result.commandSets).toHaveLength(1);
  });

  it('should add to empty commandSets array', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [],
    };

    const newSet: Amplience.CommandSet = {
      name: 'First Set',
      commands: [],
    };

    const result = addCommandSetToConfig(config, newSet);

    expect(result.commandSets).toHaveLength(1);
    expect(result.commandSets[0].name).toBe('First Set');
  });
});

describe('removeCommandSetFromConfig', () => {
  it('should remove command set by name', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [
        { name: 'Set A', commands: [] },
        { name: 'Set B', commands: [] },
        { name: 'Set C', commands: [] },
      ],
    };

    const result = removeCommandSetFromConfig(config, 'Set B');

    expect(result.commandSets).toHaveLength(2);
    expect(result.commandSets.map(s => s.name)).toEqual(['Set A', 'Set C']);
  });

  it('should not mutate original config', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Set A', commands: [] }],
    };

    const result = removeCommandSetFromConfig(config, 'Set A');

    expect(config.commandSets).toHaveLength(1);
    expect(result.commandSets).toHaveLength(0);
  });

  it('should return unchanged config if name not found', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Set A', commands: [] }],
    };

    const result = removeCommandSetFromConfig(config, 'Nonexistent');

    expect(result.commandSets).toHaveLength(1);
    expect(result.commandSets[0].name).toBe('Set A');
  });

  it('should be case-sensitive when matching names', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Set A', commands: [] }],
    };

    const result = removeCommandSetFromConfig(config, 'set a');

    // Case-sensitive: 'set a' !== 'Set A'
    expect(result.commandSets).toHaveLength(1);
  });
});

describe('updateCommandSetInConfig', () => {
  it('should update command set by name', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [
        { name: 'Set A', description: 'Old', commands: [] },
        { name: 'Set B', commands: [] },
      ],
    };

    const updatedSet: Amplience.CommandSet = {
      name: 'Set A Updated',
      description: 'New',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const result = updateCommandSetInConfig(config, 'Set A', updatedSet);

    expect(result.commandSets[0].name).toBe('Set A Updated');
    expect(result.commandSets[0].description).toBe('New');
    expect(result.commandSets[0].commands).toHaveLength(1);
    expect(result.commandSets[1].name).toBe('Set B');
  });

  it('should not mutate original config', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Set A', commands: [] }],
    };

    const updatedSet: Amplience.CommandSet = {
      name: 'Updated',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const result = updateCommandSetInConfig(config, 'Set A', updatedSet);

    expect(config.commandSets[0].name).toBe('Set A');
    expect(result.commandSets[0].name).toBe('Updated');
  });

  it('should return unchanged config if name not found', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [{ name: 'Set A', commands: [] }],
    };

    const updatedSet: Amplience.CommandSet = {
      name: 'Updated',
      commands: [],
    };

    const result = updateCommandSetInConfig(config, 'Nonexistent', updatedSet);

    expect(result.commandSets).toHaveLength(1);
    expect(result.commandSets[0].name).toBe('Set A');
  });

  it('should preserve position of updated command set', () => {
    const config: Amplience.CommandSetConfig = {
      version: '1.0',
      commandSets: [
        { name: 'Set A', commands: [] },
        { name: 'Set B', commands: [] },
        { name: 'Set C', commands: [] },
      ],
    };

    const updatedSet: Amplience.CommandSet = {
      name: 'Set B Updated',
      commands: [{ command: 'sync-hierarchy' }],
    };

    const result = updateCommandSetInConfig(config, 'Set B', updatedSet);

    expect(result.commandSets.map(s => s.name)).toEqual(['Set A', 'Set B Updated', 'Set C']);
  });
});
