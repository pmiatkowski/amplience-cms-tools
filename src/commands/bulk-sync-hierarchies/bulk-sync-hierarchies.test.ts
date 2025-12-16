import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForDryRun,
  promptForConfirmation,
} from '~/prompts';
import { bulkSyncHierarchies } from '~/services/actions/bulk-sync-hierarchies';
import { AmplienceService } from '~/services/amplience-service';
import { HierarchyService } from '~/services/hierarchy-service';
import { promptForLocaleStrategy } from '../sync-hierarchy/prompts';
import { runBulkSyncHierarchies } from './bulk-sync-hierarchies';
import { promptForHierarchyFilters, promptForMultipleHierarchies } from './prompts';
import {
  generateMissingHierarchiesReport,
  matchHierarchies,
  saveMissingHierarchiesReport,
} from './utils';
import type { BulkSyncResult } from './types';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions/bulk-sync-hierarchies');
vi.mock('~/services/amplience-service');
vi.mock('~/services/hierarchy-service');
vi.mock('../sync-hierarchy/prompts');
vi.mock('./prompts');
vi.mock('./utils');

describe('runBulkSyncHierarchies command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set up default HierarchyService mock
    const mockHierarchyService = {
      buildHierarchyTreeFromItems: vi
        .fn()
        .mockReturnValue({ item: createTestContentItem(), children: [] }),
    };
    vi.mocked(HierarchyService).mockImplementation(
      () => mockHierarchyService as unknown as HierarchyService
    );
  });

  describe('configuration & setup', () => {
    it('should exit early if no hubs configured', async () => {
      vi.mocked(getHubConfigs).mockReturnValue([]);

      await runBulkSyncHierarchies();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('No hub configurations found')
      );
      expect(promptForHub).not.toHaveBeenCalled();
    });

    it('should exit early if no repositories available in source hub', async () => {
      const hubConfig = createTestHubConfig();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No repositories found in source hub')
      );
    });

    it('should load hub configurations correctly', async () => {
      const hubConfigs = [createTestHubConfig(), createTestHubConfig({ name: 'Hub 2' })];
      vi.mocked(getHubConfigs).mockReturnValue(hubConfigs);
      vi.mocked(promptForHub).mockResolvedValueOnce(null as unknown as Amplience.HubConfig);

      await runBulkSyncHierarchies();

      expect(getHubConfigs).toHaveBeenCalledTimes(1);
    });
  });

  describe('source selection flow', () => {
    it('should prompt for source hub selection', async () => {
      const hubConfig = createTestHubConfig();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForHub).toHaveBeenCalledTimes(1);
      expect(promptForHub).toHaveBeenCalledWith([hubConfig]);
    });

    it('should prompt for source repository selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [], filteredItems: [] }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForRepository).toHaveBeenCalledTimes(1);
      expect(promptForRepository).toHaveBeenCalledWith([repo]);
    });

    it('should use promptForHierarchyFilters for filtering', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [], filteredItems: [] }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForHierarchyFilters).toHaveBeenCalledTimes(1);
      expect(promptForHierarchyFilters).toHaveBeenCalledWith();
    });

    it('should use promptForMultipleHierarchies for selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      const items = [createTestContentItem(), createTestContentItem({ id: 'item-2' })];
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce([]);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForMultipleHierarchies).toHaveBeenCalledTimes(1);
      expect(promptForMultipleHierarchies).toHaveBeenCalledWith(items);
    });

    it('should validate at least one hierarchy selected', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce([]);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No hierarchies selected'));
    });

    it('should fetch allItems for tree building', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce([]);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: [] }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(mockService.getContentItemsBy).toHaveBeenCalledWith(
        repo.id,
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('target selection flow', () => {
    it('should prompt for target hub selection', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing: [] });

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForHub).toHaveBeenCalledTimes(2);
    });

    it('should prompt for target repository selection', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing: [] });

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(promptForRepository).toHaveBeenCalledTimes(2);
    });

    it('should fetch target repository items', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing: [] });

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(mockService.getAllContentItems).toHaveBeenCalledWith(repo.id, expect.any(Function));
    });
  });

  describe('hierarchy matching', () => {
    it('should call matchHierarchies with source and target items', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const sourceItems = [createTestContentItem()];
      const targetItems = [createTestContentItem({ id: 'target-item' })];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(sourceItems);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing: [] });

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue(targetItems),
        getContentItemsBy: vi.fn().mockResolvedValue({
          allItems: sourceItems,
          filteredItems: sourceItems,
        }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(matchHierarchies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            item: sourceItems[0],
            allItems: sourceItems,
          }),
        ]),
        targetItems
      );
    });

    it('should display missing hierarchies warning if any', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('Missing report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('report-path.md');

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Missing: 1'));
    });

    it('should save missing hierarchies report', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('Missing report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('report-path.md');

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(generateMissingHierarchiesReport).toHaveBeenCalledWith(missing);
      expect(saveMissingHierarchiesReport).toHaveBeenCalledWith('Missing report');
    });

    it('should allow user to cancel if all hierarchies missing', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({ matched: [], missing });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('Missing report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('report-path.md');

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getAllContentItems: vi.fn().mockResolvedValue([]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No matching hierarchies found')
      );
    });
  });

  describe('configuration prompts', () => {
    it('should prompt for update content option', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(promptForConfirmation).toHaveBeenCalledWith(
        'Update content of existing items (body comparison)?',
        false
      );
    });

    it('should prompt for locale strategy', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(promptForLocaleStrategy).toHaveBeenCalledTimes(1);
    });

    it('should prompt for publish after sync option', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(promptForConfirmation).toHaveBeenCalledWith(
        'Publish content items after synchronization?',
        false
      );
    });

    it('should prompt for dry-run mode', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(promptForDryRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('summary & confirmation', () => {
    it('should display summary of selected hierarchies', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Summary'));
    });

    it('should display matched vs missing counts', async () => {
      const { items } = setupBasicMocks();
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];
      vi.mocked(matchHierarchies).mockReturnValue({
        matched: [
          {
            source: { item: items[0], allItems: items },
            target: { item: items[0], allItems: items },
          },
        ],
        missing,
      });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('path.md');

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('synchronize: 1'));
    });

    it('should display configuration summary', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Configuration:'));
    });

    it('should prompt for final confirmation', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);

      await runBulkSyncHierarchies();

      expect(promptForConfirmation).toHaveBeenCalledWith(
        'Do you want to proceed with these changes?',
        false
      );
    });

    it('should exit if user declines confirmation', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // update content
        .mockResolvedValueOnce(false) // publish
        .mockResolvedValueOnce(false); // final confirmation

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled by user'));
      expect(bulkSyncHierarchies).not.toHaveBeenCalled();
    });
  });

  describe('service instantiation', () => {
    it('should create source AmplienceService with correct credentials', async () => {
      const { sourceHub, items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(AmplienceService).toHaveBeenCalledWith(sourceHub);
    });

    it('should create target AmplienceService with correct credentials', async () => {
      const { targetHub, items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(AmplienceService).toHaveBeenCalledWith(targetHub);
    });
  });

  describe('hierarchy tree building', () => {
    it('should build source hierarchy trees using HierarchyService', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const mockHierarchyService = {
        buildHierarchyTreeFromItems: vi.fn().mockReturnValue({ item: items[0], children: [] }),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );

      await runBulkSyncHierarchies();

      expect(HierarchyService).toHaveBeenCalled();
      expect(mockHierarchyService.buildHierarchyTreeFromItems).toHaveBeenCalled();
    });

    it('should use buildHierarchyTreeFromItems (not buildHierarchyTree)', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const mockHierarchyService = {
        buildHierarchyTreeFromItems: vi.fn().mockReturnValue({ item: items[0], children: [] }),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );

      await runBulkSyncHierarchies();

      expect(mockHierarchyService.buildHierarchyTreeFromItems).toHaveBeenCalledWith(
        items[0].id,
        items
      );
    });

    it('should build trees for all matched pairs', async () => {
      setupBasicMocks();
      const items = [
        createTestContentItem({ id: 'item-1' }),
        createTestContentItem({ id: 'item-2' }),
      ];
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
      vi.mocked(matchHierarchies).mockReturnValue({
        matched: [
          {
            source: { item: items[0], allItems: items },
            target: { item: items[0], allItems: items },
          },
          {
            source: { item: items[1], allItems: items },
            target: { item: items[1], allItems: items },
          },
        ],
        missing: [],
      });
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const mockHierarchyService = {
        buildHierarchyTreeFromItems: vi
          .fn()
          .mockReturnValue({ item: createTestContentItem(), children: [] }),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );

      await runBulkSyncHierarchies();

      expect(mockHierarchyService.buildHierarchyTreeFromItems).toHaveBeenCalledTimes(2);
    });
  });

  describe('action execution', () => {
    it('should call bulkSyncHierarchies action with correct options', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(true) // update content
        .mockResolvedValueOnce(true) // publish
        .mockResolvedValueOnce(true); // final confirmation
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(bulkSyncHierarchies).toHaveBeenCalledWith(
        expect.objectContaining({
          updateContent: true,
          publishAfterSync: true,
          localeStrategy: { strategy: 'keep' },
          isDryRun: false,
        })
      );
    });

    it('should pass all configuration options to action', async () => {
      const { repo, items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'remove' });
      vi.mocked(promptForDryRun).mockResolvedValue(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(bulkSyncHierarchies).toHaveBeenCalledWith(
        expect.objectContaining({
          updateContent: false,
          publishAfterSync: false,
          localeStrategy: { strategy: 'remove' },
          isDryRun: true,
          targetRepositoryId: repo.id,
        })
      );
    });

    it('should handle action results', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const result: BulkSyncResult = {
        totalProcessed: 2,
        successful: 1,
        failed: 1,
        results: [
          {
            sourceDeliveryKey: 'key-1',
            sourceName: 'Item 1',
            success: true,
            itemsCreated: 2,
            itemsRemoved: 0,
          },
          {
            sourceDeliveryKey: 'key-2',
            sourceName: 'Item 2',
            success: false,
            error: 'Test error',
          },
        ],
      };
      vi.mocked(bulkSyncHierarchies).mockResolvedValue(result);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Bulk Synchronization Complete')
      );
    });
  });

  describe('results display', () => {
    it('should display final summary with success/failure counts', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const result: BulkSyncResult = {
        totalProcessed: 2,
        successful: 1,
        failed: 1,
        results: [],
      };
      vi.mocked(bulkSyncHierarchies).mockResolvedValue(result);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully synchronized: 1')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed: 1'));
    });

    it('should display detailed results for each hierarchy', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const result: BulkSyncResult = {
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [
          {
            sourceDeliveryKey: 'key-1',
            sourceName: 'Item 1',
            success: true,
            itemsCreated: 2,
            itemsRemoved: 1,
          },
        ],
      };
      vi.mocked(bulkSyncHierarchies).mockResolvedValue(result);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Item 1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 created'));
    });

    it('should display missing hierarchies reminder', async () => {
      const { items } = setupBasicMocks();
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];
      vi.mocked(matchHierarchies).mockReturnValue({
        matched: [
          {
            source: { item: items[0], allItems: items },
            target: { item: items[0], allItems: items },
          },
        ],
        missing,
      });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('path.md');
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Missing in target: 1'));
    });
  });

  describe('user cancellations', () => {
    it('should exit if user cancels source hub selection', async () => {
      vi.mocked(getHubConfigs).mockReturnValue([createTestHubConfig()]);
      vi.mocked(promptForHub).mockResolvedValueOnce(null as unknown as Amplience.HubConfig);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No source hub selected'));
    });

    it('should exit if user cancels source repository selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(
        null as unknown as Amplience.ContentRepository
      );

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [], filteredItems: [] }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No source repository selected')
      );
    });

    it('should exit if user cancels content item filtering', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [], filteredItems: [] }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No hierarchies found matching the criteria')
      );
    });

    it('should exit if user cancels hierarchy selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce([]);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No hierarchies selected'));
    });

    it('should exit if user cancels target hub selection', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      vi.mocked(getHubConfigs).mockReturnValue([sourceHub]);
      vi.mocked(promptForHub)
        .mockResolvedValueOnce(sourceHub)
        .mockResolvedValueOnce(null as unknown as Amplience.HubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No target hub selected. Aborting.')
      );
    });

    it('should exit if user cancels target repository selection', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const items = [createTestContentItem()];
      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository)
        .mockResolvedValueOnce(repo)
        .mockResolvedValueOnce(null as unknown as Amplience.ContentRepository);
      vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
      vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
        getContentItemsBy: vi.fn().mockResolvedValue({ allItems: items, filteredItems: items }),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No target repository selected. Aborting.')
      );
    });

    it('should exit if user cancels final confirmation', async () => {
      const { repo, items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForRepository)
        .mockResolvedValueOnce(repo) // source repo
        .mockResolvedValueOnce(repo); // target repo
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // updateContent
        .mockResolvedValueOnce(false) // publishAfterSync
        .mockResolvedValueOnce(false); // final confirmation

      await runBulkSyncHierarchies();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Operation cancelled by user')
      );
      expect(bulkSyncHierarchies).not.toHaveBeenCalled();
    });
  });

  describe('happy path scenarios', () => {
    it('should complete full flow when all hierarchies match', async () => {
      const { repo, items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForRepository)
        .mockResolvedValueOnce(repo) // source repo
        .mockResolvedValueOnce(repo); // target repo
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // updateContent
        .mockResolvedValueOnce(false) // publishAfterSync
        .mockResolvedValueOnce(true); // final confirmation
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(bulkSyncHierarchies).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Bulk Synchronization Complete')
      );
    });

    it('should complete full flow when some hierarchies missing', async () => {
      const { items } = setupBasicMocks();
      const missing = [
        {
          deliveryKey: 'missing-key',
          schemaId: 'missing-schema',
          name: 'Missing Item',
          contentCount: 5,
        },
      ];
      vi.mocked(matchHierarchies).mockReturnValue({
        matched: [
          {
            source: { item: items[0], allItems: items },
            target: { item: items[0], allItems: items },
          },
        ],
        missing,
      });
      vi.mocked(generateMissingHierarchiesReport).mockReturnValue('report');
      vi.mocked(saveMissingHierarchiesReport).mockResolvedValue('path.md');
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(bulkSyncHierarchies).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Bulk Synchronization Complete')
      );
    });

    it('should complete dry-run flow', async () => {
      const { items } = setupBasicMocks();
      setupMatchedPairs(items, items);
      vi.mocked(promptForDryRun).mockResolvedValue(true);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      vi.mocked(bulkSyncHierarchies).mockResolvedValue({
        totalProcessed: 1,
        successful: 1,
        failed: 0,
        results: [],
      });

      await runBulkSyncHierarchies();

      expect(bulkSyncHierarchies).toHaveBeenCalledWith(
        expect.objectContaining({
          isDryRun: true,
        })
      );
    });
  });
});

