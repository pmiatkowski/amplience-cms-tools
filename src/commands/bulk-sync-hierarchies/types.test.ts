import { describe, expect, it } from 'vitest';
import type {
  BulkSyncHierarchiesOptions,
  BulkSyncResult,
  BulkSyncSummary,
  MatchedHierarchyPair,
  MissingHierarchy,
  SourceHierarchy,
} from './types';

describe('Bulk Sync Hierarchies Types', () => {
  describe('SourceHierarchy', () => {
    it('should validate SourceHierarchy structure', () => {
      const sourceHierarchy: SourceHierarchy = {
        item: {
          id: 'item-1',
          label: 'Test Hierarchy',
          body: {
            _meta: {
              deliveryKey: 'test-key',
              schema: 'https://schema.com/hierarchy',
            },
          },
        } as Amplience.ContentItem,
        allItems: [
          {
            id: 'item-1',
            label: 'Test Hierarchy',
          } as Amplience.ContentItem,
        ],
        contentCount: 5,
      };

      expect(sourceHierarchy.item).toBeDefined();
      expect(sourceHierarchy.allItems).toBeInstanceOf(Array);
      expect(sourceHierarchy.contentCount).toBe(5);
    });

    it('should allow optional contentCount', () => {
      const sourceHierarchy: SourceHierarchy = {
        item: {} as Amplience.ContentItem,
        allItems: [],
      };

      expect(sourceHierarchy.contentCount).toBeUndefined();
    });
  });

  describe('MatchedHierarchyPair', () => {
    it('should validate MatchedHierarchyPair structure', () => {
      const matchedPair: MatchedHierarchyPair = {
        source: {
          item: {
            id: 'source-1',
            label: 'Source',
          } as Amplience.ContentItem,
          allItems: [],
        },
        target: {
          item: {
            id: 'target-1',
            label: 'Target',
          } as Amplience.ContentItem,
          allItems: [],
        },
      };

      expect(matchedPair.source).toBeDefined();
      expect(matchedPair.target).toBeDefined();
      expect(matchedPair.source.item.id).toBe('source-1');
      expect(matchedPair.target.item.id).toBe('target-1');
    });

    it('should support nested source hierarchy with contentCount', () => {
      const matchedPair: MatchedHierarchyPair = {
        source: {
          item: {} as Amplience.ContentItem,
          allItems: [],
          contentCount: 10,
        },
        target: {
          item: {} as Amplience.ContentItem,
          allItems: [],
        },
      };

      expect(matchedPair.source.contentCount).toBe(10);
    });
  });

  describe('MissingHierarchy', () => {
    it('should validate MissingHierarchy structure', () => {
      const missingHierarchy: MissingHierarchy = {
        deliveryKey: 'nav-main',
        schemaId: 'https://schema.com/navigation',
        name: 'Main Navigation',
        contentCount: 12,
      };

      expect(missingHierarchy.deliveryKey).toBe('nav-main');
      expect(missingHierarchy.schemaId).toBe('https://schema.com/navigation');
      expect(missingHierarchy.name).toBe('Main Navigation');
      expect(missingHierarchy.contentCount).toBe(12);
    });

    it('should require all fields', () => {
      const missingHierarchy: MissingHierarchy = {
        deliveryKey: '',
        schemaId: '',
        name: '',
        contentCount: 0,
      };

      expect(missingHierarchy).toBeDefined();
    });
  });

  describe('BulkSyncSummary', () => {
    it('should validate BulkSyncSummary structure', () => {
      const summary: BulkSyncSummary = {
        totalSelected: 5,
        totalMatched: 3,
        totalMissing: 2,
        missingHierarchies: [
          {
            deliveryKey: 'missing-1',
            schemaId: 'https://schema.com/test',
            name: 'Missing Hierarchy',
            contentCount: 10,
          },
        ],
      };

      expect(summary.totalSelected).toBe(5);
      expect(summary.totalMatched).toBe(3);
      expect(summary.totalMissing).toBe(2);
      expect(summary.missingHierarchies).toHaveLength(1);
    });

    it('should allow empty missingHierarchies array', () => {
      const summary: BulkSyncSummary = {
        totalSelected: 3,
        totalMatched: 3,
        totalMissing: 0,
        missingHierarchies: [],
      };

      expect(summary.missingHierarchies).toHaveLength(0);
    });
  });

  describe('BulkSyncHierarchiesOptions', () => {
    it('should validate BulkSyncHierarchiesOptions structure', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockService = {} as any;
      const options: BulkSyncHierarchiesOptions = {
        sourceService: mockService,
        targetService: mockService,
        targetRepositoryId: 'repo-123',
        matchedPairs: [],
        updateContent: true,
        localeStrategy: { strategy: 'keep' },
        publishAfterSync: false,
        isDryRun: false,
      };

      expect(options.targetRepositoryId).toBe('repo-123');
      expect(options.updateContent).toBe(true);
      expect(options.localeStrategy.strategy).toBe('keep');
      expect(options.publishAfterSync).toBe(false);
      expect(options.isDryRun).toBe(false);
    });

    it('should support locale strategy with targetLocale', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockService = {} as any;
      const options: BulkSyncHierarchiesOptions = {
        sourceService: mockService,
        targetService: mockService,
        targetRepositoryId: 'repo-123',
        matchedPairs: [],
        updateContent: false,
        localeStrategy: { strategy: 'replace', targetLocale: 'fr-FR' },
        publishAfterSync: true,
        isDryRun: true,
      };

      expect(options.localeStrategy.strategy).toBe('replace');
      expect(options.localeStrategy.targetLocale).toBe('fr-FR');
    });

    it('should support matched pairs array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockService = {} as any;
      const options: BulkSyncHierarchiesOptions = {
        sourceService: mockService,
        targetService: mockService,
        targetRepositoryId: 'repo-123',
        matchedPairs: [
          {
            source: {
              item: {} as Amplience.ContentItem,
              allItems: [],
            },
            target: {
              item: {} as Amplience.ContentItem,
              allItems: [],
            },
          },
        ],
        updateContent: true,
        localeStrategy: { strategy: 'keep' },
        publishAfterSync: false,
        isDryRun: false,
      };

      expect(options.matchedPairs).toHaveLength(1);
    });
  });

  describe('BulkSyncResult', () => {
    it('should validate BulkSyncResult structure', () => {
      const result: BulkSyncResult = {
        totalProcessed: 3,
        successful: 2,
        failed: 1,
        results: [
          {
            sourceDeliveryKey: 'nav-main',
            sourceName: 'Main Navigation',
            success: true,
            itemsCreated: 5,
            itemsRemoved: 2,
          },
          {
            sourceDeliveryKey: 'nav-footer',
            sourceName: 'Footer Links',
            success: false,
            error: 'API Error',
          },
        ],
      };

      expect(result.totalProcessed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
    });

    it('should support successful result with items created/removed', () => {
      const result: BulkSyncResult = {
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [
          {
            sourceDeliveryKey: 'test-key',
            sourceName: 'Test Hierarchy',
            success: true,
            itemsCreated: 10,
            itemsRemoved: 3,
          },
        ],
      };

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemsCreated).toBe(10);
      expect(result.results[0].itemsRemoved).toBe(3);
      expect(result.results[0].error).toBeUndefined();
    });

    it('should support failed result with error message', () => {
      const result: BulkSyncResult = {
        totalProcessed: 1,
        successful: 0,
        failed: 1,
        results: [
          {
            sourceDeliveryKey: 'test-key',
            sourceName: 'Test Hierarchy',
            success: false,
            error: 'Network timeout',
          },
        ],
      };

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Network timeout');
      expect(result.results[0].itemsCreated).toBeUndefined();
      expect(result.results[0].itemsRemoved).toBeUndefined();
    });

    it('should allow empty results array', () => {
      const result: BulkSyncResult = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: [],
      };

      expect(result.results).toHaveLength(0);
    });
  });
});
