import { describe, it, expect } from 'vitest';
import { replaceOriginPlaceholder } from './url-replacer';

describe('URL Replacer', () => {
  describe('replaceOriginPlaceholder', () => {
    it('should replace {{ORIGIN_REPLACE}} placeholder with hub URL', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview');
    });

    it('should preserve path segments after placeholder', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview/content';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview/content');
    });

    it('should preserve query parameters', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview?id={{contentItemId}}');
    });

    it('should preserve multiple query parameters', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe(
        'https://vse.dev.example.com/live?id={{contentItemId}}&locale={{locale}}'
      );
    });

    it('should preserve other template variables in path', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview/{{contentItemId}}/view';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview/{{contentItemId}}/view');
    });

    it('should preserve hash fragments', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}#section';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview?id={{contentItemId}}#section');
    });

    it('should handle hub URL with trailing slash', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview';
      const hubUrl = 'https://vse.dev.example.com/';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview');
    });

    it('should handle hub URL without protocol and add https', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview';
      const hubUrl = 'vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com/preview');
    });

    it('should handle templatedUri without path after placeholder', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}';
      const hubUrl = 'https://vse.dev.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com');
    });

    it('should handle complex URI with multiple template variables and query params', () => {
      const templatedUri =
        '{{ORIGIN_REPLACE}}/content/{{contentItemId}}/preview?locale={{locale}}&version={{version}}&timestamp={{timestamp}}#main';
      const hubUrl = 'https://vse.prod.example.com';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe(
        'https://vse.prod.example.com/content/{{contentItemId}}/preview?locale={{locale}}&version={{version}}&timestamp={{timestamp}}#main'
      );
    });

    it('should throw error if templatedUri does not contain {{ORIGIN_REPLACE}}', () => {
      const templatedUri = 'https://hardcoded.com/preview';
      const hubUrl = 'https://vse.dev.example.com';

      expect(() => {
        replaceOriginPlaceholder(templatedUri, hubUrl);
      }).toThrow('Template URI must contain {{ORIGIN_REPLACE}} placeholder');
    });

    it('should throw error if hubUrl is empty', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview';
      const hubUrl = '';

      expect(() => {
        replaceOriginPlaceholder(templatedUri, hubUrl);
      }).toThrow('Hub URL cannot be empty');
    });

    it('should throw error if templatedUri is empty', () => {
      const templatedUri = '';
      const hubUrl = 'https://vse.dev.example.com';

      expect(() => {
        replaceOriginPlaceholder(templatedUri, hubUrl);
      }).toThrow('Template URI cannot be empty');
    });

    it('should preserve http protocol if specified in hub URL', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview';
      const hubUrl = 'http://localhost:3000';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('http://localhost:3000/preview');
    });

    it('should handle hub URL with port number', () => {
      const templatedUri = '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}';
      const hubUrl = 'https://vse.dev.example.com:8080';

      const result = replaceOriginPlaceholder(templatedUri, hubUrl);

      expect(result).toBe('https://vse.dev.example.com:8080/preview?id={{contentItemId}}');
    });
  });
});
