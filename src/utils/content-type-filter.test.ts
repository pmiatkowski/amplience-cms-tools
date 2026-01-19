import { describe, it, expect } from 'vitest';
import { filterContentTypesByRegex } from './content-type-filter';

describe('filterContentTypesByRegex', () => {
  const mockContentTypes: Amplience.ContentType[] = [
    {
      id: '1',
      hubContentTypeId: 'hub-1',
      contentTypeUri: 'https://schema.example.com/article.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
    },
    {
      id: '2',
      hubContentTypeId: 'hub-2',
      contentTypeUri: 'https://schema.example.com/blog-post.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
    },
    {
      id: '3',
      hubContentTypeId: 'hub-3',
      contentTypeUri: 'https://schema.example.com/product.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
    },
    {
      id: '4',
      hubContentTypeId: 'hub-4',
      contentTypeUri: 'https://different.example.com/article.json',
      status: 'ACTIVE' as Amplience.ContentTypeStatus,
    },
    {
      id: '5',
      hubContentTypeId: 'hub-5',
      contentTypeUri: 'https://schema.example.com/banner.json',
      status: 'ARCHIVED' as Amplience.ContentTypeStatus,
    },
  ];

  it('should filter content types matching a simple pattern', () => {
    const pattern = 'article';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(2);
    expect(result[0].contentTypeUri).toBe('https://schema.example.com/article.json');
    expect(result[1].contentTypeUri).toBe('https://different.example.com/article.json');
  });

  it('should filter content types with regex pattern for specific domain', () => {
    const pattern = '^https://schema\\.example\\.com/.*';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(4);
    expect(result.every(ct => ct.contentTypeUri.startsWith('https://schema.example.com/'))).toBe(
      true
    );
  });

  it('should filter content types matching wildcard pattern', () => {
    const pattern = '.*blog.*';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(1);
    expect(result[0].contentTypeUri).toBe('https://schema.example.com/blog-post.json');
  });

  it('should return empty array when no matches found', () => {
    const pattern = 'nonexistent';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(0);
  });

  it('should handle case-insensitive matching', () => {
    const pattern = 'ARTICLE';
    const result = filterContentTypesByRegex(mockContentTypes, pattern, { caseInsensitive: true });

    expect(result).toHaveLength(2);
  });

  it('should handle case-sensitive matching by default', () => {
    const pattern = 'ARTICLE';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(0);
  });

  it('should filter with complex regex pattern', () => {
    const pattern = 'https://schema\\.example\\.com/(article|product)\\.json$';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(2);
    expect(result[0].contentTypeUri).toBe('https://schema.example.com/article.json');
    expect(result[1].contentTypeUri).toBe('https://schema.example.com/product.json');
  });

  it('should handle invalid regex pattern gracefully', () => {
    const pattern = '[invalid(regex';

    expect(() => {
      filterContentTypesByRegex(mockContentTypes, pattern);
    }).toThrow();
  });

  it('should return empty array for empty content types array', () => {
    const pattern = 'article';
    const result = filterContentTypesByRegex([], pattern);

    expect(result).toHaveLength(0);
  });

  it('should filter regardless of content type status', () => {
    const pattern = 'banner';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ARCHIVED');
  });

  it('should match entire URI string', () => {
    const pattern = '^https://schema\\.example\\.com/article\\.json$';
    const result = filterContentTypesByRegex(mockContentTypes, pattern);

    expect(result).toHaveLength(1);
    expect(result[0].contentTypeUri).toBe('https://schema.example.com/article.json');
  });
});
