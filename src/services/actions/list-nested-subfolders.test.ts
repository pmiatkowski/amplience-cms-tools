import { describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import { listNestedSubfolders } from './list-nested-subfolders';

describe('listNestedSubfolders', () => {
  it('propagates nested folder enumeration failures instead of returning a partial tree', async () => {
    const service = {
      getAllSubFolders: vi.fn().mockRejectedValue(new Error('Folder API unavailable')),
    } as unknown as AmplienceService;

    await expect(listNestedSubfolders(service, 'source-repo', 'source-folder')).rejects.toThrow(
      'Failed to list nested subfolders: Failed to get subfolders for folder source-folder: Folder API unavailable'
    );
  });
});
