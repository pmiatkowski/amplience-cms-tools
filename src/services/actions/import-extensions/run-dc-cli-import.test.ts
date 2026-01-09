import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HubAuthenticationError, DcCliExecutionError } from '../import-extensions';
import { runDcCliImport } from './run-dc-cli-import';

const { builderMock, createDcCliCommandMock, createProgressBarMock } = vi.hoisted(() => {
  const builder = {
    withHub: vi.fn().mockReturnThis(),
    withCommand: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  const progressBarMock = {
    increment: vi.fn(),
    stop: vi.fn(),
  };

  return {
    builderMock: builder,
    createDcCliCommandMock: vi.fn(() => builder),
    createProgressBarMock: vi.fn(() => progressBarMock),
  };
});

vi.mock('~/utils', () => ({
  createDcCliCommand: createDcCliCommandMock,
  createProgressBar: createProgressBarMock,
}));

describe('runDcCliImport', () => {
  const mockHub: Amplience.HubConfig = {
    name: 'Test Hub',
    clientId: 'test-client-id',
    clientSecret: 'test-secret',
    hubId: 'test-hub-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    builderMock.execute.mockResolvedValue({ stdout: '', stderr: '' });
  });

  it('executes dc-cli extension import command with correct parameters', async () => {
    const importDir = './temp_import_123/extensions';

    await runDcCliImport(mockHub, importDir);

    expect(createDcCliCommandMock).toHaveBeenCalledTimes(1);
    expect(builderMock.withHub).toHaveBeenCalledWith(mockHub);
    expect(builderMock.withCommand).toHaveBeenCalledWith(`extension import "${importDir}"`);
    expect(builderMock.execute).toHaveBeenCalledTimes(1);
  });

  it('creates and stops progress bar during execution', async () => {
    const importDir = './temp_import_456/extensions';

    await runDcCliImport(mockHub, importDir);

    expect(createProgressBarMock).toHaveBeenCalledWith(1, 'Importing extensions');
    const progressBar = createProgressBarMock.mock.results[0].value;
    expect(progressBar.increment).toHaveBeenCalledTimes(1);
    expect(progressBar.stop).toHaveBeenCalledTimes(1);
  });

  it('stops progress bar even when execution fails', async () => {
    builderMock.execute.mockRejectedValue(new Error('Command failed'));

    await expect(runDcCliImport(mockHub, './import')).rejects.toThrow();

    const progressBar = createProgressBarMock.mock.results[0].value;
    expect(progressBar.stop).toHaveBeenCalledTimes(1);
  });

  it('throws HubAuthenticationError when dc-cli reports 401 Unauthorized', async () => {
    builderMock.execute.mockRejectedValue(
      Object.assign(new Error('401'), { stderr: '401 Unauthorized', stdout: '' })
    );

    await expect(runDcCliImport(mockHub, './import')).rejects.toThrow(HubAuthenticationError);
    await expect(runDcCliImport(mockHub, './import')).rejects.toMatchObject({
      message: expect.stringContaining('Test Hub'),
      stdout: '',
      stderr: '401 Unauthorized',
    });
  });

  it('throws HubAuthenticationError when stdout contains authentication error', async () => {
    builderMock.execute.mockRejectedValue(
      Object.assign(new Error('Auth failed'), { stdout: 'Error: unauthorized access', stderr: '' })
    );

    await expect(runDcCliImport(mockHub, './import')).rejects.toThrow(HubAuthenticationError);
  });

  it('throws DcCliExecutionError when dc-cli fails for non-auth reasons', async () => {
    builderMock.execute.mockRejectedValue(
      Object.assign(new Error('Command failed'), { stdout: 'output', stderr: 'generic error' })
    );

    await expect(runDcCliImport(mockHub, './import')).rejects.toThrow(DcCliExecutionError);
    await expect(runDcCliImport(mockHub, './import')).rejects.toMatchObject({
      message: 'dc-cli command failed.',
      stdout: 'output',
      stderr: 'generic error',
    });
  });

  it('handles missing stdout/stderr gracefully', async () => {
    builderMock.execute.mockRejectedValue(new Error('Unknown error'));

    await expect(runDcCliImport(mockHub, './import')).rejects.toThrow(DcCliExecutionError);
    await expect(runDcCliImport(mockHub, './import')).rejects.toMatchObject({
      stdout: '',
      stderr: '',
    });
  });
});
