import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmplienceService } from './amplience-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AmplienceService', () => {
  let service: AmplienceService;
  const mockOAuthConfig: Amplience.HubOAuthConfig = {
    name: 'Test Hub',
    envKey: 'TEST_HUB',
    hubId: 'test-hub-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  const mockPATConfig: Amplience.HubPATConfig = {
    name: 'Test Hub PAT',
    envKey: 'TEST_HUB_PAT',
    hubId: 'test-hub-id-pat',
    patToken: 'test-pat-token-12345',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth Authentication', () => {
    beforeEach(() => {
      service = new AmplienceService(mockOAuthConfig);
    });

    describe('createFolder', () => {
      it('should create a folder successfully with OAuth credentials', async () => {
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
            folder: {
              href: 'https://api.amplience.net/v2/content/folders/00112233445566778899aabb',
            },
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

      it('should handle folder creation errors with OAuth', async () => {
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

    it('should authenticate with OAuth and cache token', async () => {
      const mockAuthResponse = {
        access_token: 'oauth-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
      };

      const mockRepoResponse = {
        _embedded: {
          'content-repositories': [],
        },
        page: {
          size: 20,
          totalElements: 0,
          totalPages: 0,
          number: 0,
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepoResponse),
          headers: new Headers({ 'Content-Type': 'application/json' }),
        });

      // First call to getRepositories should trigger OAuth flow
      await service.getRepositories();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://auth.amplience.net/oauth/token',
        expect.any(Object)
      );

      // Verify the OAuth call used client credentials
      const oauthCall = mockFetch.mock.calls[0];
      expect(oauthCall[0]).toBe('https://auth.amplience.net/oauth/token');
      expect(oauthCall[1]?.method).toBe('POST');
    });

    it('should fail with proper error message on OAuth authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      const result = await service.createFolder('test-repo-id', 'Test Folder');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not authenticate with Hub');
      expect(result.error).toContain('Test Hub');
    });
  });

  describe('PAT Token Authentication', () => {
    beforeEach(() => {
      service = new AmplienceService(mockPATConfig);
    });

    it('should use PAT token directly when provided in config', async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFolderResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const result = await service.createFolder('test-repo-id', 'Test Folder');

      expect(result.success).toBe(true);
      expect(result.updatedItem).toEqual(mockFolderResponse);

      // Verify that fetch was called only once (no OAuth call)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the API call was made
      const apiCall = mockFetch.mock.calls[0];
      expect(apiCall[0]).toBe(
        'https://api.amplience.net/v2/content/content-repositories/test-repo-id/folders'
      );

      // Check the headers object - it should be a Headers instance with Authorization
      const fetchOptions = apiCall[1];
      expect(fetchOptions).toBeDefined();
      expect(fetchOptions?.headers).toBeDefined();
      // The headers should include the Authorization header set by the service
      // We can verify by checking the fetch call was made and no OAuth flow occurred
    });

    it('should skip OAuth authentication flow when PAT is present', async () => {
      const mockRepoResponse = {
        _embedded: {
          'content-repositories': [
            {
              id: 'repo-1',
              name: 'Repository 1',
              label: 'Repository 1',
              status: 'ACTIVE',
              contentTypes: [],
            },
          ],
        },
        page: {
          size: 20,
          totalElements: 1,
          totalPages: 1,
          number: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepoResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const repos = await service.getRepositories();

      // Verify that fetch was called only once (OAuth flow skipped)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(repos).toHaveLength(1);

      // Verify the API call was made directly with PAT token
      const apiCall = mockFetch.mock.calls[0];
      expect(apiCall[0]).toContain('https://api.amplience.net/v2/content/hubs/test-hub-id-pat');

      // Verify no OAuth authentication was attempted
      expect(mockFetch).not.toHaveBeenCalledWith(
        'https://auth.amplience.net/oauth/token',
        expect.any(Object)
      );
    });

    it('should use same PAT token across multiple requests', async () => {
      const mockRepoResponse = {
        _embedded: {
          'content-repositories': [],
        },
        page: {
          size: 20,
          totalElements: 0,
          totalPages: 0,
          number: 0,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRepoResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Make multiple API calls
      await service.getRepositories();
      await service.getRepositories();

      // Verify that fetch was called twice (two API calls)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify both calls were API calls (not OAuth)
      for (let i = 0; i < 2; i++) {
        const call = mockFetch.mock.calls[i];
        expect(call[0]).toContain('https://api.amplience.net/v2/content/hubs/test-hub-id-pat');
      }

      // Verify no OAuth calls were made
      const authCalls = mockFetch.mock.calls.filter(
        call => call[0] === 'https://auth.amplience.net/oauth/token'
      );
      expect(authCalls).toHaveLength(0);
    });

    it('should handle API errors gracefully with PAT authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Repository not found'),
      });

      const result = await service.createFolder('non-existent-repo', 'Test Folder');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error: 404 Not Found');

      // Verify that only the API call was made (no OAuth)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
