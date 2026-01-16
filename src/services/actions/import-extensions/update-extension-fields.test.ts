vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');

  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
    writeFile: vi.fn(actual.writeFile),
  };
});

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DirectoryAccessError } from '../import-extensions';
import { updateExtensionFields, updateHubId, updateUrlOrigins } from './update-extension-fields';

// Mock hub config with extUrl field
type HubConfigWithExtUrl = Amplience.HubConfig & { extUrl?: string };

describe('updateExtensionFields', () => {
  let tempDir: string;
  let extensionPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'update-fields-test-'));
    extensionPath = path.join(tempDir, 'test-extension.json');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('updates both hubId and URL origins in extension file', async () => {
    // Arrange
    const originalExtension = {
      id: 'test-extension',
      name: 'Test Extension',
      hubId: 'old-hub-id',
      url: 'https://old-hub.amplience.net/extension',
      settings: {
        apiUrl: 'https://old-hub.amplience.net/api',
      },
    };

    await fs.writeFile(extensionPath, JSON.stringify(originalExtension, null, 2));

    const targetHub: HubConfigWithExtUrl = {
      name: 'Target Hub',
      envKey: 'TARGET_HUB',
      hubId: 'new-hub-id',
      patToken: 'test-token',
      extUrl: 'https://new-hub.amplience.net',
    };

    // Act
    await updateExtensionFields(extensionPath, targetHub);

    // Assert
    const updatedContent = await fs.readFile(extensionPath, 'utf-8');
    const updatedExtension = JSON.parse(updatedContent);

    expect(updatedExtension.hubId).toBe('new-hub-id');
    expect(updatedExtension.url).toBe('https://new-hub.amplience.net/extension');
    expect(updatedExtension.settings.apiUrl).toBe('https://new-hub.amplience.net/api');
  });

  it('handles extensions with multiple URL fields', async () => {
    // Arrange
    const originalExtension = {
      id: 'multi-url-ext',
      hubId: 'old-hub',
      url: 'https://source.amplience.net/main',
      webhookUrl: 'https://source.amplience.net/webhook',
      settings: {
        endpoint: 'https://source.amplience.net/api/endpoint',
        callbackUrl: 'https://source.amplience.net/callback',
      },
    };

    await fs.writeFile(extensionPath, JSON.stringify(originalExtension, null, 2));

    const targetHub: HubConfigWithExtUrl = {
      name: 'Target',
      envKey: 'TARGET',
      hubId: 'target-hub',
      patToken: 'token',
      extUrl: 'https://target.amplience.net',
    };

    // Act
    await updateExtensionFields(extensionPath, targetHub);

    // Assert
    const updated = JSON.parse(await fs.readFile(extensionPath, 'utf-8'));

    expect(updated.url).toBe('https://target.amplience.net/main');
    expect(updated.webhookUrl).toBe('https://target.amplience.net/webhook');
    expect(updated.settings.endpoint).toBe('https://target.amplience.net/api/endpoint');
    expect(updated.settings.callbackUrl).toBe('https://target.amplience.net/callback');
  });

  it('preserves other fields unchanged', async () => {
    // Arrange
    const originalExtension = {
      id: 'preserve-test',
      name: 'Preserve Test Extension',
      description: 'This description should not change',
      version: '1.2.3',
      hubId: 'old-hub',
      url: 'https://old.amplience.net/ext',
      category: 'CONTENT_FIELD',
      settings: {
        someOtherField: 'unchanged-value',
      },
    };

    await fs.writeFile(extensionPath, JSON.stringify(originalExtension, null, 2));

    const targetHub: HubConfigWithExtUrl = {
      name: 'New Hub',
      envKey: 'NEW_HUB',
      hubId: 'new-hub',
      patToken: 'token',
      extUrl: 'https://new.amplience.net',
    };

    // Act
    await updateExtensionFields(extensionPath, targetHub);

    // Assert
    const updated = JSON.parse(await fs.readFile(extensionPath, 'utf-8'));

    expect(updated.id).toBe('preserve-test');
    expect(updated.name).toBe('Preserve Test Extension');
    expect(updated.description).toBe('This description should not change');
    expect(updated.version).toBe('1.2.3');
    expect(updated.category).toBe('CONTENT_FIELD');
    expect(updated.settings.someOtherField).toBe('unchanged-value');
  });

  it('throws DirectoryAccessError when file cannot be read', async () => {
    // Arrange
    const mockFs = await import('fs/promises');
    vi.mocked(mockFs.readFile).mockRejectedValueOnce(new Error('EACCES: permission denied'));

    const targetHub: HubConfigWithExtUrl = {
      name: 'Hub',
      envKey: 'HUB',
      hubId: 'hub-id',
      patToken: 'token',
      extUrl: 'https://hub.amplience.net',
    };

    // Act & Assert
    await expect(updateExtensionFields(extensionPath, targetHub)).rejects.toThrow(
      DirectoryAccessError
    );
  });

  it('throws DirectoryAccessError when file cannot be written', async () => {
    // Arrange
    const extension = { id: 'test', hubId: 'old', url: 'https://old.amplience.net/ext' };
    await fs.writeFile(extensionPath, JSON.stringify(extension));

    const mockFs = await import('fs/promises');
    vi.mocked(mockFs.writeFile).mockRejectedValueOnce(new Error('ENOSPC: no space left'));

    const targetHub: HubConfigWithExtUrl = {
      name: 'Hub',
      envKey: 'HUB',
      hubId: 'new',
      patToken: 'token',
      extUrl: 'https://new.amplience.net',
    };

    // Act & Assert
    await expect(updateExtensionFields(extensionPath, targetHub)).rejects.toThrow(
      DirectoryAccessError
    );
  });

  it('throws error when extension JSON is invalid', async () => {
    // Arrange
    await fs.writeFile(extensionPath, 'invalid json content {]');

    const targetHub: HubConfigWithExtUrl = {
      name: 'Hub',
      envKey: 'HUB',
      hubId: 'hub-id',
      patToken: 'token',
      extUrl: 'https://hub.amplience.net',
    };

    // Act & Assert
    await expect(updateExtensionFields(extensionPath, targetHub)).rejects.toThrow();
  });

  it('works when extUrl is missing (skips URL origin updates)', async () => {
    // Arrange
    const extension = {
      id: 'no-ext-url',
      hubId: 'old-hub',
      url: 'https://old.amplience.net/ext',
    };

    await fs.writeFile(extensionPath, JSON.stringify(extension));

    const targetHub: HubConfigWithExtUrl = {
      name: 'Hub',
      envKey: 'HUB',
      hubId: 'new-hub',
      patToken: 'token',
      // extUrl is missing
    };

    // Act
    await updateExtensionFields(extensionPath, targetHub);

    // Assert
    const updated = JSON.parse(await fs.readFile(extensionPath, 'utf-8'));

    // Hub ID should be updated
    expect(updated.hubId).toBe('new-hub');

    // URL should remain unchanged since no extUrl provided
    expect(updated.url).toBe('https://old.amplience.net/ext');
  });
});

