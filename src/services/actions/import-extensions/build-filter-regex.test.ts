import { describe, expect, it } from 'vitest';

import { InvalidPatternError } from '../import-extensions';
import { buildFilterRegex } from './build-filter-regex';

describe('buildFilterRegex', () => {
  describe('valid patterns', () => {
    it('should build regex from simple pattern', () => {
      const regex = buildFilterRegex('.*');

      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('.*');
      expect(regex.flags).toBe('i'); // Case-insensitive
    });

    it('should build regex from specific pattern', () => {
      const regex = buildFilterRegex('my-extension-.*');

      expect(regex.source).toBe('my-extension-.*');
      expect(regex.test('my-extension-test')).toBe(true);
      expect(regex.test('other-extension')).toBe(false);
    });

    it('should build case-insensitive regex', () => {
      const regex = buildFilterRegex('TEST');

      expect(regex.test('test')).toBe(true);
      expect(regex.test('TEST')).toBe(true);
      expect(regex.test('Test')).toBe(true);
    });

    it('should handle pattern with special regex characters', () => {
      const regex = buildFilterRegex('test-[a-z]+');

      expect(regex.test('test-abc')).toBe(true);
      expect(regex.test('test-123')).toBe(false);
    });

    it('should handle pattern matching start/end anchors', () => {
      const regex = buildFilterRegex('^my-extension$');

      expect(regex.test('my-extension')).toBe(true);
      expect(regex.test('my-extension-extra')).toBe(false);
      expect(regex.test('prefix-my-extension')).toBe(false);
    });

    it('should handle pattern with word boundaries', () => {
      const regex = buildFilterRegex('\\btest\\b');

      expect(regex.test('test')).toBe(true);
      expect(regex.test('testing')).toBe(false);
    });

    it('should handle pattern with groups', () => {
      const regex = buildFilterRegex('(foo|bar)-extension');

      expect(regex.test('foo-extension')).toBe(true);
      expect(regex.test('bar-extension')).toBe(true);
      expect(regex.test('baz-extension')).toBe(false);
    });

    it('should handle empty pattern as match-all', () => {
      const regex = buildFilterRegex('');

      expect(regex.test('anything')).toBe(true);
      expect(regex.test('')).toBe(true);
    });

    it('should handle whitespace-only pattern as match-all', () => {
      const regex = buildFilterRegex('   ');

      expect(regex.test('anything')).toBe(true);
    });
  });

  describe('invalid patterns', () => {
    it('should throw InvalidPatternError for unclosed bracket', () => {
      expect(() => buildFilterRegex('[invalid')).toThrow(InvalidPatternError);
    });

    it('should throw InvalidPatternError for unclosed parenthesis', () => {
      expect(() => buildFilterRegex('(invalid')).toThrow(InvalidPatternError);
    });

    it('should throw InvalidPatternError for invalid range', () => {
      expect(() => buildFilterRegex('[z-a]')).toThrow(InvalidPatternError);
    });

    it('should throw InvalidPatternError for invalid quantifier', () => {
      expect(() => buildFilterRegex('*invalid')).toThrow(InvalidPatternError);
    });

    it('should include pattern in error message', () => {
      try {
        buildFilterRegex('[invalid');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPatternError);
        expect((error as InvalidPatternError).pattern).toBe('[invalid');
        expect((error as InvalidPatternError).message).toContain('[invalid');
      }
    });

    it('should include underlying error as cause', () => {
      try {
        buildFilterRegex('[invalid');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPatternError);
        expect((error as InvalidPatternError).cause).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle pattern with escaped characters', () => {
      const regex = buildFilterRegex('test\\.extension');

      expect(regex.test('test.extension')).toBe(true);
      expect(regex.test('testXextension')).toBe(false);
    });

    it('should handle pattern with Unicode characters', () => {
      const regex = buildFilterRegex('café-.*');

      expect(regex.test('café-test')).toBe(true);
      expect(regex.test('cafe-test')).toBe(false);
    });

    it('should handle very long pattern', () => {
      const longPattern = 'a'.repeat(1000) + '.*';
      const regex = buildFilterRegex(longPattern);

      expect(regex.test('a'.repeat(1000) + 'test')).toBe(true);
    });

    it('should handle pattern with multiple wildcards', () => {
      const regex = buildFilterRegex('.*-.*-.*');

      expect(regex.test('foo-bar-baz')).toBe(true);
      expect(regex.test('foo-bar')).toBe(false);
    });
  });
});
