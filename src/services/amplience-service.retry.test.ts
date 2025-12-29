import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmplienceService } from './amplience-service';

// Mock dotenv to prevent loading from .env files during testing
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AmplienceService - HTTP 429 Retry Logic', () => {
  let service: AmplienceService;
  const mockOAuthConfig: Amplience.HubOAuthConfig = {
    name: 'Test Hub',
    hubId: 'test-hub-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  const mockAuthResponse = {
    access_token: 'mock-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'read write',
  };

  const mockSuccessResponse = {
    _embedded: {
      'content-repositories': [{ id: 'test-repo-id', name: 'Test Repository' }],
    },
  };

  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset timers before each test
    vi.useFakeTimers();
    // Mock console.warn to suppress log output during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    service = new AmplienceService(mockOAuthConfig);
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
    // Restore environment variables
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Scenario 1: Successful Retry', () => {
    it('should retry and succeed after a 429 response', async () => {
      // Arrange
      // Mock auth call (1st call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // Mock first request - 429 response (2nd call)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'Retry-After': '1', // 1 second
        }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Mock retry request - success (3rd call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // Fast-forward time to simulate waiting for Retry-After duration
      await vi.advanceTimersByTimeAsync(1000);

      const result = await requestPromise;

      // Assert
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + failed request + successful retry
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit hit'));
    });

    it('should retry multiple times until success', async () => {
      // Arrange
      process.env.RETRIES_COUNT = '3';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // First request - 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '1' }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Second request - 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '1' }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Third request - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // Fast-forward time for both retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await requestPromise;

      // Assert
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(4); // auth + 2 failed + 1 success
      expect(console.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Scenario 2: Max Retries Exceeded', () => {
    it('should throw error after exceeding default max retries (3)', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // Mock all requests to return 429
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }

      // Act & Assert
      const expectation = expect(service.getRepositories()).rejects.toThrow(
        /Failed after \d+ retries/
      );

      // Fast-forward through all retry attempts
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      await expectation;
      expect(mockFetch).toHaveBeenCalledTimes(5); // auth + 4 attempts (initial + 3 retries)
    });

    it('should respect custom RETRIES_COUNT environment variable', async () => {
      // Arrange
      process.env.RETRIES_COUNT = '5';

      // Create a new service instance to pick up the new env var
      service = new AmplienceService(mockOAuthConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // Mock all requests to return 429
      for (let i = 0; i < 6; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }

      // Act
      const expectation = expect(service.getRepositories()).rejects.toThrow(
        /Failed after \d+ retries/
      );

      // Fast-forward through all retry attempts
      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      // Assert
      await expectation;
      expect(mockFetch).toHaveBeenCalledTimes(7); // auth + 6 attempts (initial + 5 retries)
    });

    it('should include error context in final error message', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }

      // Act
      const expectation = expect(service.getRepositories()).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/429.*Too Many Requests/),
        })
      );

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      // Assert
      await expectation;
    });
  });

  describe('Scenario 3: Retry-After Header', () => {
    it('should respect Retry-After header with seconds value', async () => {
      // Arrange
      const retryAfterSeconds = 5;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': retryAfterSeconds.toString() }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // Verify that advancing by less than Retry-After doesn't trigger retry
      await vi.advanceTimersByTimeAsync((retryAfterSeconds - 1) * 1000);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only auth + initial request

      // Advance to full Retry-After duration
      await vi.advanceTimersByTimeAsync(1000);

      await requestPromise;

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Waiting ${retryAfterSeconds} seconds`)
      );
    });

    it('should respect Retry-After header with HTTP date value', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 3000); // 3 seconds in the future
      const httpDate = futureDate.toUTCString();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': httpDate }),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();
      await vi.advanceTimersByTimeAsync(3000);
      await requestPromise;

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Waiting'));
    });
  });

  describe('Scenario 4: Exponential Backoff', () => {
    it('should use exponential backoff when Retry-After header is missing', async () => {
      // Arrange
      process.env.RETRY_AWAIT_TIME = '2'; // 2 seconds base

      // Create a new service instance to pick up the new env var
      service = new AmplienceService(mockOAuthConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // First 429 - no Retry-After header
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Second 429 - no Retry-After header
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // First retry: 2 * (2^1) = 4 seconds
      await vi.advanceTimersByTimeAsync(4000);

      // Second retry: 2 * (2^2) = 8 seconds
      await vi.advanceTimersByTimeAsync(8000);

      await requestPromise;

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(console.warn).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenNthCalledWith(1, expect.stringContaining('4 seconds'));
      expect(console.warn).toHaveBeenNthCalledWith(2, expect.stringContaining('8 seconds'));
    });

    it('should use default backoff time of 60 seconds when not configured', async () => {
      // Arrange - explicitly remove env var
      delete process.env.RETRY_AWAIT_TIME;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // Default: 60 * (2^1) = 120 seconds for first retry
      await vi.advanceTimersByTimeAsync(120000);

      await requestPromise;

      // Assert
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('120 seconds'));
    });
  });

  describe('Scenario 5: Configuration', () => {
    it('should use default values when environment variables are not set', async () => {
      // Arrange - remove env vars
      delete process.env.RETRIES_COUNT;
      delete process.env.RETRY_AWAIT_TIME;

      // Create a new service instance to ensure fresh config
      service = new AmplienceService(mockOAuthConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      // Mock 4 failures (should exhaust default 3 retries)
      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }

      // Act
      const expectation = expect(service.getRepositories()).rejects.toThrow();

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      // Assert
      await expectation;
      expect(mockFetch).toHaveBeenCalledTimes(5); // auth + 4 attempts (default 3 retries)
    });

    it('should handle invalid RETRIES_COUNT gracefully', async () => {
      // Arrange
      process.env.RETRIES_COUNT = 'invalid-number';

      // Should fall back to default (3)
      service = new AmplienceService(mockOAuthConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      for (let i = 0; i < 4; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }

      // Act
      const expectation = expect(service.getRepositories()).rejects.toThrow();

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      // Assert
      await expectation;
      expect(mockFetch).toHaveBeenCalledTimes(5); // Falls back to default 3
    });

    it('should handle invalid RETRY_AWAIT_TIME gracefully', async () => {
      // Arrange
      process.env.RETRY_AWAIT_TIME = 'not-a-number';

      service = new AmplienceService(mockOAuthConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSuccessResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      // Act
      const requestPromise = service.getRepositories();

      // Should fall back to default 60 seconds * 2^1 = 120 seconds
      await vi.advanceTimersByTimeAsync(120000);

      await requestPromise;

      // Assert
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('120 seconds'));
    });
  });

  describe('Non-429 Error Handling', () => {
    it('should not retry on 404 errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Resource not found'),
      });

      // Act & Assert
      await expect(service.getRepositories()).rejects.toThrow(/404.*Not Found/);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only auth + failed request (no retries)
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not retry on 500 errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      // Act & Assert
      await expect(service.getRepositories()).rejects.toThrow(/500.*Internal Server Error/);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not retry on 401 errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials'),
      });

      // Act & Assert
      await expect(service.getRepositories()).rejects.toThrow(/401.*Unauthorized/);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
