import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '~/services/amplience-service';
import { createPhaseProgressBar } from '~/utils';
import { analyzeHierarchyStructure } from './content-operations';

vi.mock('~/utils', async importOriginal => ({
  ...(await importOriginal<typeof import('~/utils')>()),
  createPhaseProgressBar: vi.fn(),
}));

describe('analyzeHierarchyStructure', () => {
  const loadingProgress = {
    stop: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(createPhaseProgressBar).mockReturnValue(loadingProgress);
  });

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

  it('renders repository loading updates through a progress bar', async () => {
    const rootItem = {
      id: 'root-item',
      label: 'Root item',
      body: {},
      hierarchy: { root: true },
    } as unknown as Amplience.ContentItemWithDetails;
    const service = {
      getContentItemWithDetails: vi.fn().mockResolvedValue(rootItem),
      getAllContentItems: vi
        .fn()
        .mockImplementation(
          async (_repositoryId: string, onProgress: (fetched: number, total: number) => void) => {
            onProgress(100, 285);
            onProgress(285, 285);

            return [rootItem];
          }
        ),
    } as unknown as AmplienceService;

    await analyzeHierarchyStructure(service, 'source-repo', [rootItem]);

    expect(createPhaseProgressBar).toHaveBeenCalledOnce();
    expect(loadingProgress.update).toHaveBeenNthCalledWith(1, 'Loading items', 100, 285);
    expect(loadingProgress.update).toHaveBeenNthCalledWith(2, 'Loading items', 285, 285);
    expect(loadingProgress.stop).toHaveBeenCalledOnce();
    expect(console.log).not.toHaveBeenCalledWith('    📊 Loading items: 100/285 processed');
  });

  it('stops repository loading progress when fetching items fails', async () => {
    const error = new Error('Repository unavailable');
    const rootItem = {
      id: 'root-item',
      label: 'Root item',
      body: {},
      hierarchy: { root: true },
    } as unknown as Amplience.ContentItemWithDetails;
    const service = {
      getContentItemWithDetails: vi.fn().mockResolvedValue(rootItem),
      getAllContentItems: vi.fn().mockRejectedValue(error),
    } as unknown as AmplienceService;

    await expect(analyzeHierarchyStructure(service, 'source-repo', [rootItem])).rejects.toThrow(
      error
    );

    expect(loadingProgress.stop).toHaveBeenCalledOnce();
  });
});
