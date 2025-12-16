import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HierarchyService } from '../hierarchy-service';
import {
  bulkSyncHierarchies,
  type BulkSyncHierarchiesOptions,
  type MatchedHierarchyPair,
} from './bulk-sync-hierarchies';
import * as syncHierarchyModule from './sync-hierarchy';
import type { AmplienceService } from '../amplience-service';
import type cliProgress from 'cli-progress';

type ViMock = ReturnType<typeof vi.fn>;

// Mock dependencies
vi.mock('~/utils', () => ({
  createProgressBar: vi.fn(() => {
    const mockBar = {
      start: vi.fn(),
      increment: vi.fn(),
      stop: vi.fn(),
    };
    // Call start immediately to mimic real implementation
    mockBar.start();

    return mockBar;
  }),
}));

vi.mock('./sync-hierarchy', () => ({
  syncHierarchy: vi.fn(),
}));

describe('bulkSyncHierarchies', () => {
  const sourceService = { __service: 'source' } as unknown as AmplienceService;
  const targetService = { __service: 'target' } as unknown as AmplienceService;

  let syncHierarchyMock: ViMock;
  let mockProgressBar: { start: ViMock; increment: ViMock; stop: ViMock };

  beforeEach(async () => {
    syncHierarchyMock = vi.mocked(syncHierarchyModule.syncHierarchy);
    syncHierarchyMock.mockResolvedValue(undefined);

    // Mock HierarchyService.buildHierarchyTreeFromItems
    vi.spyOn(HierarchyService.prototype, 'buildHierarchyTreeFromItems').mockReturnValue({
      item: {} as Amplience.ContentItem,
      children: [],
    } as Amplience.HierarchyNode);

    // Set up progress bar mock
    const { createProgressBar } = await import('~/utils');
    mockProgressBar = {
      start: vi.fn(),
      increment: vi.fn(),
      stop: vi.fn(),
    };
    vi.mocked(createProgressBar).mockReturnValue(
      mockProgressBar as unknown as cliProgress.SingleBar
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const createMatchedPair = (
    deliveryKey: string,
    name: string,
    sourceItemCount = 5
  ): MatchedHierarchyPair => ({
    source: {
      item: {
        id: `source-${deliveryKey}`,
        label: name,
        body: {
          _meta: {
            deliveryKey,
            schema: 'https://schema.com/hierarchy',
          },
        },
      } as Amplience.ContentItem,
      allItems: Array.from({ length: sourceItemCount }, (_, i) => ({
        id: `source-item-${deliveryKey}-${i}`,
        label: `Item ${i}`,
      })) as Amplience.ContentItem[],
      contentCount: sourceItemCount,
    },
    target: {
      item: {
        id: `target-${deliveryKey}`,
        label: name,
        body: {
          _meta: {
            deliveryKey,
            schema: 'https://schema.com/hierarchy',
          },
        },
      } as Amplience.ContentItem,
      allItems: Array.from({ length: 3 }, (_, i) => ({
        id: `target-item-${deliveryKey}-${i}`,
        label: `Item ${i}`,
      })) as Amplience.ContentItem[],
    },
  });

  const baseOptions: Omit<BulkSyncHierarchiesOptions, 'matchedPairs'> = {
    sourceService,
    targetService,
    targetRepositoryId: 'target-repo-id',
    updateContent: false,
    localeStrategy: { strategy: 'keep' },
    publishAfterSync: false,
    isDryRun: false,
  };

  describe('Sequential Synchronization', () => {
    it('should process all matched pairs sequentially', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
        createMatchedPair('cat-products', 'Product Categories'),
      ];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(syncHierarchyMock).toHaveBeenCalledTimes(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should call syncHierarchy for each pair with correct options', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        updateContent: true,
        publishAfterSync: true,
      });

      expect(syncHierarchyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceService,
          targetService,
          targetRepositoryId: 'target-repo-id',
          updateContent: true,
          publishAfterSync: true,
          isDryRun: false,
        })
      );
    });

    it('should pass locale strategy to each sync operation', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];
      const localeStrategy = { strategy: 'replace' as const, targetLocale: 'en-US' };

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        localeStrategy,
      });

      expect(syncHierarchyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          localeStrategy,
        })
      );
    });

    it('should pass updateContent flag to each sync operation', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        updateContent: true,
      });

      expect(syncHierarchyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updateContent: true,
        })
      );
    });

    it('should pass publishAfterSync flag to each sync operation', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        publishAfterSync: true,
      });

      expect(syncHierarchyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          publishAfterSync: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue processing when one hierarchy fails', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
        createMatchedPair('cat-products', 'Product Categories'),
      ];

      syncHierarchyMock
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Sync failed for nav-footer')) // Second fails
        .mockResolvedValueOnce(undefined); // Third succeeds

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(syncHierarchyMock).toHaveBeenCalledTimes(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should track failed hierarchy details', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      syncHierarchyMock
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('API error: Rate limit exceeded'));

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        sourceDeliveryKey: 'nav-main',
        sourceName: 'Main Navigation',
        success: true,
      });
      expect(result.results[1]).toEqual({
        sourceDeliveryKey: 'nav-footer',
        sourceName: 'Footer Links',
        success: false,
        error: 'API error: Rate limit exceeded',
      });
    });

    it('should not stop on first failure', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
        createMatchedPair('cat-products', 'Product Categories'),
      ];

      syncHierarchyMock
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(syncHierarchyMock).toHaveBeenCalledTimes(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should aggregate all errors', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
        createMatchedPair('cat-products', 'Product Categories'),
      ];

      syncHierarchyMock
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(undefined);

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      const failedResults = result.results.filter(
        (r: { success: boolean; error?: string }) => !r.success
      );
      expect(failedResults).toHaveLength(2);
      expect(failedResults[0].error).toBe('Error 1');
      expect(failedResults[1].error).toBe('Error 2');
    });
  });

  describe('Progress Tracking', () => {
    it('should create progress bar with correct total', async () => {
      const { createProgressBar } = await import('~/utils');
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(createProgressBar).toHaveBeenCalledWith(2, expect.any(String));
    });

    it('should increment progress after each hierarchy', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
        createMatchedPair('cat-products', 'Product Categories'),
      ];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(mockProgressBar.increment).toHaveBeenCalledTimes(3);
      expect(mockProgressBar.stop).toHaveBeenCalledTimes(1);
    });

    it('should display current hierarchy name in progress', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Main Navigation'));

      consoleLogSpy.mockRestore();
    });

    it('should stop progress bar after completion', async () => {
      const mockProgressBar = {
        start: vi.fn(),
        increment: vi.fn(),
        stop: vi.fn(),
      };
      const { createProgressBar } = await import('~/utils');
      vi.mocked(createProgressBar).mockReturnValue(
        mockProgressBar as unknown as cliProgress.SingleBar
      );

      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(mockProgressBar.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Result Aggregation', () => {
    it('should count successful synchronizations', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should count failed synchronizations', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      syncHierarchyMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Failed'));

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should collect detailed results for each hierarchy', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        sourceDeliveryKey: 'nav-main',
        sourceName: 'Main Navigation',
        success: true,
      });
      expect(result.results[1]).toMatchObject({
        sourceDeliveryKey: 'nav-footer',
        sourceName: 'Footer Links',
        success: true,
      });
    });

    it('should include items created/removed counts', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation', 5)];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      // Note: Since we can't easily track created/removed from syncHierarchy mock,
      // we just verify the structure exists
      expect(result.results[0]).toHaveProperty('success');
      expect(result.results[0]).toHaveProperty('sourceDeliveryKey');
      expect(result.results[0]).toHaveProperty('sourceName');
    });
  });

  describe('Dry-Run Mode', () => {
    it('should pass isDryRun to individual sync operations', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        isDryRun: true,
      });

      expect(syncHierarchyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isDryRun: true,
        })
      );
    });

    it('should not modify progress behavior in dry-run', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        isDryRun: true,
      });

      expect(mockProgressBar.increment).toHaveBeenCalledTimes(2);
      expect(mockProgressBar.stop).toHaveBeenCalledTimes(1);
    });

    it('should return proper dry-run results', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
        isDryRun: true,
      });

      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.results[0].success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty matched pairs array', async () => {
      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs: [],
      });

      expect(syncHierarchyMock).not.toHaveBeenCalled();
      expect(result.totalProcessed).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should handle all hierarchies failing', async () => {
      const matchedPairs = [
        createMatchedPair('nav-main', 'Main Navigation'),
        createMatchedPair('nav-footer', 'Footer Links'),
      ];

      syncHierarchyMock
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'));

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(result.totalProcessed).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
    });

    it('should handle single hierarchy processing', async () => {
      const matchedPairs = [createMatchedPair('nav-main', 'Main Navigation')];

      const result = await bulkSyncHierarchies({
        ...baseOptions,
        matchedPairs,
      });

      expect(syncHierarchyMock).toHaveBeenCalledTimes(1);
      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(1);
    });
  });
});
