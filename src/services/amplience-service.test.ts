import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmplienceService } from './amplience-service';

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
