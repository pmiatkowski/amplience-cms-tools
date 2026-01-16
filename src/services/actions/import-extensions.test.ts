vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');

  return {
    ...actual,
    mkdir: vi.fn(actual.mkdir),
    unlink: vi.fn(actual.unlink),
    readFile: vi.fn(actual.readFile),
    writeFile: vi.fn(actual.writeFile),
    copyFile: vi.fn(actual.copyFile),
    rm: vi.fn(actual.rm),
  };
});

vi.mock('~/services/amplience-service');

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// AmplienceService will be used in Phase 2+ tests
// import { AmplienceService } from '~/services/amplience-service';
import {
  DirectoryAccessError,
  HubAuthenticationError,
  ImportExtensionsError,
  InvalidPatternError,
  DcCliExecutionError,
  validateExtUrlExists,
} from './import-extensions';

const { builderMock, createDcCliCommandMock, createProgressBarMock } = vi.hoisted(() => {
  const builder = {
    withHub: vi.fn().mockReturnThis(),
    withCommand: vi.fn().mockReturnThis(),
    withArgs: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  const createProgressBarMock = vi.fn(() => ({
    increment: vi.fn(),
    stop: vi.fn(),
    setTotal: vi.fn(),
    update: vi.fn(),
  }));

  return {
    builderMock: builder,
    createDcCliCommandMock: vi.fn(() => builder),
    createProgressBarMock,
  };
});

vi.mock('~/utils', () => ({
  createDcCliCommand: createDcCliCommandMock,
  createProgressBar: createProgressBarMock,
}));

// mockHub will be used in Phase 2+ tests when importExtensions() is fully implemented
// const mockHub: Amplience.HubConfig = {
//   name: 'Test Hub',
//   clientId: 'client-id',
//   clientSecret: 'client-secret',
//   hubId: 'target-hub-id',
// };

describe('ImportExtensionsError', () => {
  it('creates error with message and name', () => {
    const error = new ImportExtensionsError('Test error message');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ImportExtensionsError');
    expect(error.message).toBe('Test error message');
    expect(error.cause).toBeUndefined();
  });

  it('creates error with cause', () => {
    const cause = new Error('Root cause');
    const error = new ImportExtensionsError('Test error', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('InvalidPatternError', () => {
  it('creates error with pattern and auto-generated message', () => {
    const error = new InvalidPatternError('[invalid');

    expect(error).toBeInstanceOf(ImportExtensionsError);
    expect(error.name).toBe('InvalidPatternError');
    expect(error.message).toContain('[invalid');
    expect(error.message).toContain('Invalid regex pattern');
    expect(error.pattern).toBe('[invalid');
  });

  it('creates error with cause', () => {
    const cause = new Error('Regex syntax error');
    const error = new InvalidPatternError('[', cause);

    expect(error.cause).toBe(cause);
    expect(error.pattern).toBe('[');
  });
});

describe('DirectoryAccessError', () => {
  it('creates error with message and targetPath', () => {
    const error = new DirectoryAccessError('Cannot access directory', '/tmp/test');

    expect(error).toBeInstanceOf(ImportExtensionsError);
    expect(error.name).toBe('DirectoryAccessError');
    expect(error.message).toBe('Cannot access directory');
    expect(error.targetPath).toBe('/tmp/test');
  });

  it('creates error with cause', () => {
    const cause = new Error('EACCES');
    const error = new DirectoryAccessError('Permission denied', '/tmp/test', cause);

    expect(error.cause).toBe(cause);
    expect(error.targetPath).toBe('/tmp/test');
  });
});

describe('DcCliExecutionError', () => {
  it('creates error with stdout and stderr', () => {
    const error = new DcCliExecutionError('Command failed', 'stdout content', 'stderr content');

    expect(error).toBeInstanceOf(ImportExtensionsError);
    expect(error.name).toBe('DcCliExecutionError');
    expect(error.message).toBe('Command failed');
    expect(error.stdout).toBe('stdout content');
    expect(error.stderr).toBe('stderr content');
  });

  it('creates error with cause', () => {
    const cause = new Error('Process exited with code 1');
    const error = new DcCliExecutionError('Failed', '', '', cause);

    expect(error.cause).toBe(cause);
  });
});

describe('HubAuthenticationError', () => {
  it('creates error with hub name and auto-generated message', () => {
    const error = new HubAuthenticationError('Production Hub', 'stdout', 'stderr with 401');

    expect(error).toBeInstanceOf(DcCliExecutionError);
    expect(error.name).toBe('HubAuthenticationError');
    expect(error.message).toContain('Production Hub');
    expect(error.message).toContain('Failed to authenticate');
    expect(error.stdout).toBe('stdout');
    expect(error.stderr).toBe('stderr with 401');
  });

  it('creates error with cause', () => {
    const cause = new Error('Auth failed');
    const error = new HubAuthenticationError('Test Hub', '', '', cause);

    expect(error.cause).toBe(cause);
  });
});

// TODO: Placeholder tests for importExtensions() function
// These will be implemented once the function skeleton is created in Task 1.5
describe('importExtensions action (placeholder)', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'extensions-import-'));
    vi.clearAllMocks();
    createDcCliCommandMock.mockReturnValue(builderMock);
    builderMock.withHub.mockReturnThis();
    builderMock.withCommand.mockReturnThis();
    builderMock.withArgs.mockReturnThis();
    builderMock.execute.mockResolvedValue({ stdout: '', stderr: '' });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('creates temp directory for import workflow', async () => {
    // Test that temp directory is created with timestamp
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('copies source files to temp directory before modification', async () => {
    // Test that source files are copied to temp before any modifications
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('cleans up temp directory on successful import', async () => {
    // Test that temp directory is removed after successful dc-cli import
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('cleans up temp directory when import fails', async () => {
    // Test that temp directory is removed even when errors occur
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('throws HubAuthenticationError when dc-cli reports 401', async () => {
    // Test that authentication errors are properly detected and thrown
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('throws DcCliExecutionError when dc-cli fails for other reasons', async () => {
    // Test that non-auth dc-cli errors are properly handled
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('throws DirectoryAccessError when source directory cannot be accessed', async () => {
    // Test that source directory access errors are properly handled
    // Will be implemented after importExtensions() skeleton exists
    expect(true).toBe(true); // Placeholder
  });

  it('requires EXT_URL in hub configuration', async () => {
    // Test that import fails if target hub doesn't have EXT_URL configured
    // Will be implemented in Phase 2 (Hub-Specific Field Updates)
    expect(true).toBe(true); // Placeholder for Phase 2
  });
});

describe('importExtensions - Phase 4: Progress bar integration', () => {
  it('placeholder - progress bar tests will be added when integrating with full workflow', () => {
    // Note: Progress bar integration tests require full importExtensions() workflow
    // which will be completed when Phase 3 filtering is integrated and Phase 4 dc-cli execution is added
    // For now, runDcCliImport already has progress bar tested (see run-dc-cli-import.test.ts)
    expect(true).toBe(true);
  });
});

describe('EXT_URL validation', () => {
  it('throws error when hub config is missing extUrl field', () => {
    // Arrange
    const hubWithoutExtUrl: Amplience.HubConfig = {
      name: 'Test Hub',
      envKey: 'TEST_HUB',
      hubId: 'hub-123',
      patToken: 'test-token',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithoutExtUrl);
    }).toThrow('EXT_URL is required');
    expect(() => {
      validateExtUrlExists(hubWithoutExtUrl);
    }).toThrow('Test Hub');
  });

  it('throws error when extUrl is empty string', () => {
    // Arrange
    const hubWithEmptyExtUrl = {
      name: 'Empty Hub',
      hubId: 'hub-456',
      patToken: 'token',
      extUrl: '',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithEmptyExtUrl as Amplience.HubConfig & { extUrl?: string });
    }).toThrow('EXT_URL is required');
  });

  it('throws error when extUrl is whitespace only', () => {
    // Arrange
    const hubWithWhitespaceExtUrl = {
      name: 'Whitespace Hub',
      hubId: 'hub-789',
      patToken: 'token',
      extUrl: '   ',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithWhitespaceExtUrl as Amplience.HubConfig & { extUrl?: string });
    }).toThrow('EXT_URL is required');
  });

  it('passes validation when extUrl is valid HTTPS URL', () => {
    // Arrange
    const hubWithValidExtUrl = {
      name: 'Valid Hub',
      hubId: 'hub-valid',
      patToken: 'token',
      extUrl: 'https://prod.amplience.net',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithValidExtUrl as Amplience.HubConfig & { extUrl?: string });
    }).not.toThrow();
  });

  it('throws error when extUrl is not a valid HTTPS URL', () => {
    // Arrange
    const hubWithInvalidProtocol = {
      name: 'Invalid Protocol Hub',
      hubId: 'hub-invalid',
      patToken: 'token',
      extUrl: 'http://insecure.amplience.net',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithInvalidProtocol as Amplience.HubConfig & { extUrl?: string });
    }).toThrow('EXT_URL must be a valid HTTPS URL');
  });

  it('throws error when extUrl is not a valid URL format', () => {
    // Arrange
    const hubWithInvalidUrl = {
      name: 'Malformed Hub',
      hubId: 'hub-malformed',
      patToken: 'token',
      extUrl: 'not-a-valid-url',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithInvalidUrl as Amplience.HubConfig & { extUrl?: string });
    }).toThrow('EXT_URL must be a valid HTTPS URL');
  });

  it('accepts extUrl without trailing slash', () => {
    // Arrange
    const hubWithoutTrailingSlash = {
      name: 'No Slash Hub',
      hubId: 'hub-no-slash',
      patToken: 'token',
      extUrl: 'https://hub.amplience.net',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithoutTrailingSlash as Amplience.HubConfig & { extUrl?: string });
    }).not.toThrow();
  });

  it('accepts extUrl with trailing slash', () => {
    // Arrange
    const hubWithTrailingSlash = {
      name: 'Slash Hub',
      hubId: 'hub-slash',
      patToken: 'token',
      extUrl: 'https://hub.amplience.net/',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithTrailingSlash as Amplience.HubConfig & { extUrl?: string });
    }).not.toThrow();
  });

  it('accepts extUrl with subdomain', () => {
    // Arrange
    const hubWithSubdomain = {
      name: 'Subdomain Hub',
      hubId: 'hub-subdomain',
      patToken: 'token',
      extUrl: 'https://prod.eu.amplience.net',
    };

    // Act & Assert
    expect(() => {
      validateExtUrlExists(hubWithSubdomain as Amplience.HubConfig & { extUrl?: string });
    }).not.toThrow();
  });

  it('throws error when extUrl contains path segments', () => {
    // Arrange
    const hubWithPath = {
      name: 'Path Hub',
      hubId: 'hub-path',
      patToken: 'token',
      extUrl: 'https://hub.amplience.net/some/path',
    };

    // Act & Assert - EXT_URL should be origin only, no paths
    expect(() => {
      validateExtUrlExists(hubWithPath as Amplience.HubConfig & { extUrl?: string });
    }).toThrow('EXT_URL must be origin only');
  });
});
