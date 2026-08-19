import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSyncContentTypes } from '~/commands/sync-content-types';
import { runCopyContentTypes } from './copy-content-types';

vi.mock('~/commands/sync-content-types', () => ({
  runSyncContentTypes: vi.fn(),
}));

describe('runCopyContentTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns that the command key is deprecated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await runCopyContentTypes();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    warn.mockRestore();
  });

  it('delegates to Sync Content Types exactly once', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await runCopyContentTypes();

    expect(runSyncContentTypes).toHaveBeenCalledOnce();
  });
});
