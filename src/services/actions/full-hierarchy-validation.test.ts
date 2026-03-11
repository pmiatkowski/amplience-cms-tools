import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  areSchemaBodiesEqual,
  normalizeSchemaBody,
  validateHubCompatibility,
} from './full-hierarchy-validation';
import type { AmplienceService } from '../amplience-service';

describe('normalizeSchemaBody', () => {
  it('should sort object keys alphabetically', () => {
    const body = { z: 1, a: 2, m: 3 };
    const normalized = normalizeSchemaBody(body);
    expect(Object.keys(normalized)).toEqual(['a', 'm', 'z']);
  });

  it('should strip CMS metadata fields', () => {
    const body = {
      id: 'some-id',
      version: 5,
      createdBy: 'user-1',
      createdDate: '2026-01-01',
      lastModifiedBy: 'user-2',
      lastModifiedDate: '2026-02-01',
      title: 'My Schema',
      type: 'object',
    };
    const normalized = normalizeSchemaBody(body);
    expect(normalized).toEqual({ title: 'My Schema', type: 'object' });
  });

  it('should recursively normalize nested objects', () => {
    const body = {
      properties: {
        name: { type: 'string', description: 'Name' },
        age: { description: 'Age', type: 'number' },
      },
    };
    const normalized = normalizeSchemaBody(body) as Record<string, unknown>;
    const props = normalized.properties as Record<string, Record<string, unknown>>;
    expect(Object.keys(props.age)).toEqual(['description', 'type']);
  });
});

describe('areSchemaBodiesEqual', () => {
  it('should return true for identical schemas with different key order', () => {
    const source = {
      type: 'object',
      title: 'Test',
      properties: { a: { type: 'string' } },
    };
    const target = {
      properties: { a: { type: 'string' } },
      title: 'Test',
      type: 'object',
    };
    expect(areSchemaBodiesEqual(source, target)).toBe(true);
  });

  it('should return true when only CMS metadata differs', () => {
    const source = { id: 'src-id', version: 1, title: 'Test' };
    const target = { id: 'tgt-id', version: 3, title: 'Test' };
    expect(areSchemaBodiesEqual(source, target)).toBe(true);
  });

  it('should return false for differing schema bodies', () => {
    const source = { title: 'Test', type: 'object' };
    const target = { title: 'Test', type: 'array' };
    expect(areSchemaBodiesEqual(source, target)).toBe(false);
  });
});

describe('validateHubCompatibility', () => {
  let mockSource: AmplienceService;
  let mockTarget: AmplienceService;

  beforeEach(() => {
    mockSource = {
      getAllSchemas: vi.fn(),
      getAllContentTypes: vi.fn(),
    } as unknown as AmplienceService;

    mockTarget = {
      getAllSchemas: vi.fn(),
      getAllContentTypes: vi.fn(),
    } as unknown as AmplienceService;
  });

  it('should pass when all schemas and content types match', async () => {
    const schemaBody = { title: 'Test', type: 'object' };
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: schemaBody,
        status: 'ACTIVE',
      },
    ] as unknown as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: schemaBody,
        status: 'ACTIVE',
      },
    ] as unknown as Amplience.ContentTypeSchema[]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as unknown as Amplience.ContentType[]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as unknown as Amplience.ContentType[]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when schema is missing in target hub', async () => {
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      { schemaId: 'https://example.com/test', body: {}, status: 'ACTIVE' },
    ] as unknown as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('missing-schema');
    expect(result.errors[0].hub).toBe('target');
  });

  it('should fail when schema bodies differ between hubs', async () => {
    vi.mocked(mockSource.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: { type: 'object' },
        status: 'ACTIVE',
      },
    ] as unknown as Amplience.ContentTypeSchema[]);
    vi.mocked(mockTarget.getAllSchemas).mockResolvedValue([
      {
        schemaId: 'https://example.com/test',
        body: { type: 'array' },
        status: 'ACTIVE',
      },
    ] as unknown as Amplience.ContentTypeSchema[]);
    vi.mocked(mockSource.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as unknown as Amplience.ContentType[]);
    vi.mocked(mockTarget.getAllContentTypes).mockResolvedValue([
      { contentTypeUri: 'https://example.com/test', status: 'ACTIVE' },
    ] as unknown as Amplience.ContentType[]);

    const result = await validateHubCompatibility(mockSource, mockTarget, [
      'https://example.com/test',
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: { type: string }) => e.type === 'schema-mismatch')).toBe(true);
  });
});
