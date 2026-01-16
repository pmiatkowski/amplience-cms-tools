import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmplienceService } from '~/services/amplience-service';
import { type BulkUpdateVisualizationsResult } from '~/utils';
import { bulkUpdateContentTypeVisualizations, BulkUpdateVisualizationsContext } from './bulk-update-content-type-visualizations';

describe('bulkUpdateContentTypeVisualizations', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('action function signature and context object structure', () => {
    it('should accept context object with required properties', async () => {
      const mockService = {
        updateContentType: vi.fn(),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Test Content Type',
            visualizations: [
              { label: 'Old Viz', templatedUri: '{{ORIGIN_REPLACE}}/old' },
            ],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'New Viz', templatedUri: '{{ORIGIN_REPLACE}}/new' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      // This test verifies the types compile correctly
      expect(context.service).toBeDefined();
      expect(context.contentTypes).toEqual(mockContentTypes);
      expect(context.visualizationConfig).toEqual(mockVisualizationConfig);
      expect(context.hubVisualizationUrl).toBe('https://vse.example.com');
      expect(context.isDryRun).toBe(false);
    });

    it('should return result with success and failure counts', async () => {
      const result: BulkUpdateVisualizationsResult = {
        totalAttempted: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      };

      // This test verifies the result type structure
      expect(result.totalAttempted).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty content types array', async () => {
      const mockService = {} as unknown as AmplienceService;
      const mockVisualizationConfig = { visualizations: [] };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: [],
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);
      expect(result.totalAttempted).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should support dry-run mode in context', () => {
      const mockService = {} as unknown as AmplienceService;
      const mockVisualizationConfig = { visualizations: [] };

      const dryRunContext: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: [],
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: true,
      };

      expect(dryRunContext.isDryRun).toBe(true);
    });
  });

  describe('PATCH request formatting', () => {
    it('should format PATCH request with correct content type URI', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Test Content Type',
            visualizations: [],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      await bulkUpdateContentTypeVisualizations(context);

      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          contentTypeUri: 'https://schema.example.com/test.json',
        })
      );
    });

    it('should format PATCH request with updated visualizations array', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Test Content Type',
            visualizations: [],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
            default: true,
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}',
          },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      await bulkUpdateContentTypeVisualizations(context);

      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            visualizations: [
              {
                label: 'Preview',
                templatedUri: 'https://vse.example.com/preview?id={{contentItemId}}',
                default: true,
              },
              {
                label: 'Live View',
                templatedUri: 'https://vse.example.com/live?id={{contentItemId}}',
              },
            ],
          }),
        })
      );
    });

    it('should preserve existing settings when updating visualizations', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Test Content Type',
            icons: [
              { size: 16, url: 'https://example.com/icon16.png' },
              { size: 32, url: 'https://example.com/icon32.png' },
            ],
            visualizations: [],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      await bulkUpdateContentTypeVisualizations(context);

      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            label: 'Test Content Type',
            icons: [
              { size: 16, url: 'https://example.com/icon16.png' },
              { size: 32, url: 'https://example.com/icon32.png' },
            ],
            visualizations: [
              { label: 'Preview', templatedUri: 'https://vse.example.com/preview' },
            ],
          }),
        })
      );
    });

    it('should handle content type without existing settings', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      await bulkUpdateContentTypeVisualizations(context);

      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          contentTypeUri: 'https://schema.example.com/test.json',
          settings: expect.objectContaining({
            visualizations: [
              { label: 'Preview', templatedUri: 'https://vse.example.com/preview' },
            ],
          }),
        })
      );
    });
  });

  describe('error collection during partial failures', () => {
    it('should collect errors and continue processing when update fails', async () => {
      const mockService = {
        updateContentType: vi.fn()
          .mockResolvedValueOnce({ success: true })
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test1.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 1', visualizations: [] },
        },
        {
          id: 'ct-2',
          hubContentTypeId: 'hub-ct-2',
          contentTypeUri: 'https://schema.example.com/test2.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 2', visualizations: [] },
        },
        {
          id: 'ct-3',
          hubContentTypeId: 'hub-ct-3',
          contentTypeUri: 'https://schema.example.com/test3.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 3', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        contentTypeId: 'ct-2',
        contentTypeLabel: 'CT 2',
        error: 'Network error',
      });
    });

    it('should collect errors with service error response', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({
          success: false,
          error: 'Conflict: Version mismatch',
        }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Test Content Type', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toEqual({
        contentTypeId: 'ct-1',
        contentTypeLabel: 'Test Content Type',
        error: 'Conflict: Version mismatch',
      });
    });

    it('should use contentTypeUri as label when label is not present', async () => {
      const mockService = {
        updateContentType: vi.fn().mockRejectedValue(new Error('Not found')),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.errors[0].contentTypeLabel).toBe('https://schema.example.com/test.json');
    });

    it('should handle all updates failing', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({
          success: false,
          error: 'Unauthorized',
        }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test1.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 1', visualizations: [] },
        },
        {
          id: 'ct-2',
          hubContentTypeId: 'hub-ct-2',
          contentTypeUri: 'https://schema.example.com/test2.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 2', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(2);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('Unauthorized');
      expect(result.errors[1].error).toBe('Unauthorized');
    });

    it('should include contentTypeId in error object', async () => {
      const mockService = {
        updateContentType: vi.fn().mockRejectedValue(new Error('API Error')),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'specific-ct-id',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Test Content Type', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.errors[0].contentTypeId).toBe('specific-ct-id');
      expect(result.errors[0].contentTypeLabel).toBe('Test Content Type');
      expect(result.errors[0].error).toBe('API Error');
    });
  });

  describe('progress tracking integration', () => {
    it('should track progress through all content types', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test1.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 1', visualizations: [] },
        },
        {
          id: 'ct-2',
          hubContentTypeId: 'hub-ct-2',
          contentTypeUri: 'https://schema.example.com/test2.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 2', visualizations: [] },
        },
        {
          id: 'ct-3',
          hubContentTypeId: 'hub-ct-3',
          contentTypeUri: 'https://schema.example.com/test3.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'CT 3', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockService.updateContentType).toHaveBeenCalledTimes(3);
    });

    it('should handle dry-run mode with progress tracking', async () => {
      const mockService = {
        updateContentType: vi.fn(),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Test Content Type', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: true,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockService.updateContentType).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DRY RUN]')
      );
    });
  });

  describe('integration tests with AmplienceService mocks', () => {
    it('should complete bulk update with multiple content types and visualizations', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/product.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Product',
            icons: [
              { size: 16, url: 'https://example.com/product-icon16.png' },
            ],
            visualizations: [],
          },
        },
        {
          id: 'ct-2',
          hubContentTypeId: 'hub-ct-2',
          contentTypeUri: 'https://schema.example.com/category.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Category',
            visualizations: [],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          {
            label: 'Product Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/product/preview?id={{contentItemId}}',
            default: true,
          },
          {
            label: 'Live Product',
            templatedUri: '{{ORIGIN_REPLACE}}/product/live?id={{contentItemId}}&locale=en',
          },
          {
            label: 'Staging View',
            templatedUri: '{{ORIGIN_REPLACE}}/staging/view?id={{contentItemId}}',
          },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.production.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify first content type update
      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          contentTypeUri: 'https://schema.example.com/product.json',
          settings: expect.objectContaining({
            label: 'Product',
            icons: [
              { size: 16, url: 'https://example.com/product-icon16.png' },
            ],
            visualizations: [
              {
                label: 'Product Preview',
                templatedUri: 'https://vse.production.com/product/preview?id={{contentItemId}}',
                default: true,
              },
              {
                label: 'Live Product',
                templatedUri: 'https://vse.production.com/product/live?id={{contentItemId}}&locale=en',
              },
              {
                label: 'Staging View',
                templatedUri: 'https://vse.production.com/staging/view?id={{contentItemId}}',
              },
            ],
          }),
        })
      );
    });

    it('should handle mixed success and failure scenarios realistically', async () => {
      const mockService = {
        updateContentType: vi.fn()
          .mockResolvedValueOnce({ success: true })
          .mockResolvedValueOnce({
            success: false,
            error: 'API Error: 409 Conflict - Content type version mismatch',
          })
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValueOnce({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/type1.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Type 1', visualizations: [] },
        },
        {
          id: 'ct-2',
          hubContentTypeId: 'hub-ct-2',
          contentTypeUri: 'https://schema.example.com/type2.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Type 2', visualizations: [] },
        },
        {
          id: 'ct-3',
          hubContentTypeId: 'hub-ct-3',
          contentTypeUri: 'https://schema.example.com/type3.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Type 3', visualizations: [] },
        },
        {
          id: 'ct-4',
          hubContentTypeId: 'hub-ct-4',
          contentTypeUri: 'https://schema.example.com/type4.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Type 4', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(4);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].contentTypeId).toBe('ct-2');
      expect(result.errors[0].error).toBe('API Error: 409 Conflict - Content type version mismatch');
      expect(result.errors[1].contentTypeId).toBe('ct-3');
      expect(result.errors[1].error).toBe('Network timeout');
    });

    it('should handle empty visualization config', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: {
            label: 'Test Content Type',
            visualizations: [
              { label: 'Old Viz', templatedUri: '{{ORIGIN_REPLACE}}/old' },
            ],
          },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.succeeded).toBe(1);
      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            visualizations: [],
          }),
        })
      );
    });

    it('should handle complex template variables in URLs', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct-1',
          hubContentTypeId: 'hub-ct-1',
          contentTypeUri: 'https://schema.example.com/test.json',
          status: 'ACTIVE' as Amplience.ContentTypeStatus,
          settings: { label: 'Test Content Type', visualizations: [] },
        },
      ];

      const mockVisualizationConfig = {
        visualizations: [
          {
            label: 'Preview with Params',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}&locale={{locale}}&version={{version}}',
            default: true,
          },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.production.example.com',
        isDryRun: false,
      };

      await bulkUpdateContentTypeVisualizations(context);

      expect(mockService.updateContentType).toHaveBeenCalledWith(
        'ct-1',
        expect.objectContaining({
          settings: expect.objectContaining({
            visualizations: [
              {
                label: 'Preview with Params',
                templatedUri: 'https://vse.production.example.com/preview?id={{contentItemId}}&locale={{locale}}&version={{version}}',
                default: true,
              },
            ],
          }),
        })
      );
    });

    it('should handle large batch of content types efficiently', async () => {
      const mockService = {
        updateContentType: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as AmplienceService;

      const mockContentTypes: Amplience.ContentType[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ct-${i}`,
        hubContentTypeId: `hub-ct-${i}`,
        contentTypeUri: `https://schema.example.com/type${i}.json`,
        status: 'ACTIVE' as Amplience.ContentTypeStatus,
        settings: {
          label: `Content Type ${i}`,
          visualizations: [],
        },
      }));

      const mockVisualizationConfig = {
        visualizations: [
          { label: 'Preview', templatedUri: '{{ORIGIN_REPLACE}}/preview' },
        ],
      };

      const context: BulkUpdateVisualizationsContext = {
        service: mockService,
        contentTypes: mockContentTypes,
        visualizationConfig: mockVisualizationConfig,
        hubVisualizationUrl: 'https://vse.example.com',
        isDryRun: false,
      };

      const result = await bulkUpdateContentTypeVisualizations(context);

      expect(result.totalAttempted).toBe(50);
      expect(result.succeeded).toBe(50);
      expect(result.failed).toBe(0);
      expect(mockService.updateContentType).toHaveBeenCalledTimes(50);
    });
  });
});
