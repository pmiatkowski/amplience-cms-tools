import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import { validateContentTypeAssignments } from './validate-content-type-assignments';

describe('validateContentTypeAssignments', () => {
  const targetService = {
    getContentTypes: vi.fn(),
  } as unknown as AmplienceService;

  const createItem = (
    id: string,
    label: string,
    options: { schemaId?: string; bodySchema?: string } = {}
  ): Amplience.ContentItemWithDetails =>
    ({
      id,
      label,
      body: options.bodySchema ? { _meta: { schema: options.bodySchema } } : {},
      ...(options.schemaId ? { schemaId: options.schemaId } : {}),
    }) as Amplience.ContentItemWithDetails;

  const createContentType = (contentTypeUri: string): Amplience.ContentType =>
    ({ contentTypeUri }) as Amplience.ContentType;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when every required content type is assigned', async () => {
    vi.mocked(targetService.getContentTypes).mockResolvedValue([
      createContentType('https://schema.example.com/one'),
      createContentType('https://schema.example.com/two'),
    ]);

    const result = await validateContentTypeAssignments({
      targetService,
      targetRepositoryId: 'target-repo',
      items: [
        createItem('item-1', 'Primary schema', {
          schemaId: 'https://schema.example.com/one',
          bodySchema: 'https://schema.example.com/ignored',
        }),
        createItem('item-2', 'Body schema', {
          bodySchema: 'https://schema.example.com/two',
        }),
      ],
    });

    expect(result).toEqual({
      status: 'valid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: ['https://schema.example.com/one', 'https://schema.example.com/two'],
    });
  });

  it('groups missing assignments by URI and deduplicates affected items', async () => {
    vi.mocked(targetService.getContentTypes).mockResolvedValue([
      createContentType('https://schema.example.com/assigned'),
    ]);

    const duplicateItem = createItem('item-2', 'Beta', {
      schemaId: 'https://schema.example.com/missing-a',
    });
    const result = await validateContentTypeAssignments({
      targetService,
      targetRepositoryId: 'target-repo',
      items: [
        createItem('item-3', 'Zulu', {
          schemaId: 'https://schema.example.com/missing-b',
        }),
        duplicateItem,
        createItem('item-1', 'Alpha', {
          schemaId: 'https://schema.example.com/missing-a',
        }),
        duplicateItem,
        createItem('item-4', 'Assigned', {
          schemaId: 'https://schema.example.com/assigned',
        }),
      ],
    });

    expect(result).toEqual({
      status: 'invalid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: [
        'https://schema.example.com/assigned',
        'https://schema.example.com/missing-a',
        'https://schema.example.com/missing-b',
      ],
      missingContentTypes: [
        {
          contentTypeUri: 'https://schema.example.com/missing-a',
          itemCount: 2,
          items: [
            { id: 'item-1', label: 'Alpha' },
            { id: 'item-2', label: 'Beta' },
          ],
        },
        {
          contentTypeUri: 'https://schema.example.com/missing-b',
          itemCount: 1,
          items: [{ id: 'item-3', label: 'Zulu' }],
        },
      ],
      itemsWithoutSchema: [],
    });
  });

  it('reports items without schema metadata separately', async () => {
    vi.mocked(targetService.getContentTypes).mockResolvedValue([
      createContentType('https://schema.example.com/assigned'),
    ]);

    const result = await validateContentTypeAssignments({
      targetService,
      targetRepositoryId: 'target-repo',
      items: [
        createItem('item-2', 'Unknown'),
        createItem('item-1', 'Assigned', {
          schemaId: 'https://schema.example.com/assigned',
        }),
      ],
    });

    expect(result).toEqual({
      status: 'invalid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: ['https://schema.example.com/assigned'],
      missingContentTypes: [],
      itemsWithoutSchema: [{ id: 'item-2', label: 'Unknown' }],
    });
  });

  it('passes without loading assignments when there are no candidate items', async () => {
    const result = await validateContentTypeAssignments({
      targetService,
      targetRepositoryId: 'target-repo',
      items: [],
    });

    expect(result).toEqual({
      status: 'valid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: [],
    });
    expect(targetService.getContentTypes).not.toHaveBeenCalled();
  });

  it('returns assignment lookup failures as a distinct result', async () => {
    vi.mocked(targetService.getContentTypes).mockRejectedValue(
      new Error('API Error: 403 Forbidden')
    );

    const result = await validateContentTypeAssignments({
      targetService,
      targetRepositoryId: 'target-repo',
      items: [
        createItem('item-1', 'Item', {
          schemaId: 'https://schema.example.com/one',
        }),
      ],
    });

    expect(result).toEqual({
      status: 'lookup-failed',
      targetRepositoryId: 'target-repo',
      error: 'API Error: 403 Forbidden',
    });
  });
});