// Test Helper Functions

function createTestHubConfig(overrides?: Partial<Amplience.HubConfig>): Amplience.HubConfig {
  return {
    name: 'Test Hub',
    hubId: 'test-hub-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    ...overrides,
  };
}

function createTestRepository(
  overrides?: Partial<Amplience.ContentRepository>
): Amplience.ContentRepository {
  return {
    id: 'test-repo-id',
    label: 'Test Repository',
    ...overrides,
  } as Amplience.ContentRepository;
}

function createTestContentItem(overrides?: Partial<Amplience.ContentItem>): Amplience.ContentItem {
  return {
    id: 'test-item-id',
    label: 'Test Item',
    schemaId: 'test-schema',
    version: 1,
    body: {
      _meta: {
        name: 'test-item',
        schema: 'test-schema',
        deliveryKey: 'test-key',
      },
    },
    folderId: null,
    ...overrides,
  } as Amplience.ContentItem;
}

function setupBasicMocks(): {
  sourceHub: Amplience.HubConfig;
  targetHub: Amplience.HubConfig;
  repo: Amplience.ContentRepository;
  items: Amplience.ContentItem[];
} {
  const sourceHub = createTestHubConfig({ name: 'Source' });
  const targetHub = createTestHubConfig({ name: 'Target' });
  const repo = createTestRepository();
  const items = [createTestContentItem()];

  vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
  vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
  vi.mocked(promptForRepository).mockResolvedValue(repo);
  vi.mocked(promptForHierarchyFilters).mockResolvedValueOnce({});
  vi.mocked(promptForMultipleHierarchies).mockResolvedValueOnce(items);
  vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
  vi.mocked(promptForDryRun).mockResolvedValue(false);
  // Note: promptForConfirmation is NOT set here - let each test control it
  vi.mocked(bulkSyncHierarchies).mockResolvedValue({
    totalProcessed: 1,
    successful: 1,
    failed: 0,
    results: [],
  });

  const mockService = {
    getRepositories: vi.fn().mockResolvedValue([repo]),
    getAllContentItems: vi.fn().mockResolvedValue(items),
    getContentItemsBy: vi.fn().mockResolvedValue({
      allItems: items,
      filteredItems: items,
    }),
  } as unknown as AmplienceService;

  vi.mocked(AmplienceService).mockImplementation(() => mockService);

  return { sourceHub, targetHub, repo, items };
}

function setupMatchedPairs(
  sourceItems: Amplience.ContentItem[],
  targetItems: Amplience.ContentItem[]
): void {
  vi.mocked(matchHierarchies).mockReturnValue({
    matched: [
      {
        source: { item: sourceItems[0], allItems: sourceItems },
        target: { item: targetItems[0], allItems: targetItems },
      },
    ],
    missing: [],
  });
}
