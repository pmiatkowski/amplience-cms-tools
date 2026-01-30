import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as appConfig from '~/app-config';
import * as prompts from '~/prompts';
import { AmplienceService, ContentTypeService } from '~/services';
import * as utils from '~/utils';
import { copyContentTypeSchemas } from '../copy-content-type-schemas';
import { runCopyContentTypes } from './copy-content-types';
import * as commandPrompts from './prompts';

// Mock all external dependencies
vi.mock('~/app-config');
vi.mock('~/prompts');
vi.mock('./prompts');
vi.mock('~/services');
vi.mock('~/utils');
vi.mock('../copy-content-type-schemas');
vi.mock('dotenv', () => {
  const config = vi.fn();

  return {
    default: { config },
    config,
  };
});

describe('runCopyContentTypes', () => {
  // Mock console methods - these will persist across tests
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  // Setup console spies once before all tests
  beforeAll(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  // Clean up console spies after all tests
  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  // Mock data
  const mockSourceHub: Amplience.HubConfig = {
    name: 'source-hub',
    envKey: 'SOURCE_HUB',
    hubId: 'source-hub-id',
    clientId: 'source-client-id',
    clientSecret: 'source-client-secret',
  };

  const mockTargetHub: Amplience.HubConfig = {
    name: 'target-hub',
    envKey: 'TARGET_HUB',
    hubId: 'target-hub-id',
    clientId: 'target-client-id',
    clientSecret: 'target-client-secret',
  };

  const mockContentType: Amplience.ContentType = {
    id: 'ct-123',
    contentTypeUri: 'https://schema.example.com/test-type.json',
    hubContentTypeId: 'hub-ct-123',
    status: 'ACTIVE' as Amplience.ContentTypeStatus,
    settings: {
      label: 'Test Content Type',
      icons: [],
      visualizations: [],
    },
  };

  const mockRepository: Amplience.ContentRepository = {
    id: 'repo-123',
    name: 'test-repo',
    label: 'Test Repository',
    status: 'ACTIVE' as Amplience.RepositoryStatus,
    contentTypes: [],
  };

  type MockProgressBar = {
    increment: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };

  type MockAmplienceService = {
    getRepositories: ReturnType<typeof vi.fn>;
    createContentType: ReturnType<typeof vi.fn>;
    assignContentTypeToRepository: ReturnType<typeof vi.fn>;
  };

  type MockContentTypeService = {
    getMissingContentTypes: ReturnType<typeof vi.fn>;
    validateSchemas: ReturnType<typeof vi.fn>;
    generateAutomaticRepositoryMap: ReturnType<typeof vi.fn>;
  };

  let mockProgressBar: MockProgressBar;
  let mockSourceService: MockAmplienceService;
  let mockTargetService: MockAmplienceService;
  let mockContentTypeService: MockContentTypeService;

  beforeEach(() => {
    // Reset only non-console mocks
    mockProgressBar = {
      increment: vi.fn(),
      stop: vi.fn(),
    };
    vi.mocked(utils.createProgressBar).mockReturnValue(
      mockProgressBar as unknown as ReturnType<typeof utils.createProgressBar>
    );

    // Setup service mocks
    mockSourceService = {
      getRepositories: vi.fn().mockResolvedValue([]),
      createContentType: vi.fn(),
      assignContentTypeToRepository: vi.fn(),
    };

    mockTargetService = {
      getRepositories: vi.fn().mockResolvedValue([mockRepository]),
      createContentType: vi.fn().mockResolvedValue(mockContentType),
      assignContentTypeToRepository: vi.fn().mockResolvedValue(undefined),
    };

    mockContentTypeService = {
      getMissingContentTypes: vi.fn().mockResolvedValue([mockContentType]),
      validateSchemas: vi.fn().mockResolvedValue({
        validContentTypes: [mockContentType],
        missingSchemas: [],
        invalidSchemas: [],
      }),
      generateAutomaticRepositoryMap: vi
        .fn()
        .mockResolvedValue(new Map([[mockContentType.id, [mockRepository]]])),
    };

    vi.mocked(AmplienceService).mockImplementation((hub: Amplience.HubConfig) => {
      return (hub.hubId === mockSourceHub.hubId
        ? mockSourceService
        : mockTargetService) as unknown as AmplienceService;
    });

    vi.mocked(ContentTypeService).mockImplementation(
      () => mockContentTypeService as unknown as ContentTypeService
    );
  });

  afterEach(() => {
    // Clear console spy call history for next test
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();

    // Restore only non-console mocks
    vi.mocked(appConfig.getHubConfigs).mockClear();
    vi.mocked(prompts.promptForHub).mockClear();
    vi.mocked(prompts.promptForSchemaIdFilter).mockClear();
    vi.mocked(prompts.promptForValidateSchemas).mockClear();
    vi.mocked(prompts.promptForConfirmation).mockClear();
    vi.mocked(commandPrompts.promptForContentTypesToSync).mockClear();
    vi.mocked(commandPrompts.promptForRepositoryStrategy).mockClear();
    vi.mocked(commandPrompts.promptForRepositoryMapping).mockClear();
    vi.mocked(copyContentTypeSchemas).mockClear();
  });

  describe('Hub Configuration', () => {
    it('should exit early when no hub configurations are found', async () => {
      // Arrange
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'No hub configurations found. Please check your .env file.'
      );
      expect(prompts.promptForHub).not.toHaveBeenCalled();
    });

    it('should exit early when source and target hubs are the same', async () => {
      // Arrange
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockSourceHub);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Source and target hubs cannot be the same.');
    });

    it('should prompt for source and target hubs', async () => {
      // Arrange
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(prompts.promptForHub).toHaveBeenCalledTimes(2);
    });
  });

  describe('Schema Synchronization', () => {
    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
    });

    it('should run schema sync when user confirms', async () => {
      // Arrange
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(true);
      vi.mocked(copyContentTypeSchemas).mockResolvedValue({
        success: true,
        processedSchemas: [],
        failedSchemas: [],
        totalCount: 0,
      });
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(copyContentTypeSchemas).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Content type schema copy completed.');
    });

    it('should skip schema sync when user declines', async () => {
      // Arrange
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(copyContentTypeSchemas).not.toHaveBeenCalled();
    });

    it('should prompt to continue when schema sync fails', async () => {
      // Arrange
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(true);
      vi.mocked(copyContentTypeSchemas).mockRejectedValue(new Error('Schema sync failed'));
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(false);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(prompts.promptForConfirmation).toHaveBeenCalledWith(
        'Continue with content type sync anyway?'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('Operation cancelled.');
    });
  });

  describe('Missing Content Types Detection', () => {
    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
    });

    it('should exit early when no missing content types are found', async () => {
      // Arrange
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ All content types are already synchronized. No action needed.'
      );
    });

    it('should display list of missing content types', async () => {
      // Arrange
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('Found 1 content types to sync:');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        `  • ${mockContentType.settings?.label} (${mockContentType.contentTypeUri})`
      );
    });

    it('should exit when no content types are selected', async () => {
      // Arrange
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(prompts.promptForSchemaIdFilter).mockResolvedValue('');
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'No content types selected. Operation cancelled.'
      );
    });
  });

  describe('Schema ID Filtering', () => {
    const secondContentType: Amplience.ContentType = {
      id: 'ct-456',
      contentTypeUri: 'https://schema.example.com/other-type.json',
      hubContentTypeId: 'hub-ct-456',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: {
        label: 'Other Content Type',
        icons: [],
        visualizations: [],
      },
    };

    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
    });

    afterEach(() => {
      delete process.env.AMP_DEFAULT_SCHEMA_ID;
    });

    it('should filter content types by schema ID pattern', async () => {
      // Arrange
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([
        mockContentType,
        secondContentType,
      ]);
      vi.mocked(prompts.promptForSchemaIdFilter).mockResolvedValue('test-type');
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('Filtered to 1 of 2 content types');
      expect(commandPrompts.promptForContentTypesToSync).toHaveBeenCalledWith([mockContentType]);
    });

    it('should skip filtering when input is empty', async () => {
      // Arrange
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([
        mockContentType,
        secondContentType,
      ]);
      vi.mocked(prompts.promptForSchemaIdFilter).mockResolvedValue('');
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(commandPrompts.promptForContentTypesToSync).toHaveBeenCalledWith([
        mockContentType,
        secondContentType,
      ]);
      expect(consoleSpy.log).not.toHaveBeenCalledWith(expect.stringContaining('Filtered to'));
    });

    it('should pass AMP_DEFAULT_SCHEMA_ID as default to the prompt', async () => {
      // Arrange
      process.env.AMP_DEFAULT_SCHEMA_ID = 'https://schema.example.com/.*';
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(prompts.promptForSchemaIdFilter).mockResolvedValue('');
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(prompts.promptForSchemaIdFilter).toHaveBeenCalledWith({
        defaultValue: 'https://schema.example.com/.*',
      });
    });
  });

  describe('Schema Validation', () => {
    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([mockContentType]);
    });

    it('should handle missing schemas and prompt for sync', async () => {
      // Arrange
      mockContentTypeService.validateSchemas.mockResolvedValue({
        validContentTypes: [],
        missingSchemas: ['https://schema.example.com/test-type.json'],
        invalidSchemas: [],
      });
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(false);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('\n⚠️  Missing schemas detected:');
      expect(prompts.promptForConfirmation).toHaveBeenCalledWith(
        'Some content types have missing schemas. Would you like to sync only the missing schemas?'
      );
    });

    it('should sync missing schemas when user confirms', async () => {
      // Arrange
      // Mock setTimeout to avoid actual delay
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(((cb: () => void) => {
        cb();

        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

      mockContentTypeService.validateSchemas
        .mockResolvedValueOnce({
          validContentTypes: [],
          missingSchemas: ['https://schema.example.com/test-type.json'],
          invalidSchemas: [],
        })
        .mockResolvedValueOnce({
          validContentTypes: [mockContentType],
          missingSchemas: [],
          invalidSchemas: [],
        });
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);
      vi.mocked(copyContentTypeSchemas).mockResolvedValue({
        success: true,
        processedSchemas: ['test-schema'],
        failedSchemas: [],
        totalCount: 1,
      });
      mockContentTypeService.getMissingContentTypes
        .mockResolvedValueOnce([mockContentType])
        .mockResolvedValueOnce([]); // All content types created during schema sync
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('automatic');

      // Act
      await runCopyContentTypes();

      // Assert
      expect(copyContentTypeSchemas).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Missing schemas sync completed.');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ 1 content type(s) were automatically created during schema sync.'
      );

      // Restore setTimeout
      setTimeoutSpy.mockRestore();
    });

    it('should display invalid schemas and handle empty valid content types', async () => {
      // Arrange
      // Mock the selected content types to include one with invalid schema
      const invalidContentType: Amplience.ContentType = {
        ...mockContentType,
        contentTypeUri: 'https://schema.example.com/invalid.json',
      };
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([invalidContentType]);
      mockContentTypeService.validateSchemas.mockResolvedValue({
        validContentTypes: [], // No valid content types after validation
        missingSchemas: [],
        invalidSchemas: ['https://schema.example.com/invalid.json'],
      });
      mockContentTypeService.generateAutomaticRepositoryMap.mockResolvedValue(new Map());
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('automatic');
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '\n❌ Invalid schemas detected (not suitable for content type use):'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('  • https://schema.example.com/invalid.json');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'These content types will be skipped as their schemas cannot be used for content types.'
      );
      // Note: The function continues with selectedContentTypes unchanged when there are only invalid schemas
      // This may result in errors later when trying to create content types with invalid schemas
    });
  });

  describe('Repository Mapping', () => {
    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([mockContentType]);
      mockContentTypeService.validateSchemas.mockResolvedValue({
        validContentTypes: [mockContentType],
        missingSchemas: [],
        invalidSchemas: [],
      });
    });

    it('should use automatic repository mapping when user confirms', async () => {
      // Arrange
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('automatic');
      vi.mocked(prompts.promptForConfirmation)
        .mockResolvedValueOnce(true) // Accept automatic mapping
        .mockResolvedValueOnce(true); // Confirm sync plan

      // Act
      await runCopyContentTypes();

      // Assert
      expect(mockContentTypeService.generateAutomaticRepositoryMap).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('\n📋 Proposed automatic mapping:');
    });

    it('should switch to manual mapping when automatic is rejected', async () => {
      // Arrange
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('automatic');
      vi.mocked(prompts.promptForConfirmation)
        .mockResolvedValueOnce(false) // Reject automatic mapping
        .mockResolvedValueOnce(false); // Cancel sync plan
      vi.mocked(commandPrompts.promptForRepositoryMapping).mockResolvedValue([mockRepository]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Automatic mapping rejected. Switching to manual mapping.'
      );
      expect(commandPrompts.promptForRepositoryMapping).toHaveBeenCalled();
    });

    it('should use manual repository mapping', async () => {
      // Arrange
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('manual');
      vi.mocked(commandPrompts.promptForRepositoryMapping).mockResolvedValue([mockRepository]);
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(false);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('\n🎯 Manual repository mapping:');
      expect(commandPrompts.promptForRepositoryMapping).toHaveBeenCalledWith(mockContentType, [
        mockRepository,
      ]);
    });

    it('should exit when target hub has no repositories', async () => {
      // Arrange
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('manual');
      mockTargetService.getRepositories.mockResolvedValue([]);

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('No repositories found in the target hub.');
    });
  });

  describe('Sync Plan Execution', () => {
    beforeEach(() => {
      vi.mocked(appConfig.getHubConfigs).mockReturnValue([mockSourceHub, mockTargetHub]);
      vi.mocked(prompts.promptForHub)
        .mockResolvedValueOnce(mockSourceHub)
        .mockResolvedValueOnce(mockTargetHub);
      vi.mocked(prompts.promptForValidateSchemas).mockResolvedValue(false);
      mockContentTypeService.getMissingContentTypes.mockResolvedValue([mockContentType]);
      vi.mocked(commandPrompts.promptForContentTypesToSync).mockResolvedValue([mockContentType]);
      mockContentTypeService.validateSchemas.mockResolvedValue({
        validContentTypes: [mockContentType],
        missingSchemas: [],
        invalidSchemas: [],
      });
      vi.mocked(commandPrompts.promptForRepositoryStrategy).mockResolvedValue('automatic');
      vi.mocked(prompts.promptForConfirmation)
        .mockResolvedValueOnce(true) // Accept automatic mapping
        .mockResolvedValueOnce(true); // Confirm sync plan
    });

    it('should exit when sync plan is not confirmed', async () => {
      // Arrange
      // Clear and reset the confirmation mock set in beforeEach
      vi.mocked(prompts.promptForConfirmation).mockReset();
      vi.mocked(prompts.promptForConfirmation)
        .mockResolvedValueOnce(true) // Accept automatic mapping
        .mockResolvedValueOnce(false); // Reject sync plan

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('Operation cancelled.');
      expect(mockTargetService.createContentType).not.toHaveBeenCalled();
    });

    it('should successfully create content type and assign to repositories', async () => {
      // Act
      await runCopyContentTypes();

      // Assert
      expect(mockTargetService.createContentType).toHaveBeenCalledWith(mockTargetHub.hubId, {
        contentTypeUri: mockContentType.contentTypeUri,
        settings: mockContentType.settings,
      });
      expect(mockTargetService.assignContentTypeToRepository).toHaveBeenCalledWith(
        mockRepository.id,
        mockContentType.id
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('\n✅ Sync operation completed!');
    });

    it('should handle content type creation failure', async () => {
      // Arrange
      mockTargetService.createContentType.mockRejectedValue(new Error('Creation failed'));

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('\n❌ Detailed Error Report:');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Failed to create'));
    });

    it('should handle repository assignment failure', async () => {
      // Arrange
      mockTargetService.assignContentTypeToRepository.mockRejectedValue(
        new Error('Assignment failed')
      );

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('\n❌ Detailed Error Report:');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Assignment failures'));
    });

    it('should display results summary', async () => {
      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('\nResults Summary:');
      expect(consoleSpy.log).toHaveBeenCalledWith('• Content types created: 1');
      expect(consoleSpy.log).toHaveBeenCalledWith('• Content types failed: 0');
      expect(consoleSpy.log).toHaveBeenCalledWith('• Repository assignments successful: 1');
      expect(consoleSpy.log).toHaveBeenCalledWith('• Repository assignments failed: 0');
    });

    it('should cancel when no repositories are assigned', async () => {
      // Arrange
      mockContentTypeService.generateAutomaticRepositoryMap.mockResolvedValue(
        new Map([[mockContentType.id, []]])
      );
      vi.mocked(prompts.promptForConfirmation).mockResolvedValue(true); // Accept automatic mapping

      // Act
      await runCopyContentTypes();

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'No content types have target repositories assigned. Operation cancelled.'
      );
      expect(mockTargetService.createContentType).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display fatal errors', async () => {
      // Arrange
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(appConfig.getHubConfigs).mockImplementationOnce(() => {
        throw new Error('Fatal error');
      });

      // Act
      await runCopyContentTypes();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('\n💥 Fatal error:', 'Fatal error');
      errorSpy.mockRestore();
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(appConfig.getHubConfigs).mockImplementationOnce(() => {
        throw 'String error';
      });

      // Act
      await runCopyContentTypes();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('\n💥 Fatal error:', 'Unknown error');
      errorSpy.mockRestore();
    });
  });
});
