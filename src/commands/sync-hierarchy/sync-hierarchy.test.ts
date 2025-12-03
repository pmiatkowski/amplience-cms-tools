import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForRepository,
  promptForContentItem,
  promptForDryRun,
  promptForConfirmation,
} from '~/prompts';
import { syncHierarchy } from '~/services/actions/sync-hierarchy';
import { AmplienceService } from '~/services/amplience-service';
import { HierarchyService } from '~/services/hierarchy-service';
import { promptForLocaleStrategy } from './prompts';
import { runSyncHierarchy } from './sync-hierarchy';

vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('~/services/actions/sync-hierarchy');
vi.mock('~/services/amplience-service');
vi.mock('~/services/hierarchy-service');
vi.mock('./prompts');

describe('runSyncHierarchy command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('initialization & validation', () => {
    it('should return early when no hub configurations exist', async () => {
      vi.mocked(getHubConfigs).mockReturnValue([]);

      await runSyncHierarchy();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('No hub configurations found')
      );
      expect(promptForHub).not.toHaveBeenCalled();
    });

    it('should return early when user cancels source hub selection', async () => {
      vi.mocked(getHubConfigs).mockReturnValue([createTestHubConfig()]);
      vi.mocked(promptForHub).mockResolvedValueOnce(null as unknown as Amplience.HubConfig);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No source hub selected'));
      expect(promptForRepository).not.toHaveBeenCalled();
    });

    it('should return early when source hub has no repositories', async () => {
      const hubConfig = createTestHubConfig();
      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No repositories found in source hub')
      );
    });

    it('should return early when user cancels source root item selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();

      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub).mockResolvedValueOnce(hubConfig);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForContentItem).mockResolvedValueOnce(null);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No source root item selected')
      );
    });

    it('should return early when user cancels target hub selection', async () => {
      const hubConfig = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();

      vi.mocked(getHubConfigs).mockReturnValue([hubConfig]);
      vi.mocked(promptForHub)
        .mockResolvedValueOnce(hubConfig) // Source hub
        .mockResolvedValueOnce(null as unknown as Amplience.HubConfig); // Target hub
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForContentItem).mockResolvedValueOnce(rootItem);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No target hub selected'));
    });

    it('should return early when target hub has no repositories', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source Hub' });
      const targetHub = createTestHubConfig({ name: 'Target Hub' });
      const repo = createTestRepository();
      const rootItem = createTestContentItem();

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValueOnce(repo);
      vi.mocked(promptForContentItem).mockResolvedValueOnce(rootItem);

      let callCount = 0;
      vi.mocked(AmplienceService).mockImplementation(() => {
        callCount++;

        return {
          getRepositories: vi.fn().mockResolvedValue(callCount === 1 ? [repo] : []),
        } as unknown as AmplienceService;
      });

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No repositories found in target hub')
      );
    });

    it('should return early when user cancels target root item selection', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source Hub' });
      const targetHub = createTestHubConfig({ name: 'Target Hub' });
      const repo = createTestRepository();
      const sourceRootItem = createTestContentItem({ label: 'Source Root' });

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem)
        .mockResolvedValueOnce(sourceRootItem)
        .mockResolvedValueOnce(null); // Target root item

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No target root item selected')
      );
    });

    it('should return early when user cancels final confirmation', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source Hub' });
      const targetHub = createTestHubConfig({ name: 'Target Hub' });
      const repo = createTestRepository();
      const rootItem = createTestContentItem();

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // Update content
        .mockResolvedValueOnce(false) // Publish after sync
        .mockResolvedValueOnce(false); // Final confirmation

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      await runSyncHierarchy();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled by user'));
      expect(syncHierarchy).not.toHaveBeenCalled();
    });
  });

  describe('configuration flow', () => {
    it('should call all prompts in correct order', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source Hub' });
      const targetHub = createTestHubConfig({ name: 'Target Hub' });
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const sourceTree = { item: rootItem, children: [] };

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation).mockResolvedValue(true);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      const mockHierarchyService = {
        buildHierarchyTree: vi.fn().mockResolvedValue(sourceTree),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );
      vi.mocked(syncHierarchy).mockResolvedValue(undefined);

      await runSyncHierarchy();

      expect(promptForHub).toHaveBeenCalledTimes(2);
      expect(promptForRepository).toHaveBeenCalledTimes(2);
      expect(promptForContentItem).toHaveBeenCalledTimes(2);
      expect(promptForConfirmation).toHaveBeenCalledTimes(3);
      expect(promptForLocaleStrategy).toHaveBeenCalledTimes(1);
      expect(promptForDryRun).toHaveBeenCalledTimes(1);
    });

    it('should pass updateContent: true when user selects update content', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(true) // Update content
        .mockResolvedValueOnce(false) // Publish after sync
        .mockResolvedValueOnce(true); // Final confirmation

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      const mockHierarchyService = {
        buildHierarchyTree: vi.fn().mockResolvedValue(tree),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );
      vi.mocked(syncHierarchy).mockResolvedValue(undefined);

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          updateContent: true,
        })
      );
    });

    it('should pass updateContent: false when user declines update content', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // Update content
        .mockResolvedValueOnce(false) // Publish after sync
        .mockResolvedValueOnce(true); // Final confirmation

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      const mockHierarchyService = {
        buildHierarchyTree: vi.fn().mockResolvedValue(tree),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );
      vi.mocked(syncHierarchy).mockResolvedValue(undefined);

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          updateContent: false,
        })
      );
    });

    it('should pass publishAfterSync: true when user selects publish', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // Update content
        .mockResolvedValueOnce(true) // Publish after sync
        .mockResolvedValueOnce(true); // Final confirmation

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      const mockHierarchyService = {
        buildHierarchyTree: vi.fn().mockResolvedValue(tree),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );
      vi.mocked(syncHierarchy).mockResolvedValue(undefined);

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          publishAfterSync: true,
        })
      );
    });

    it('should pass publishAfterSync: false when user declines publish', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      vi.mocked(promptForConfirmation)
        .mockResolvedValueOnce(false) // Update content
        .mockResolvedValueOnce(false) // Publish after sync
        .mockResolvedValueOnce(true); // Final confirmation

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          publishAfterSync: false,
        })
      );
    });

    it('should pass isDryRun: true when user selects dry run', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      vi.mocked(promptForDryRun).mockResolvedValue(true);

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          isDryRun: true,
        })
      );
    });

    it('should pass isDryRun: false when user selects live execution', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      vi.mocked(promptForDryRun).mockResolvedValue(false);

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          isDryRun: false,
        })
      );
    });
  });

  describe('hierarchy building', () => {
    it('should call buildHierarchyTree for source with correct parameters', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository({ id: 'repo-123' });
      const rootItem = createTestContentItem({ id: 'root-456' });
      const tree = { item: rootItem, children: [] };

      const buildHierarchyTreeMock = vi.fn().mockResolvedValue(tree);

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree, buildHierarchyTreeMock);

      await runSyncHierarchy();

      expect(buildHierarchyTreeMock).toHaveBeenCalledWith('root-456', 'repo-123');
    });

    it('should call buildHierarchyTree for target with correct parameters', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository({ id: 'repo-789' });
      const rootItem = createTestContentItem({ id: 'root-012' });
      const tree = { item: rootItem, children: [] };

      const buildHierarchyTreeMock = vi.fn().mockResolvedValue(tree);

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree, buildHierarchyTreeMock);

      await runSyncHierarchy();

      // Called twice: once for source, once for target
      expect(buildHierarchyTreeMock).toHaveBeenCalledTimes(2);
      expect(buildHierarchyTreeMock).toHaveBeenNthCalledWith(2, 'root-012', 'repo-789');
    });

    it('should use different service instances for source and target', async () => {
      const sourceHub = createTestHubConfig({ name: 'Source' });
      const targetHub = createTestHubConfig({ name: 'Target' });
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      await runSyncHierarchy();

      expect(AmplienceService).toHaveBeenCalledTimes(2);
      expect(AmplienceService).toHaveBeenCalledWith(sourceHub);
      expect(AmplienceService).toHaveBeenCalledWith(targetHub);
    });
  });

  describe('action invocation', () => {
    it('should call syncHierarchy with all required options', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository({ id: 'target-repo-123' });
      const rootItem = createTestContentItem();
      const sourceTree = { item: rootItem, children: [] };
      const targetTree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, sourceTree);

      vi.mocked(promptForLocaleStrategy).mockResolvedValue({
        strategy: 'replace',
        targetLocale: 'fr-FR',
      });

      const buildHierarchyTreeMock = vi
        .fn()
        .mockResolvedValueOnce(sourceTree)
        .mockResolvedValueOnce(targetTree);

      vi.mocked(HierarchyService).mockImplementation(
        () =>
          ({
            buildHierarchyTree: buildHierarchyTreeMock,
          }) as unknown as HierarchyService
      );

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith({
        sourceService: expect.any(Object),
        targetService: expect.any(Object),
        targetRepositoryId: 'target-repo-123',
        sourceTree,
        targetTree,
        updateContent: false,
        localeStrategy: {
          strategy: 'replace',
          targetLocale: 'fr-FR',
        },
        publishAfterSync: false,
        isDryRun: false,
      });
    });

    it('should pass correct locale strategy to action', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      vi.mocked(promptForLocaleStrategy).mockResolvedValue({
        strategy: 'remove',
      });

      await runSyncHierarchy();

      expect(syncHierarchy).toHaveBeenCalledWith(
        expect.objectContaining({
          localeStrategy: { strategy: 'remove' },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should log error and re-throw when action throws', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();
      const tree = { item: rootItem, children: [] };

      setupSuccessfulFlow(sourceHub, targetHub, repo, rootItem, tree);

      const testError = new Error('Sync failed');
      vi.mocked(syncHierarchy).mockRejectedValue(testError);

      await expect(runSyncHierarchy()).rejects.toThrow('Sync failed');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during hierarchy synchronization command'),
        testError
      );
    });

    it('should log error and re-throw when HierarchyService throws', async () => {
      const sourceHub = createTestHubConfig();
      const targetHub = createTestHubConfig();
      const repo = createTestRepository();
      const rootItem = createTestContentItem();

      vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
      vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
      vi.mocked(promptForRepository).mockResolvedValue(repo);
      vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
      vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
      vi.mocked(promptForDryRun).mockResolvedValue(false);
      vi.mocked(promptForConfirmation).mockResolvedValue(true);

      const mockService = {
        getRepositories: vi.fn().mockResolvedValue([repo]),
      } as unknown as AmplienceService;

      vi.mocked(AmplienceService).mockImplementation(() => mockService);

      const testError = new Error('Failed to build tree');
      const mockHierarchyService = {
        buildHierarchyTree: vi.fn().mockRejectedValue(testError),
      };

      vi.mocked(HierarchyService).mockImplementation(
        () => mockHierarchyService as unknown as HierarchyService
      );

      await expect(runSyncHierarchy()).rejects.toThrow('Failed to build tree');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during hierarchy synchronization command'),
        testError
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
      },
    },
    folderId: null,
    ...overrides,
  } as Amplience.ContentItem;
}

