import { exec } from 'child_process';
import * as fsSync from 'fs';
import * as fsPromises from 'fs/promises';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getHubConfigs } from '~/app-config';
import * as prompts from '~/prompts';
import { copyContentTypeSchemas } from './copy-content-type-schemas';

// Mock dependencies
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  rm: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('~/app-config', () => ({
  getHubConfigs: vi.fn(),
}));

vi.mock('~/prompts', () => ({
  promptForHub: vi.fn(),
  promptForConfirmation: vi.fn(),
  promptForSchemaIdFilter: vi.fn(),
  promptForIncludeArchived: vi.fn(),
  promptForSchemasToSync: vi.fn(),
  promptForDryRun: vi.fn(),
  promptForValidateSchemas: vi.fn(),
  promptForCommand: vi.fn(),
}));

describe('copyContentTypeSchemas', () => {
  const mockSourceHub = {
    name: 'Source Hub',
    envKey: 'SOURCE_HUB',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    hubId: 'source-hub-id',
  };

  const mockTargetHub = {
    name: 'Target Hub',
    envKey: 'TARGET_HUB',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    hubId: 'target-hub-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (getHubConfigs as Mock).mockReturnValue([mockSourceHub, mockTargetHub]);
    (prompts.promptForHub as Mock)
      .mockResolvedValueOnce(mockSourceHub) // Source
      .mockResolvedValueOnce(mockTargetHub); // Target

    (prompts.promptForSchemaIdFilter as Mock).mockResolvedValue('');
    (prompts.promptForIncludeArchived as Mock).mockResolvedValue(false);
    (prompts.promptForValidateSchemas as Mock).mockResolvedValue(false);
    (prompts.promptForDryRun as Mock).mockResolvedValue(false);
    (prompts.promptForSchemasToSync as Mock).mockImplementation(files => Promise.resolve(files));
    (prompts.promptForConfirmation as Mock).mockResolvedValue(true); // Confirm action

    // Mock exec to succeed by default
    (exec as unknown as Mock).mockImplementation((_cmd, cb) => {
      cb(null, { stdout: 'success', stderr: '' });
    });

    // Mock fs
    (fsPromises.mkdir as Mock).mockResolvedValue(undefined);
    (fsPromises.rm as Mock).mockResolvedValue(undefined);
    (fsPromises.readdir as Mock).mockResolvedValue(['schema1.json', 'schema2.json']);

    // Default schema content
    const defaultSchema = {
      schemaId: 'https://schema.com/test',
      body: './schemas/test.json',
      validationLevel: 'CONTENT_TYPE',
    };

    const defaultSchemaBody = {
      $id: 'https://schema.com/test',
      title: 'Test Schema',
      type: 'object',
      properties: {},
    };

    const readFileMock = (path: string): string => {
      if (path.includes('schemas/') || path.includes('s1.json') || path.includes('s2.json')) {
        return JSON.stringify(defaultSchemaBody);
      }

      return JSON.stringify(defaultSchema);
    };

    (fsPromises.readFile as Mock).mockImplementation(async path => readFileMock(path));
    (fsSync.readFileSync as Mock).mockImplementation(path => readFileMock(path as string));
    (fsSync.existsSync as Mock).mockReturnValue(true);
  });

  it('should check dc-cli availability', async () => {
    await copyContentTypeSchemas();
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--version'), expect.anything());
  });

  it('should perform bulk import successfully', async () => {
    const result = await copyContentTypeSchemas();

    // Verify export
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('content-type-schema export'),
      expect.anything()
    );

    // Verify import (bulk)
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('content-type-schema import'),
      expect.anything()
    );

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(2); // Based on readdir mock returning 2 files
  });

  it('should handle dry run mode', async () => {
    (prompts.promptForDryRun as Mock).mockResolvedValue(true);

    const result = await copyContentTypeSchemas();

    // Should export
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('content-type-schema export'),
      expect.anything()
    );

    // Should NOT import
    expect(exec).not.toHaveBeenCalledWith(
      expect.stringContaining('content-type-schema import'),
      expect.anything()
    );

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(2);
  });

  it('should filter schemas by regex', async () => {
    (prompts.promptForSchemaIdFilter as Mock).mockResolvedValue('schema1');

    // Mock readdir to return specific files
    (fsPromises.readdir as Mock).mockResolvedValue(['schema1.json', 'schema2.json']);

    // Mock readFile to return different schema IDs
    (fsPromises.readFile as Mock).mockImplementation(async (path: string) => {
      if (path.includes('schema1')) {
        return JSON.stringify({ schemaId: 'https://schema.com/schema1', body: 's1.json' });
      }

      return JSON.stringify({ schemaId: 'https://schema.com/schema2', body: 's2.json' });
    });

    // Mock readFileSync for synchronous calls (used in filtering logic sometimes or dry run)
    // The filtering logic uses fs.readFile (async), but let's be safe
    (fsSync.readFileSync as Mock).mockImplementation((path: string) => {
      if (path.includes('schema1')) {
        return JSON.stringify({ schemaId: 'https://schema.com/schema1', body: 's1.json' });
      }

      return JSON.stringify({ schemaId: 'https://schema.com/schema2', body: 's2.json' });
    });

    const result = await copyContentTypeSchemas();

    // Should unlink schema2 (the one that doesn't match 'schema1')
    expect(fsPromises.unlink).toHaveBeenCalled();

    // We expect 1 schema to be processed
    expect(result.totalCount).toBe(1);
  });

  it('should handle bulk import failure', async () => {
    // Mock import to fail
    (exec as unknown as Mock).mockImplementation((cmd, cb) => {
      if (typeof cmd === 'string' && cmd.includes('import')) {
        cb(new Error('Import failed'), { stdout: '', stderr: 'Error output' });
      } else {
        cb(null, { stdout: 'success', stderr: '' });
      }
    });

    const result = await copyContentTypeSchemas();

    expect(result.success).toBe(false);
    expect(result.failedSchemas[0].error).toContain('Import failed');
  });

  it('should cleanup temp directory', async () => {
    await copyContentTypeSchemas();

    // Verify cleanup
    expect(fsPromises.rm).toHaveBeenCalledWith(
      expect.stringMatching(/temp[\\/]export/),
      expect.objectContaining({ recursive: true, force: true })
    );
  });

  it('should use context if provided', async () => {
    const context = {
      sourceHub: mockSourceHub,
      targetHub: mockTargetHub,
      specificSchemas: ['https://schema.com/test'],
      skipConfirmations: true,
    };

    // Mock readFile to match specific schema
    (fsSync.readFileSync as Mock).mockReturnValue(
      JSON.stringify({
        schemaId: 'https://schema.com/test',
        body: './schemas/test.json',
      })
    );

    const result = await copyContentTypeSchemas({ context });

    // Should not prompt for hubs
    expect(prompts.promptForHub).not.toHaveBeenCalled();

    // Should filter for specific schema
    expect(result.totalCount).toBe(2); // Our mock readdir returns 2, filtering logic depends on file content
  });
});