describe('updateHubId', () => {
  it('updates hubId field in extension object', () => {
    // Arrange
    const extension = { id: 'test', hubId: 'old-hub-id', name: 'Test' };

    // Act
    updateHubId(extension, 'new-hub-id');

    // Assert
    expect(extension.hubId).toBe('new-hub-id');
  });

  it('preserves other fields when updating hubId', () => {
    // Arrange
    const extension = {
      id: 'test-ext',
      name: 'Test Extension',
      hubId: 'old-hub',
      url: 'https://example.com',
      version: '1.0.0',
    };

    // Act
    updateHubId(extension, 'updated-hub');

    // Assert
    expect(extension.id).toBe('test-ext');
    expect(extension.name).toBe('Test Extension');
    expect(extension.url).toBe('https://example.com');
    expect(extension.version).toBe('1.0.0');
    expect(extension.hubId).toBe('updated-hub');
  });

  it('adds hubId field if it does not exist', () => {
    // Arrange
    const extension: Record<string, unknown> = { id: 'test', name: 'Test' };

    // Act
    updateHubId(extension, 'new-hub-id');

    // Assert
    expect(extension.hubId).toBe('new-hub-id');
  });

  it('handles empty hubId values', () => {
    // Arrange
    const extension = { id: 'test', hubId: '' };

    // Act
    updateHubId(extension, 'valid-hub-id');

    // Assert
    expect(extension.hubId).toBe('valid-hub-id');
  });
});

