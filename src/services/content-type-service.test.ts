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
