import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '~/services/amplience-service';
import { filterContentTypesByRegex } from '~/utils';
import { parseContentTypesList } from '~/utils/json-file-parser';
import {
  promptForContentTypeSelectionMethod,
  promptForRegexPattern,
  promptForContentTypesFile,
  promptForContentTypeSelection,
} from './prompts';

vi.mock('./prompts');
vi.mock('~/utils/json-file-parser');
vi.mock('~/services/amplience-service');

describe('Content Type Selection - Integration Tests', () => {
  const mockContentTypes: Amplience.ContentType[] = [
    {
      id: '1',
      hubContentTypeId: 'hub-1',
      contentTypeUri: 'https://schema.example.com/article.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: { label: 'Article' },
    },
    {
      id: '2',
      hubContentTypeId: 'hub-2',
      contentTypeUri: 'https://schema.example.com/blog-post.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: { label: 'Blog Post' },
    },
    {
      id: '3',
      hubContentTypeId: 'hub-3',
      contentTypeUri: 'https://schema.example.com/product.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: { label: 'Product' },
    },
    {
      id: '4',
      hubContentTypeId: 'hub-4',
      contentTypeUri: 'https://different.example.com/banner.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
      settings: { label: 'Banner' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('API Method Flow', () => {
    it('should complete full API selection flow: method → regex → filter → multiselect', async () => {
      // Mock user selecting API method
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('api');

      // Mock user entering regex pattern
      vi.mocked(promptForRegexPattern).mockResolvedValue('https://schema\\.example\\.com/.*');

      // Mock AmplienceService returning all content types
      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      // Mock user selecting specific content types
      const filteredTypes = mockContentTypes.slice(0, 3); // First 3 match the regex
      vi.mocked(promptForContentTypeSelection).mockResolvedValue([
        filteredTypes[0],
        filteredTypes[2],
      ]);

      // Execute the flow
      const method = await promptForContentTypeSelectionMethod();
      expect(method).toBe('api');

      const pattern = await promptForRegexPattern();
      expect(pattern).toBe('https://schema\\.example\\.com/.*');

      const allTypes = await mockService.getAllContentTypes();
      const filtered = filterContentTypesByRegex(allTypes, pattern);
      expect(filtered).toHaveLength(3);
      expect(filtered.every(ct => ct.contentTypeUri.startsWith('https://schema.example.com/'))).toBe(true);

      const selected = await promptForContentTypeSelection(filtered);
      expect(selected).toHaveLength(2);
      expect(selected[0].id).toBe('1');
      expect(selected[1].id).toBe('3');
    });

    it('should filter content types correctly based on regex pattern', async () => {
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('api');
      vi.mocked(promptForRegexPattern).mockResolvedValue('.*article.*');

      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      vi.mocked(promptForContentTypeSelection).mockResolvedValue([mockContentTypes[0]]);

      await promptForContentTypeSelectionMethod();
      const pattern = await promptForRegexPattern();
      const allTypes = await mockService.getAllContentTypes();
      const filtered = filterContentTypesByRegex(allTypes, pattern);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].contentTypeUri).toContain('article');

      const selected = await promptForContentTypeSelection(filtered);
      expect(selected).toHaveLength(1);
    });

    it('should handle case where no content types match the regex', async () => {
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('api');
      vi.mocked(promptForRegexPattern).mockResolvedValue('nonexistent-pattern');

      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      vi.mocked(promptForContentTypeSelection).mockResolvedValue([]);

      const pattern = await promptForRegexPattern();
      const allTypes = await mockService.getAllContentTypes();
      const filtered = filterContentTypesByRegex(allTypes, pattern);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('File Method Flow', () => {
    it('should complete full file selection flow: method → file path → parse → multiselect', async () => {
      // Mock user selecting File method
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('file');

      // Mock user entering file path
      vi.mocked(promptForContentTypesFile).mockResolvedValue('./config/content-types.json');

      // Mock parseContentTypesList returning URIs from file
      const urisFromFile = [
        'https://schema.example.com/article.json',
        'https://schema.example.com/product.json',
      ];
      vi.mocked(parseContentTypesList).mockResolvedValue(urisFromFile);

      // Mock AmplienceService returning all content types
      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      // Mock user selecting content types from filtered list
      const matchedTypes = mockContentTypes.filter(ct => urisFromFile.includes(ct.contentTypeUri));
      vi.mocked(promptForContentTypeSelection).mockResolvedValue([matchedTypes[0]]);

      // Execute the flow
      const method = await promptForContentTypeSelectionMethod();
      expect(method).toBe('file');

      const filePath = await promptForContentTypesFile();
      expect(filePath).toBe('./config/content-types.json');

      const uris = await parseContentTypesList(filePath);
      expect(uris).toEqual(urisFromFile);

      const allTypes = await mockService.getAllContentTypes();
      const matched = allTypes.filter(ct => uris.includes(ct.contentTypeUri));
      expect(matched).toHaveLength(2);
      expect(matched.map(ct => ct.id)).toEqual(['1', '3']);

      const selected = await promptForContentTypeSelection(matched);
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('1');
    });

    it('should handle file with multiple content type URIs', async () => {
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('file');
      vi.mocked(promptForContentTypesFile).mockResolvedValue('./config/types.json');

      const urisFromFile = [
        'https://schema.example.com/article.json',
        'https://schema.example.com/blog-post.json',
        'https://schema.example.com/product.json',
      ];
      vi.mocked(parseContentTypesList).mockResolvedValue(urisFromFile);

      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      const matchedTypes = mockContentTypes.filter(ct => urisFromFile.includes(ct.contentTypeUri));
      vi.mocked(promptForContentTypeSelection).mockResolvedValue(matchedTypes);

      const filePath = await promptForContentTypesFile();
      const uris = await parseContentTypesList(filePath);
      const allTypes = await mockService.getAllContentTypes();
      const matched = allTypes.filter(ct => uris.includes(ct.contentTypeUri));

      expect(matched).toHaveLength(3);
      expect(matched.map(ct => ct.contentTypeUri)).toEqual(urisFromFile);
    });

    it('should handle file with URIs that do not match any content types', async () => {
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('file');
      vi.mocked(promptForContentTypesFile).mockResolvedValue('./config/empty.json');

      const urisFromFile = [
        'https://nonexistent.example.com/type1.json',
        'https://nonexistent.example.com/type2.json',
      ];
      vi.mocked(parseContentTypesList).mockResolvedValue(urisFromFile);

      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;

      vi.mocked(promptForContentTypeSelection).mockResolvedValue([]);

      const uris = await parseContentTypesList('./config/empty.json');
      const allTypes = await mockService.getAllContentTypes();
      const matched = allTypes.filter(ct => uris.includes(ct.contentTypeUri));

      expect(matched).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid regex pattern gracefully', () => {
      const invalidPattern = '[invalid(regex';

      expect(() => {
        filterContentTypesByRegex(mockContentTypes, invalidPattern);
      }).toThrow('Invalid regex pattern');
    });

    it('should handle empty content types array in API flow', async () => {
      vi.mocked(promptForContentTypeSelectionMethod).mockResolvedValue('api');
      vi.mocked(promptForRegexPattern).mockResolvedValue('.*');

      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue([]),
      } as unknown as AmplienceService;

      vi.mocked(promptForContentTypeSelection).mockResolvedValue([]);

      const allTypes = await mockService.getAllContentTypes();
      const filtered = filterContentTypesByRegex(allTypes, '.*');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Cross-Method Comparison', () => {
    it('should be able to select same content types via API or File method', async () => {
      const targetUris = [
        'https://schema.example.com/article.json',
        'https://schema.example.com/product.json',
      ];

      // API method
      const apiFiltered = filterContentTypesByRegex(mockContentTypes, 'https://schema\\.example\\.com/(article|product)\\.json$');

      // File method
      const mockService = {
        getAllContentTypes: vi.fn().mockResolvedValue(mockContentTypes),
      } as unknown as AmplienceService;
      const allTypes = await mockService.getAllContentTypes();
      const fileMatched = allTypes.filter(ct => targetUris.includes(ct.contentTypeUri));

      // Both methods should yield the same content types
      expect(apiFiltered.map(ct => ct.contentTypeUri).sort()).toEqual(
        fileMatched.map(ct => ct.contentTypeUri).sort()
      );
      expect(apiFiltered).toHaveLength(2);
      expect(fileMatched).toHaveLength(2);
    });
  });
});
