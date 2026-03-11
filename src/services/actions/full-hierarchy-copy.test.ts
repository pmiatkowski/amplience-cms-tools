import { describe, it, expect } from 'vitest';
import { replaceReferenceIdsInBody } from './full-hierarchy-copy';

describe('replaceReferenceIdsInBody', () => {
  it('should replace content reference IDs', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      related: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'source-id-1',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-id-1', 'target-id-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const related = result.related as Record<string, unknown>;
    expect(related.id).toBe('target-id-1');
  });

  it('should replace content link deliveryIds in _meta', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      hero: {
        _meta: {
          schema: 'https://example.com/media',
          deliveryId: 'source-delivery-1',
        },
        image: {},
      },
    } as unknown as Amplience.Body;

    const mapping = new Map([['source-delivery-1', 'target-delivery-1']]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const hero = result.hero as Record<string, unknown>;
    const meta = hero._meta as Record<string, unknown>;
    expect(meta.deliveryId).toBe('target-delivery-1');
  });

  it('should handle nested references in arrays', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      components: [
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-1',
          },
        },
        {
          _meta: {
            schema: 'https://example.com/card',
            deliveryId: 'src-2',
          },
        },
      ],
    } as unknown as Amplience.Body;

    const mapping = new Map([
      ['src-1', 'tgt-1'],
      ['src-2', 'tgt-2'],
    ]);
    const result = replaceReferenceIdsInBody(body, mapping);

    const components = result.components as Array<Record<string, unknown>>;
    expect((components[0]._meta as Record<string, unknown>).deliveryId).toBe('tgt-1');
    expect((components[1]._meta as Record<string, unknown>).deliveryId).toBe('tgt-2');
  });

  it('should not modify IDs that are not in the mapping', () => {
    const body = {
      _meta: { schema: 'https://example.com/page' },
      ref: {
        _meta: {
          schema: 'http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference',
        },
        id: 'unknown-id',
      },
    } as unknown as Amplience.Body;

    const mapping = new Map<string, string>();
    const result = replaceReferenceIdsInBody(body, mapping);

    const ref = result.ref as Record<string, unknown>;
    expect(ref.id).toBe('unknown-id');
  });
});
