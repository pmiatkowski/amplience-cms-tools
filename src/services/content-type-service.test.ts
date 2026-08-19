import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmplienceService } from './amplience-service';
import { ContentTypeService } from './content-type-service';

describe('ContentTypeService', () => {
  let contentTypeService: ContentTypeService;
  let mockSourceHub: AmplienceService;
  let mockTargetHub: AmplienceService;

  beforeEach(() => {
    contentTypeService = new ContentTypeService();
    mockSourceHub = new AmplienceService({
      name: 'Source Hub',
      envKey: 'SOURCE_HUB',
      hubId: 'source-hub-id',
      clientId: 'source-client-id',
      clientSecret: 'source-client-secret',
    });
    mockTargetHub = new AmplienceService({
      name: 'Target Hub',
      envKey: 'TARGET_HUB',
      hubId: 'target-hub-id',
      clientId: 'target-client-id',
      clientSecret: 'target-client-secret',
    });

    // Mock the methods we need
    vi.spyOn(mockSourceHub, 'getAllContentTypes');
    vi.spyOn(mockTargetHub, 'getAllContentTypes');
    vi.spyOn(mockTargetHub, 'getAllSchemas');
    vi.spyOn(mockSourceHub, 'getRepositories');
    vi.spyOn(mockTargetHub, 'getRepositories');
  });

  describe('getMissingContentTypes', () => {
    it('should return content types present in source but missing in target', async () => {
      const sourceContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct1',
          hubContentTypeId: 'hct1',
          contentTypeUri: 'https://schema1.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
        {
          id: 'ct2',
          hubContentTypeId: 'hct2',
          contentTypeUri: 'https://schema2.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
        {
          id: 'ct3',
          hubContentTypeId: 'hct3',
          contentTypeUri: 'https://schema3.json',
          status: 'ARCHIVED',
        } as Amplience.ContentType,
      ];

      const targetContentTypes: Amplience.ContentType[] = [
        {
          id: 'ct4',
          hubContentTypeId: 'hct4',
          contentTypeUri: 'https://schema1.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
      ];

      vi.mocked(mockSourceHub.getAllContentTypes).mockResolvedValue(sourceContentTypes);
      vi.mocked(mockTargetHub.getAllContentTypes).mockResolvedValue(targetContentTypes);

      const result = await contentTypeService.getMissingContentTypes(mockSourceHub, mockTargetHub);

      expect(result).toHaveLength(1);
      expect(result[0].contentTypeUri).toBe('https://schema2.json');
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should return empty array when no content types are missing', async () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          id: 'ct1',
          hubContentTypeId: 'hct1',
          contentTypeUri: 'https://schema1.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
      ];

      vi.mocked(mockSourceHub.getAllContentTypes).mockResolvedValue(contentTypes);
      vi.mocked(mockTargetHub.getAllContentTypes).mockResolvedValue(contentTypes);

      const result = await contentTypeService.getMissingContentTypes(mockSourceHub, mockTargetHub);

      expect(result).toHaveLength(0);
    });
  });

  describe('buildSyncPlan', () => {
    const sourceType = {
      contentTypeUri: 'https://schema.example.com/article.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: {
        label: 'Article',
        icons: [{ size: 256, url: 'https://assets.example.com/article.png' }],
        visualizations: [],
        cards: [],
      },
      repositories: ['Content', 'Website'],
    };

    it('plans creation for a source type missing from the target', () => {
      const plan = contentTypeService.buildSyncPlan([sourceType], [], 'exact');

      expect(plan.items).toHaveLength(1);
      expect(plan.items[0]).toMatchObject({
        contentTypeUri: sourceType.contentTypeUri,
        actions: ['CREATE', 'ASSIGN'],
        repositoriesToAssign: ['Content', 'Website'],
        repositoriesToUnassign: [],
      });
    });

    it('plans settings update and unarchive for an archived target match', () => {
      const targetType = {
        ...sourceType,
        id: 'target-type-id',
        status: 'ARCHIVED' as Amplience.ContentTypeStatus,
        settings: { ...sourceType.settings, label: 'Old article label' },
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetType], 'exact');

      expect(plan.items[0]).toMatchObject({
        contentTypeUri: sourceType.contentTypeUri,
        targetContentTypeId: 'target-type-id',
        actions: ['UNARCHIVE', 'UPDATE_SETTINGS'],
      });
    });

    it('records exact field-level settings changes with target and source values', () => {
      const targetType = {
        ...sourceType,
        id: 'target-type-id',
        settings: {
          label: 'Old Article',
          icons: [{ size: 128, url: 'https://assets.example.com/old-article.png' }],
          visualizations: [
            {
              label: 'Old Preview',
              templatedUri: 'https://preview.example.com/old/{{contentItemId}}',
            },
          ],
          cards: [],
        },
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetType], 'exact');

      expect(plan.items[0].settingsChanges).toEqual([
        {
          setting: 'label',
          currentTargetValue: 'Old Article',
          plannedTargetValue: 'Article',
        },
        {
          setting: 'icons',
          currentTargetValue: [{ size: 128, url: 'https://assets.example.com/old-article.png' }],
          plannedTargetValue: [{ size: 256, url: 'https://assets.example.com/article.png' }],
        },
        {
          setting: 'visualizations',
          currentTargetValue: [
            {
              label: 'Old Preview',
              templatedUri: 'https://preview.example.com/old/{{contentItemId}}',
            },
          ],
          plannedTargetValue: [],
        },
      ]);
    });

    it('marks equivalent definitions as unchanged regardless of repository order', () => {
      const targetType = {
        ...sourceType,
        id: 'target-type-id',
        repositories: ['Website', 'Content'],
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetType], 'exact');

      expect(plan.items[0].actions).toEqual(['NO_CHANGE']);
    });

    it('leaves target-only content types outside the plan', () => {
      const targetOnlyType = {
        ...sourceType,
        id: 'target-only-id',
        contentTypeUri: 'https://schema.example.com/target-only.json',
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetOnlyType], 'exact');

      expect(plan.items).toHaveLength(1);
      expect(plan.items[0].contentTypeUri).toBe(sourceType.contentTypeUri);
    });

    it('preserves target-only assignments in additive mode', () => {
      const targetType = {
        ...sourceType,
        id: 'target-type-id',
        repositories: ['Content', 'Target Only'],
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetType], 'additive');

      expect(plan.items[0]).toMatchObject({
        actions: ['ASSIGN'],
        desiredRepositories: ['Content', 'Target Only', 'Website'],
        repositoriesToAssign: ['Website'],
        repositoriesToUnassign: [],
      });
    });

    it('removes target-only assignments in exact mode', () => {
      const targetType = {
        ...sourceType,
        id: 'target-type-id',
        repositories: ['Content', 'Target Only'],
      };

      const plan = contentTypeService.buildSyncPlan([sourceType], [targetType], 'exact');

      expect(plan.items[0]).toMatchObject({
        actions: ['ASSIGN', 'UNASSIGN'],
        desiredRepositories: ['Content', 'Website'],
        repositoriesToAssign: ['Website'],
        repositoriesToUnassign: ['Target Only'],
      });
    });
  });

  describe('rewriteVisualizationOrigins', () => {
    it('replaces the configured source origin and preserves the template path and query', () => {
      const definition = {
        contentTypeUri: 'https://schema.example.com/article.json',
        settings: {
          label: 'Article',
          visualizations: [
            {
              label: 'Preview',
              templatedUri:
                'https://vse.dev.example.com/preview?id={{contentItemId}}&locale={{locale}}',
              default: true,
            },
          ],
        },
      };

      const result = contentTypeService.rewriteVisualizationOrigins(
        definition,
        'https://vse.dev.example.com',
        'https://vse.prod.example.com'
      );

      expect(result.settings?.visualizations?.[0].templatedUri).toBe(
        'https://vse.prod.example.com/preview?id={{contentItemId}}&locale={{locale}}'
      );
      expect(definition.settings.visualizations[0].templatedUri).toContain('vse.dev.example.com');
    });

    it('does not replace third-party or prefix-collision origins', () => {
      const definition = {
        contentTypeUri: 'https://schema.example.com/article.json',
        settings: {
          visualizations: [
            {
              label: 'Third party',
              templatedUri: 'https://preview.vendor.example/view/{{contentItemId}}',
            },
            {
              label: 'Prefix collision',
              templatedUri: 'https://vse.dev.example.com.evil/view/{{contentItemId}}',
            },
          ],
        },
      };

      const result = contentTypeService.rewriteVisualizationOrigins(
        definition,
        'https://vse.dev.example.com',
        'https://vse.prod.example.com'
      );

      expect(result.settings?.visualizations).toEqual(definition.settings.visualizations);
    });

    it('rejects an invalid configured visualization origin', () => {
      const definition = {
        contentTypeUri: 'https://schema.example.com/article.json',
        settings: { visualizations: [] },
      };

      expect(() =>
        contentTypeService.rewriteVisualizationOrigins(
          definition,
          'not-a-url',
          'https://vse.prod.example.com'
        )
      ).toThrow('Invalid source visualization origin: not-a-url');
    });
  });

  describe('validateSchemas', () => {
    it('should separate valid and invalid content types based on schema availability', async () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          id: 'ct1',
          hubContentTypeId: 'hct1',
          contentTypeUri: 'https://schema1.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
        {
          id: 'ct2',
          hubContentTypeId: 'hct2',
          contentTypeUri: 'https://schema2.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
      ];

      const targetSchemas: Amplience.ContentTypeSchema[] = [
        {
          id: 'schema1',
          schemaId: 'https://schema1.json',
          body: {
            title: 'Test Content Type',
            description: 'A test content type schema',
            type: 'object',
            allOf: [
              {
                $ref: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content',
              },
            ],
            properties: {
              testField: {
                type: 'string',
                title: 'Test Field',
              },
            },
          },
          status: 'ACTIVE',
          version: 1,
          createdDate: '2023-01-01',
          lastModifiedDate: '2023-01-01',
          createdBy: 'user',
          lastModifiedBy: 'user',
        } as Amplience.ContentTypeSchema,
      ];

      vi.mocked(mockTargetHub.getAllSchemas).mockResolvedValue(targetSchemas);

      const result = await contentTypeService.validateSchemas(mockTargetHub, contentTypes);

      expect(result.validContentTypes).toHaveLength(1);
      expect(result.validContentTypes[0].contentTypeUri).toBe('https://schema1.json');
      expect(result.missingSchemas).toHaveLength(1);
      expect(result.missingSchemas[0]).toBe('https://schema2.json');
    });
  });

  describe('generateAutomaticRepositoryMap', () => {
    it('should map content types to target repositories based on repository names', async () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          id: 'ct1',
          hubContentTypeId: 'hct1',
          contentTypeUri: 'https://schema1.json',
          status: 'ACTIVE',
        } as Amplience.ContentType,
      ];

      const sourceRepositories: Amplience.ContentRepository[] = [
        {
          id: 'repo1',
          name: 'Main Repository',
          label: 'Main',
          status: 'ACTIVE',
          contentTypes: [{ id: 'ct1' } as Amplience.ContentType],
        } as Amplience.ContentRepository,
      ];

      const targetRepositories: Amplience.ContentRepository[] = [
        {
          id: 'repo2',
          name: 'Main Repository',
          label: 'Main Target',
          status: 'ACTIVE',
          contentTypes: [],
        } as Amplience.ContentRepository,
      ];

      vi.mocked(mockSourceHub.getRepositories).mockResolvedValue(sourceRepositories);
      vi.mocked(mockTargetHub.getRepositories).mockResolvedValue(targetRepositories);

      const result = await contentTypeService.generateAutomaticRepositoryMap(
        mockSourceHub,
        mockTargetHub,
        contentTypes
      );

      expect(result.has('ct1')).toBe(true);
      expect(result.get('ct1')).toHaveLength(1);
      expect(result.get('ct1')?.[0].name).toBe('Main Repository');
    });
  });
});
