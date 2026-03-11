import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverEmbeddedContent, extractReferencedIds } from './embedded-content-discovery';
import type { AmplienceService } from '../amplience-service';

describe('extractReferencedIds', () => {
  it('should extract content reference IDs from body', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      relatedArticle: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        contentType: 'https://example.com/article',
        id: 'ref-item-123',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['ref-item-123']);
  });

  it('should extract content link IDs from body', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      heroImage: {
        _meta: {
          schema: 'https://example.com/media',
          deliveryId: 'link-item-456',
        },
        image: { url: 'https://cdn.example.com/img.jpg' },
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['link-item-456']);
  });

  it('should extract IDs from arrays of content links', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      components: [
        {
          _meta: {
            schema: 'https://example.com/banner',
            deliveryId: 'comp-1',
          },
          title: 'Banner 1',
        },
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'comp-2',
          },
          title: 'Card 1',
        },
      ],
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['comp-1', 'comp-2']);
  });

  it('should handle nested embedded content', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      section: {
        _meta: {
          schema: 'https://example.com/section',
          deliveryId: 'section-1',
        },
        innerContent: {
          _meta: {
            schema: 'https://example.com/widget',
            deliveryId: 'widget-1',
          },
          text: 'Hello',
        },
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toContain('section-1');
    expect(ids).toContain('widget-1');
  });

  it('should skip inline content without id or deliveryId', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      inlineBlock: {
        _meta: {
          schema: 'https://example.com/block',
        },
        text: 'Inline only — no separate CMS item',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual([]);
  });

  it('should deduplicate IDs', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      ref1: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'same-id',
      },
      ref2: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'same-id',
      },
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual(['same-id']);
  });

  it('should return empty array for body with no references', () => {
    const body = {
      _meta: { schema: 'https://example.com/article' },
      title: 'Simple article',
      text: 'No embedded content here',
    };

    const ids = extractReferencedIds(body as Record<string, unknown>);
    expect(ids).toEqual([]);
  });
});

describe('discoverEmbeddedContent', () => {
  let mockService: AmplienceService;

  beforeEach(() => {
    mockService = {
      getContentItemWithDetails: vi.fn(),
    } as unknown as AmplienceService;
  });

  it('should discover directly referenced items', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'media-1',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('media-1', 'repo-1', {
        _meta: { schema: 'https://example.com/media' },
        url: 'https://cdn.example.com/img.jpg',
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual(['media-1']);
    expect(result.totalDiscovered).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it('should handle circular references without infinite loops', async () => {
    const items = [
      createMockItem('item-a', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        related: {
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
          id: 'item-b',
        },
      }),
    ];

    // item-b references back to item-a
    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('item-b', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        related: {
          _meta: {
            schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
          },
          id: 'item-a', // circular reference back to initial item
        },
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual(['item-b']);
    // item-a was in visited set from the start, so not re-discovered
    expect(mockService.getContentItemWithDetails).toHaveBeenCalledTimes(1);
  });

  it('should warn on cross-repository references', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'media-other-repo',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(
      createMockItem('media-other-repo', 'repo-2', {
        _meta: { schema: 'https://example.com/media' },
      })
    );

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('cross-repository-reference');
  });

  it('should warn on dangling references', async () => {
    const items = [
      createMockItem('root-1', 'repo-1', {
        _meta: { schema: 'https://example.com/page' },
        hero: {
          _meta: {
            schema: 'https://example.com/media',
            deliveryId: 'deleted-item',
          },
        },
      }),
    ];

    vi.mocked(mockService.getContentItemWithDetails).mockResolvedValueOnce(null);

    const result = await discoverEmbeddedContent(mockService, items, 'repo-1');

    expect(result.embeddedItemIds).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('dangling-reference');
  });
});

function createMockItem(
  id: string,
  repoId: string,
  body: Record<string, unknown>
): Amplience.ContentItemWithDetails {
  return {
    id,
    contentRepositoryId: repoId,
    label: `Mock ${id}`,
    locale: 'en-GB',
    schemaId: (body._meta as Record<string, unknown>)?.schema as string,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2026-01-01T00:00:00Z',
    lastModifiedDate: '2026-01-01T00:00:00Z',
    version: 1,
    deliveryId: id,
    validationState: 'VALID',
    body: body as Amplience.Body,
  } as Amplience.ContentItemWithDetails;
}