function setupSuccessfulFlow(
  sourceHub: Amplience.HubConfig,
  targetHub: Amplience.HubConfig,
  repo: Amplience.ContentRepository,
  rootItem: Amplience.ContentItem,
  tree: Amplience.HierarchyNode,
  buildHierarchyTreeMock?: unknown
): void {
  vi.mocked(getHubConfigs).mockReturnValue([sourceHub, targetHub]);
  vi.mocked(promptForHub).mockResolvedValueOnce(sourceHub).mockResolvedValueOnce(targetHub);
  vi.mocked(promptForRepository).mockResolvedValue(repo);
  vi.mocked(promptForContentItem).mockResolvedValue(rootItem);
  vi.mocked(promptForLocaleStrategy).mockResolvedValue({ strategy: 'keep' });
  vi.mocked(promptForDryRun).mockResolvedValue(false);
  vi.mocked(promptForConfirmation)
    .mockResolvedValue(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true); // Last one is final confirmation

  const mockService = {
    getRepositories: vi.fn().mockResolvedValue([repo]),
  } as unknown as AmplienceService;

  vi.mocked(AmplienceService).mockImplementation(() => mockService);

  const mockHierarchyService = {
    buildHierarchyTree: buildHierarchyTreeMock || vi.fn().mockResolvedValue(tree),
  };

  vi.mocked(HierarchyService).mockImplementation(
    () => mockHierarchyService as unknown as HierarchyService
  );
  vi.mocked(syncHierarchy).mockResolvedValue(undefined);
}
