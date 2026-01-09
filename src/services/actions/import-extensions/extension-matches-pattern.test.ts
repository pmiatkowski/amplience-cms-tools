import { describe, expect, it } from 'vitest';

import { extensionMatchesPattern } from './extension-matches-pattern';

describe('extensionMatchesPattern', () => {
  const createExtension = (overrides: Partial<Amplience.Extension> = {}): Amplience.Extension => {
    const defaults: Amplience.Extension = {
      id: 'test-extension-id',
      name: 'Test Extension',
      url: 'https://example.com/extension.html',
      description: 'A test extension for testing',
    };

    // Filter out undefined values from overrides
    const filteredOverrides = Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined)
    );

    return { ...defaults, ...filteredOverrides };
  };

  describe('id matching', () => {
    it('should match extension by id', () => {
      const extension = createExtension({ id: 'my-extension-123' });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should not match extension when id does not match pattern', () => {
      const extension = createExtension({ id: 'my-extension-123' });
      const regex = /other-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(false);
    });

    it('should match extension id case-insensitively', () => {
      const extension = createExtension({ id: 'MY-EXTENSION' });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });
  });

  describe('url matching', () => {
    it('should match extension by url', () => {
      const extension = createExtension({
        id: 'test',
        url: 'https://my-domain.com/extension.html',
      });
      const regex = /my-domain/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should match when url contains pattern', () => {
      const extension = createExtension({
        id: 'test',
        url: 'https://example.com/my-extension/index.html',
      });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should not match when url is missing', () => {
      const extension: Amplience.Extension = {
        id: 'test',
        name: 'Test',
      };
      const regex = /my-domain/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(false);
    });
  });

  describe('description matching', () => {
    it('should match extension by description', () => {
      const extension = createExtension({
        id: 'test',
        description: 'This is a special extension for testing',
      });
      const regex = /special/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should match when description contains pattern', () => {
      const extension = createExtension({
        id: 'test',
        description: 'Image editor with advanced features',
      });
      const regex = /editor/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should not match when description is missing', () => {
      const extension: Amplience.Extension = {
        id: 'test',
        name: 'Test',
      };
      const regex = /special/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(false);
    });
  });

  describe('multiple field matching', () => {
    it('should match if any field matches', () => {
      const extension = createExtension({
        id: 'abc',
        url: 'https://example.com',
        description: 'my-extension test',
      });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should match id even if url and description do not match', () => {
      const extension = createExtension({
        id: 'my-extension-id',
        url: 'https://other.com',
        description: 'something else',
      });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should match url even if id and description do not match', () => {
      const extension = createExtension({
        id: 'abc',
        url: 'https://my-extension.com/test.html',
        description: 'something else',
      });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should match description even if id and url do not match', () => {
      const extension = createExtension({
        id: 'abc',
        url: 'https://other.com',
        description: 'This is my-extension',
      });
      const regex = /my-extension/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle match-all pattern', () => {
      const extension = createExtension();
      const regex = /.*/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should handle extension with all optional fields missing', () => {
      const extension: Amplience.Extension = {
        id: 'test',
        name: 'Test',
      };
      const regex = /test/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should handle extension with empty strings', () => {
      const extension = createExtension({
        id: '',
        url: '',
        description: '',
      });
      const regex = /test/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(false);
    });

    it('should handle regex with special characters', () => {
      const extension = createExtension({
        id: 'test.extension[123]',
      });
      const regex = /test\.extension\[123\]/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should handle regex with word boundaries', () => {
      const extension = createExtension({
        id: 'test-extension',
      });
      const regex = /\bextension\b/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should handle regex with anchors', () => {
      const extension = createExtension({
        id: 'my-extension',
      });
      const regex = /^my-extension$/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });

    it('should not match when no fields match strict pattern', () => {
      const extension = createExtension({
        id: 'abc',
        url: 'https://example.com',
        description: 'test',
      });
      const regex = /xyz/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(false);
    });

    it('should handle Unicode characters', () => {
      const extension = createExtension({
        id: 'café-extension',
      });
      const regex = /café/i;

      expect(extensionMatchesPattern(extension, regex)).toBe(true);
    });
  });
});
