import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmplienceService } from '../src/services/amplience-service';
import { ContentTypeService } from '../src/services/content-type-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AmplienceService', () => {
  let service: AmplienceService;
  const mockHubConfig = {
    name: 'Test Hub',
    hubId: 'test-hub-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  beforeEach(() => {
    service = new AmplienceService(mockHubConfig);
    vi.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      // Mock authentication request
      const mockAuthResponse = {
        access_token: 'mock-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
      };

      // Mock folder creation response
      const mockFolderResponse = {
        id: '00112233445566778899aabb',
        name: 'Test Folder',
        _links: {
          self: { href: 'https://api.amplience.net/v2/content/folders/00112233445566778899aabb' },
          folder: { href: 'https://api.amplience.net/v2/content/folders/00112233445566778899aabb' },
          'content-repository': {
            href: 'https://api.amplience.net/v2/content/content-repositories/test-repo-id',
          },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFolderResponse),
          headers: new Headers({ 'Content-Type': 'application/json' }),
        });

      const result = await service.createFolder('test-repo-id', 'Test Folder');

      expect(result.success).toBe(true);
      expect(result.updatedItem).toEqual(mockFolderResponse);
      expect(result.error).toBeUndefined();

      // Verify the correct number of API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Check that the correct URLs were called
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://auth.amplience.net/oauth/token',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.amplience.net/v2/content/content-repositories/test-repo-id/folders',
        expect.any(Object)
      );

      // Check that the folder creation call includes the correct body
      const folderCreationCall = mockFetch.mock.calls[1];
      expect(folderCreationCall[1]?.method).toBe('POST');
      expect(folderCreationCall[1]?.body).toBe(JSON.stringify({ name: 'Test Folder' }));
    });

    it('should handle folder creation errors', async () => {
      // Mock authentication request
      const mockAuthResponse = {
        access_token: 'mock-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('Invalid folder name'),
        });

      const result = await service.createFolder('test-repo-id', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error: 400 Bad Request');
      expect(result.updatedItem).toBeUndefined();
    });
  });

  it('should be tested', () => {
    expect(true).toBe(true);
  });
});

describe('ContentTypeService', () => {
  let contentTypeService: ContentTypeService;
  let mockSourceHub: AmplienceService;
  let mockTargetHub: AmplienceService;

  beforeEach(() => {
    contentTypeService = new ContentTypeService();
    mockSourceHub = new AmplienceService({
      name: 'Source Hub',
      hubId: 'source-hub-id',
      clientId: 'source-client-id',
      clientSecret: 'source-client-secret',
    });
    mockTargetHub = new AmplienceService({
      name: 'Target Hub',
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
          body: {},
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
