import { describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '~/services/amplience-service';
import { analyzeHierarchyStructure } from './content-operations';

describe('analyzeHierarchyStructure', () => {
  it('rejects when any selected item details cannot be loaded', async () => {
    const service = {
      getContentItemWithDetails: vi
        .fn()
        .mockResolvedValueOnce({ id: 'item-1', label: 'Item 1', body: {} })
        .mockResolvedValueOnce(null),
    } as unknown as AmplienceService;
    const selectedItems = [
      { id: 'item-1', label: 'Item 1' },
      { id: 'item-2', label: 'Item 2' },
    ] as Amplience.ContentItem[];

    await expect(analyzeHierarchyStructure(service, 'source-repo', selectedItems)).rejects.toThrow(
      'Failed to load selected content item details: item-2'
    );
  });
});
