import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmplienceService } from '../amplience-service';
import { archiveContentItem, type ItemCleanupResult } from './archive-content-item';
import { archiveContentItemWithDescendants } from './archive-content-item-with-descendants';
import { archiveContentTypeSchemas } from './archive-content-type-schemas';

// Mock dependencies
vi.mock('../amplience-service');
vi.mock('./archive-content-item');
vi.mock('./archive-content-item-with-descendants');
vi.mock('~/utils', () => ({
  createProgressBar: vi.fn(() => ({
    start: vi.fn(),
    increment: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('archiveContentTypeSchemas', () => {
  // Mock console methods to keep test output clean
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Mock Data Factories', () => {
    // Factory functions for creating test data
    const createMockHub = (overrides?: Partial<Amplience.HubOAuthConfig>): Amplience.HubConfig =>
      ({
        name: 'Test Hub',
        hubId: 'test-hub-id',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        ...overrides,
      }) as Amplience.HubConfig;

    const createMockSchema = (
      overrides?: Partial<Amplience.ContentTypeSchema>
    ): Amplience.ContentTypeSchema => ({
      id: 'schema-id-1',
      schemaId: 'https://example.com/schema-1.json',
      body: {},
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      version: 1,
      createdDate: '2025-01-01T00:00:00Z',
      lastModifiedDate: '2025-01-01T00:00:00Z',
      createdBy: 'user@example.com',
      lastModifiedBy: 'user@example.com',
      ...overrides,
    });

    const createMockContentType = (
      overrides?: Partial<Amplience.ContentType>
    ): Amplience.ContentType => ({
      id: 'content-type-id-1',
      hubContentTypeId: 'test-content-type',
      contentTypeUri: 'https://example.com/schema-1.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: {
        label: 'Test Content Type',
        icons: [],
        visualizations: [],
      },
      ...overrides,
    });

    const createMockContentItem = (
      overrides?: Partial<Amplience.ContentItem>
    ): Amplience.ContentItem => ({
      id: 'item-id-1',
      label: 'Test Item',
      schemaId: 'https://example.com/schema-1.json',
      status: 'ACTIVE' as Amplience.ContentStatus,
      publishingStatus: 'NONE' as Amplience.PublishingStatus,
      version: 1,
      body: {
        _meta: {
          schema: 'https://example.com/schema-1.json',
        },
      },
      createdDate: '2025-01-01T00:00:00Z',
      lastModifiedDate: '2025-01-01T00:00:00Z',
      deliveryId: 'delivery-id-1',
      validationState: 'valid',
      ...overrides,
    });

    const createMockRepository = (
      overrides?: Partial<Amplience.ContentRepository>
    ): Amplience.ContentRepository => ({
      id: 'repo-id-1',
      name: 'test-repository',
      label: 'Test Repository',
      status: 'ACTIVE' as Amplience.RepositoryStatus,
      contentTypes: [],
      ...overrides,
    });

    const createSuccessResult = (itemId: string): ItemCleanupResult => ({
      itemId,
      label: `Item ${itemId}`,
      unarchiveResult: { success: true },
      moveToDeletedResult: { success: true },
      clearKeyResult: { success: true },
      unpublishResult: { success: true },
      archiveResult: { success: true },
      overallSuccess: true,
    });

    const createFailureResult = (itemId: string, error: string): ItemCleanupResult => ({
      itemId,
      label: `Item ${itemId}`,
      unarchiveResult: { success: false, error },
      moveToDeletedResult: { success: false, error },
      clearKeyResult: { success: false, error },
      unpublishResult: { success: false, error },
      archiveResult: { success: false, error },
      overallSuccess: false,
    });

    describe('Full Archive Flow', () => {
      it('should successfully archive schemas with no dependencies', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema(), createMockSchema({ id: 'schema-id-2' })];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue([]),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.getContentTypesBySchemas).toHaveBeenCalledWith([
          schemas[0].schemaId,
          schemas[1].schemaId,
        ]);
        expect(mockAmplienceService.getContentItemsBySchemas).not.toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalledTimes(2);
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalledWith(
          schemas[0].id,
          schemas[0].version
        );
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalledWith(
          schemas[1].id,
          schemas[1].version
        );
      });

      it('should archive content types when schemas have dependencies', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [
          createMockContentType(),
          createMockContentType({ id: 'content-type-id-2' }),
        ];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.getContentItemsBySchemas).toHaveBeenCalledWith([
          schemas[0].schemaId,
        ]);
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalledTimes(2);
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalledWith(
          dependentContentTypes[0].id
        );
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalledWith(
          dependentContentTypes[1].id
        );
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalledTimes(1);
      });

      it('should archive non-hierarchical content items before content types', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const dependentContentItems = [
          createMockContentItem(),
          createMockContentItem({ id: 'item-id-2' }),
        ];
        const repository = createMockRepository();

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue(dependentContentItems),
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getContentItemsBy: vi.fn().mockResolvedValue({ allItems: dependentContentItems }),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );
        vi.mocked(archiveContentItem).mockResolvedValue(createSuccessResult('item-id-1'));

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.getRepositories).toHaveBeenCalled();
        expect(archiveContentItem).toHaveBeenCalledTimes(2);
        expect(archiveContentItem).toHaveBeenCalledWith(
          mockAmplienceService,
          dependentContentItems[0]
        );
        expect(archiveContentItem).toHaveBeenCalledWith(
          mockAmplienceService,
          dependentContentItems[1]
        );
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
      });

      it('should archive hierarchical content items using archiveContentItemWithDescendants', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const hierarchicalItem = createMockContentItem({
          id: 'hierarchical-item-1',
          hierarchy: {
            parentId: 'parent-id',
            root: false,
          },
        });
        const repository = createMockRepository();

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([hierarchicalItem]),
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [hierarchicalItem] }),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );
        vi.mocked(archiveContentItemWithDescendants).mockResolvedValue([
          {
            ...createSuccessResult('hierarchical-item-1'),
            hierarchyDetachResult: { success: true },
          },
        ]);

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(archiveContentItemWithDescendants).toHaveBeenCalledWith(
          mockAmplienceService,
          hierarchicalItem,
          repository.id
        );
        expect(archiveContentItem).not.toHaveBeenCalled();
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle errors when archiving content types fails', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
          archiveContentType: vi
            .fn()
            .mockResolvedValue({ success: false, error: 'Archive failed' }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to archive content type')
        );
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
      });

      it('should handle errors when archiving schemas fails', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue([]),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
          archiveSchema: vi
            .fn()
            .mockResolvedValue({ success: false, error: 'Schema archive failed' }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to archive schema')
        );
      });

      it('should handle errors when archiving content items fails', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const dependentContentItems = [createMockContentItem()];
        const repository = createMockRepository();

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue(dependentContentItems),
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getContentItemsBy: vi.fn().mockResolvedValue({ allItems: dependentContentItems }),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );
        vi.mocked(archiveContentItem).mockResolvedValue(
          createFailureResult('item-id-1', 'Item archive failed')
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(archiveContentItem).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to archive item')
        );
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
      });

      it('should handle errors when repository cannot be found for content item', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const dependentContentItems = [createMockContentItem()];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue(dependentContentItems),
          getRepositories: vi.fn().mockResolvedValue([]),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(mockAmplienceService.getRepositories).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Could not find repository for item')
        );
        expect(archiveContentItem).not.toHaveBeenCalled();
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
      });

      it('should handle errors when archiving hierarchical items fails', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const hierarchicalItem = createMockContentItem({
          id: 'hierarchical-item-1',
          hierarchy: {
            parentId: 'parent-id',
            root: false,
          },
        });
        const repository = createMockRepository();

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([hierarchicalItem]),
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getContentItemsBy: vi.fn().mockResolvedValue({ allItems: [hierarchicalItem] }),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );
        vi.mocked(archiveContentItemWithDescendants).mockResolvedValue([
          {
            ...createFailureResult('hierarchical-item-1', 'Hierarchy detach failed'),
            hierarchyDetachResult: { success: false, error: 'Hierarchy detach failed' },
          },
        ]);

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(archiveContentItemWithDescendants).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to archive hierarchical item')
        );
      });

      it('should handle exceptions during content item archiving and continue', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const dependentContentItems = [
          createMockContentItem({ id: 'item-1' }),
          createMockContentItem({ id: 'item-2' }),
        ];
        const repository = createMockRepository();

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue(dependentContentItems),
          getRepositories: vi.fn().mockResolvedValue([repository]),
          getContentItemsBy: vi.fn().mockResolvedValue({ allItems: dependentContentItems }),
          archiveContentType: vi.fn().mockResolvedValue({ success: true }),
          archiveSchema: vi.fn().mockResolvedValue({ success: true }),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );
        vi.mocked(archiveContentItem)
          .mockRejectedValueOnce(new Error('Unexpected error'))
          .mockResolvedValueOnce(createSuccessResult('item-2'));

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: false,
        });

        // Assert
        expect(archiveContentItem).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error archiving item item-1'),
          expect.any(Error)
        );
        expect(mockAmplienceService.archiveContentType).toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).toHaveBeenCalled();
      });

      it('should throw error when main operation fails', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockRejectedValue(new Error('API Error')),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act & Assert
        await expect(
          archiveContentTypeSchemas({
            hub,
            selectedSchemas: schemas,
            includeArchived: false,
            isDryRun: false,
          })
        ).rejects.toThrow('API Error');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error during archive operation'),
          expect.any(Error)
        );
      });
    });

    describe('Dry Run Mode', () => {
      it('should analyze dependencies without making changes in dry run mode', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [createMockContentType()];
        const dependentContentItems = [createMockContentItem()];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue(dependentContentItems),
          getRepositories: vi.fn(),
          archiveContentType: vi.fn(),
          archiveSchema: vi.fn(),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: true,
        });

        // Assert
        expect(mockAmplienceService.getContentTypesBySchemas).toHaveBeenCalled();
        expect(mockAmplienceService.getContentItemsBySchemas).toHaveBeenCalled();
        expect(mockAmplienceService.getRepositories).not.toHaveBeenCalled();
        expect(mockAmplienceService.archiveContentType).not.toHaveBeenCalled();
        expect(mockAmplienceService.archiveSchema).not.toHaveBeenCalled();
        expect(archiveContentItem).not.toHaveBeenCalled();
        expect(archiveContentItemWithDescendants).not.toHaveBeenCalled();
      });

      it('should report correct counts in dry run mode with no dependencies', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema(), createMockSchema({ id: 'schema-2' })];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue([]),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: true,
        });

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN RESULTS'));
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Schemas to archive: 2')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Dependent content types: 0')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Dependent content items: 0')
        );
      });

      it('should list dependent content types in dry run mode', async () => {
        // Arrange
        const hub = createMockHub();
        const schemas = [createMockSchema()];
        const dependentContentTypes = [
          createMockContentType({ hubContentTypeId: 'type-1' }),
          createMockContentType({ hubContentTypeId: 'type-2' }),
        ];

        const mockAmplienceService = {
          getContentTypesBySchemas: vi.fn().mockResolvedValue(dependentContentTypes),
          getContentItemsBySchemas: vi.fn().mockResolvedValue([]),
        };

        vi.mocked(AmplienceService).mockImplementation(
          () => mockAmplienceService as unknown as AmplienceService
        );

        // Act
        await archiveContentTypeSchemas({
          hub,
          selectedSchemas: schemas,
          includeArchived: false,
          isDryRun: true,
        });

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Content types that would be archived')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('type-1'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('type-2'));
      });
    });
  });
});