describe('updateUrlOrigins', () => {
  it('replaces URL origin in simple string field', () => {
    // Arrange
    const extension = {
      id: 'test',
      url: 'https://source.amplience.net/extension',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.url).toBe('https://target.amplience.net/extension');
  });

  it('replaces URL origins in nested object fields', () => {
    // Arrange
    const extension = {
      id: 'nested',
      settings: {
        apiUrl: 'https://old.amplience.net/api',
        webhookUrl: 'https://old.amplience.net/webhook',
      },
    };

    // Act
    updateUrlOrigins(extension, 'https://old.amplience.net', 'https://new.amplience.net');

    // Assert
    expect(extension.settings.apiUrl).toBe('https://new.amplience.net/api');
    expect(extension.settings.webhookUrl).toBe('https://new.amplience.net/webhook');
  });

  it('replaces URL origins in deeply nested structures', () => {
    // Arrange
    const extension = {
      id: 'deep',
      level1: {
        level2: {
          level3: {
            deepUrl: 'https://source.amplience.net/deep/path',
          },
        },
      },
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.level1.level2.level3.deepUrl).toBe('https://target.amplience.net/deep/path');
  });

  it('replaces URL origins in array values', () => {
    // Arrange
    const extension = {
      id: 'array-test',
      urls: [
        'https://hub.amplience.net/endpoint1',
        'https://hub.amplience.net/endpoint2',
        'https://other.domain.com/no-change',
      ],
    };

    // Act
    updateUrlOrigins(extension, 'https://hub.amplience.net', 'https://newhub.amplience.net');

    // Assert
    expect(extension.urls[0]).toBe('https://newhub.amplience.net/endpoint1');
    expect(extension.urls[1]).toBe('https://newhub.amplience.net/endpoint2');
    expect(extension.urls[2]).toBe('https://other.domain.com/no-change'); // Unchanged
  });

  it('only replaces URLs that match source origin', () => {
    // Arrange
    const extension = {
      id: 'selective',
      matchingUrl: 'https://source.amplience.net/path',
      differentUrl: 'https://different.domain.com/path',
      anotherMatchingUrl: 'https://source.amplience.net/other',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.matchingUrl).toBe('https://target.amplience.net/path');
    expect(extension.differentUrl).toBe('https://different.domain.com/path'); // Unchanged
    expect(extension.anotherMatchingUrl).toBe('https://target.amplience.net/other');
  });

  it('preserves URL paths and query strings', () => {
    // Arrange
    const extension = {
      id: 'preserve',
      url: 'https://old.amplience.net/path/to/resource?param=value&other=123#anchor',
    };

    // Act
    updateUrlOrigins(extension, 'https://old.amplience.net', 'https://new.amplience.net');

    // Assert
    expect(extension.url).toBe(
      'https://new.amplience.net/path/to/resource?param=value&other=123#anchor'
    );
  });

  it('does not modify non-URL string values', () => {
    // Arrange
    const extension = {
      id: 'no-urls',
      name: 'Extension Name',
      description: 'This is a description with https://example.com but not matching',
      version: '1.0.0',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.name).toBe('Extension Name');
    expect(extension.description).toBe(
      'This is a description with https://example.com but not matching'
    );
    expect(extension.version).toBe('1.0.0');
  });

  it('handles empty object gracefully', () => {
    // Arrange
    const extension: Record<string, unknown> = {};

    // Act
    expect(() =>
      updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net')
    ).not.toThrow();

    // Assert
    expect(extension).toEqual({});
  });

  it('handles null and undefined values', () => {
    // Arrange
    const extension = {
      id: 'nulls',
      nullField: null,
      undefinedField: undefined,
      url: 'https://source.amplience.net/path',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.nullField).toBeNull();
    expect(extension.undefinedField).toBeUndefined();
    expect(extension.url).toBe('https://target.amplience.net/path');
  });

  it('handles number and boolean values without errors', () => {
    // Arrange
    const extension = {
      id: 'primitives',
      count: 42,
      enabled: true,
      url: 'https://source.amplience.net/ext',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    expect(extension.count).toBe(42);
    expect(extension.enabled).toBe(true);
    expect(extension.url).toBe('https://target.amplience.net/ext');
  });

  it('is case-sensitive for origin matching', () => {
    // Arrange
    const extension = {
      id: 'case-test',
      url1: 'https://Source.Amplience.Net/path',
      url2: 'https://source.amplience.net/path',
    };

    // Act
    updateUrlOrigins(extension, 'https://source.amplience.net', 'https://target.amplience.net');

    // Assert
    // Only exact case match should be replaced
    expect(extension.url1).toBe('https://Source.Amplience.Net/path'); // No change (case mismatch)
    expect(extension.url2).toBe('https://target.amplience.net/path'); // Changed (exact match)
  });
});
