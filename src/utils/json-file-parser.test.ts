import fs from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseContentTypesList, parseVisualizationConfig } from './json-file-parser';

vi.mock('fs');

describe('JSON File Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseContentTypesList', () => {
    it('should parse valid content types list JSON file', () => {
      const mockJson = JSON.stringify([
        'https://schema.example.com/type1.json',
        'https://schema.example.com/type2.json',
      ]);

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      const result = parseContentTypesList('/path/to/content-types.json');

      expect(result).toEqual([
        'https://schema.example.com/type1.json',
        'https://schema.example.com/type2.json',
      ]);
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/content-types.json', 'utf-8');
    });

    it('should throw error if file contains invalid JSON', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      expect(() => {
        parseContentTypesList('/path/to/invalid.json');
      }).toThrow('Invalid JSON in content types list file');
    });

    it('should throw error if JSON is not an array', () => {
      const mockJson = JSON.stringify({ key: 'value' });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseContentTypesList('/path/to/invalid.json');
      }).toThrow('Content types list must be an array of strings');
    });

    it('should throw error if array contains non-string elements', () => {
      const mockJson = JSON.stringify(['https://schema.example.com/type1.json', 123, null]);

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseContentTypesList('/path/to/invalid.json');
      }).toThrow('Content types list must be an array of strings');
    });

    it('should throw error if array is empty', () => {
      const mockJson = JSON.stringify([]);

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseContentTypesList('/path/to/empty.json');
      }).toThrow('Content types list cannot be empty');
    });

    it('should throw error if file does not exist', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => {
        parseContentTypesList('/path/to/missing.json');
      }).toThrow('Failed to read content types list file');
    });
  });

  describe('parseVisualizationConfig', () => {
    it('should parse valid visualization config JSON file', () => {
      const mockJson = JSON.stringify({
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
            default: true,
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
          },
        ],
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      const result = parseVisualizationConfig('/path/to/visualizations.json');

      expect(result).toEqual({
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
            default: true,
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live?id={{contentItemId}}&locale={{locale}}',
          },
        ],
      });
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/visualizations.json', 'utf-8');
    });

    it('should throw error if file contains invalid JSON', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Invalid JSON in visualization config file');
    });

    it('should throw error if JSON is not an object', () => {
      const mockJson = JSON.stringify(['array', 'not', 'object']);

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Visualization config must be an object with visualizations array');
    });

    it('should throw error if visualizations property is missing', () => {
      const mockJson = JSON.stringify({ otherKey: 'value' });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Visualization config must be an object with visualizations array');
    });

    it('should throw error if visualizations is not an array', () => {
      const mockJson = JSON.stringify({ visualizations: 'not an array' });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Visualization config must be an object with visualizations array');
    });

    it('should throw error if visualizations array is empty', () => {
      const mockJson = JSON.stringify({ visualizations: [] });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Visualizations array cannot be empty');
    });

    it('should throw error if visualization item is missing label', () => {
      const mockJson = JSON.stringify({
        visualizations: [
          {
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
          },
        ],
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Each visualization must have label and templatedUri properties');
    });

    it('should throw error if visualization item is missing templatedUri', () => {
      const mockJson = JSON.stringify({
        visualizations: [
          {
            label: 'Preview',
          },
        ],
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      expect(() => {
        parseVisualizationConfig('/path/to/invalid.json');
      }).toThrow('Each visualization must have label and templatedUri properties');
    });

    it('should throw error if file does not exist', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => {
        parseVisualizationConfig('/path/to/missing.json');
      }).toThrow('Failed to read visualization config file');
    });

    it('should accept visualization with default property as boolean', () => {
      const mockJson = JSON.stringify({
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
            default: false,
          },
        ],
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockJson);

      const result = parseVisualizationConfig('/path/to/visualizations.json');

      expect(result.visualizations[0].default).toBe(false);
    });
  });
});
