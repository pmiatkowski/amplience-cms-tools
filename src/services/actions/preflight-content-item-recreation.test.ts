import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmplienceService } from '../amplience-service';
import * as contentReferenceModule from '../content-reference';
import { preflightContentItemRecreation } from './preflight-content-item-recreation';
import * as validationModule from './validate-content-type-assignments';
import type {
  ReferenceRegistry,
  ReferenceRegistryEntry,
  ResolverResult,
} from '../content-reference';

describe('preflightContentItemRecreation', () => {
  const sourceService = {
    getContentItemWithDetails: vi.fn(),
  } as unknown as AmplienceService;
  const targetService = {} as AmplienceService;

  const createItem = (id: string, label: string): Amplience.ContentItemWithDetails =>
    ({
      id,
      label,
      schemaId: `https://schema.example.com/${id}`,
      body: { _meta: { schema: `https://schema.example.com/${id}` } },
    }) as Amplience.ContentItemWithDetails;

  const createEntry = (
    sourceItem: Amplience.ContentItemWithDetails,
    targetId?: string
  ): ReferenceRegistryEntry => ({
    sourceItem,
    references: [],
    referencesTo: [],
    referencedBy: [],
    processed: false,
    ...(targetId ? { targetId } : {}),
  });

  const createResolverResult = (options: {
    entries?: Array<[string, ReferenceRegistryEntry]>;
    externalIds?: string[];
    success?: boolean;
    error?: string;
    failurePhase?: 'discovery' | 'matching' | 'planning';
  }): ResolverResult => {
    const entries = new Map(options.entries || []);
    const registry: ReferenceRegistry = {
      entries,
      sourceToTargetIdMap: new Map(
        [...entries]
          .filter(([, entry]) => entry.targetId)
          .map(([sourceId, entry]) => [sourceId, entry.targetId!] as const)
      ),
      unresolvedIds: new Set(),
      externalReferenceIds: new Set(options.externalIds || []),
    };

    const resolution = {
      totalDiscovered: entries.size,
      matchedCount: registry.sourceToTargetIdMap.size,
      toCreateCount: entries.size - registry.sourceToTargetIdMap.size,
      unresolvedCount: 0,
      externalCount: registry.externalReferenceIds.size,
      circularGroups: [],
      registry,
      creationOrder: [...entries.keys()],
    };

    if (options.success === false) {
      return {
        success: false,
        resolution,
        registry,
        error: options.error || 'Reference resolution failed',
        failurePhase: options.failurePhase || 'discovery',
      };
    }

    return {
      success: true,
      resolution,
      registry,
    };
  };

  const validAssignmentResult: validationModule.ContentTypeAssignmentValidationResult = {
    status: 'valid',
    targetRepositoryId: 'target-repo',
    requiredContentTypeUris: ['https://schema.example.com/initial-1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(contentReferenceModule, 'resolveContentReferences');
    vi.spyOn(validationModule, 'validateContentTypeAssignments').mockResolvedValue(
      validAssignmentResult
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates initial items and only unmatched non-external referenced items', async () => {
    const initialOne = createItem('initial-1', 'Initial one');
    const initialTwo = createItem('initial-2', 'Initial two');
    const unmatchedReference = createItem('reference-new', 'New reference');
    const matchedReference = createItem('reference-matched', 'Matched reference');
    const externalReference = createItem('reference-external', 'External reference');
    const resolverResult = createResolverResult({
      entries: [
        ['initial-1', createEntry(initialOne, 'existing-initial-match')],
        ['initial-2', createEntry(initialTwo)],
        ['reference-new', createEntry(unmatchedReference)],
        ['reference-matched', createEntry(matchedReference, 'target-reference')],
        ['reference-external', createEntry(externalReference)],
      ],
      externalIds: ['reference-external'],
    });
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(resolverResult);

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
    });

    const validationCall = vi.mocked(validationModule.validateContentTypeAssignments).mock
      .calls[0][0];
    expect(validationCall.items.map(item => item.id)).toEqual([
      'initial-1',
      'initial-2',
      'reference-new',
    ]);
    expect(result).toEqual({
      status: 'ready',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
      validation: validAssignmentResult,
      referenceResolution: resolverResult,
      referenceSummary: {
        totalDiscovered: 5,
        matchedReferences: 1,
        itemsToCreate: 3,
        externalReferences: 1,
        circularGroups: 0,
      },
      sourceItems: new Map([
        ['initial-1', initialOne],
        ['initial-2', initialTwo],
        ['reference-new', unmatchedReference],
      ]),
      warnings: [],
    });
  });

  it('blocks when successful discovery did not resolve every initial item', async () => {
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(
      createResolverResult({
        entries: [['initial-1', createEntry(createItem('initial-1', 'Initial one'))]],
      })
    );

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
    });

    expect(result).toEqual({
      status: 'blocked',
      reason: 'source-items-unavailable',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
      missingItemIds: ['initial-2'],
    });
    expect(validationModule.validateContentTypeAssignments).not.toHaveBeenCalled();
  });

  it('blocks reference discovery failures in strict mode by default', async () => {
    const resolverResult = createResolverResult({
      success: false,
      error: 'Discovery API unavailable',
    });
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(resolverResult);

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
    });

    expect(result).toEqual({
      status: 'blocked',
      reason: 'reference-discovery-failed',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      error: 'Discovery API unavailable',
    });
    expect(sourceService.getContentItemWithDetails).not.toHaveBeenCalled();
    expect(validationModule.validateContentTypeAssignments).not.toHaveBeenCalled();
  });

  it('validates known items and preserves the failure in relaxed mode', async () => {
    const resolverResult = createResolverResult({
      success: false,
      error: 'Discovery API unavailable',
    });
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(resolverResult);
    vi.mocked(sourceService.getContentItemWithDetails).mockImplementation(async itemId =>
      itemId === 'initial-1' ? createItem(itemId, 'Initial one') : createItem(itemId, 'Initial two')
    );

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
      abortOnReferenceDiscoveryFailure: false,
    });

    const validationCall = vi.mocked(validationModule.validateContentTypeAssignments).mock
      .calls[0][0];
    expect(validationCall.items.map(item => item.id)).toEqual(['initial-1', 'initial-2']);
    expect(result).toEqual({
      status: 'ready',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1', 'initial-2'],
      validation: validAssignmentResult,
      referenceResolution: resolverResult,
      sourceItems: new Map([
        ['initial-1', createItem('initial-1', 'Initial one')],
        ['initial-2', createItem('initial-2', 'Initial two')],
      ]),
      warnings: [
        'Reference discovery failed. Only explicitly selected and hierarchy items were validated; content references will be nullified.',
      ],
    });
  });

  it('blocks target matching failures even when discovery failures are allowed', async () => {
    const resolverResult = createResolverResult({
      success: false,
      error: 'Target repository unavailable',
      failurePhase: 'matching',
    });
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(resolverResult);

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      abortOnReferenceDiscoveryFailure: false,
    });

    expect(result).toEqual({
      status: 'blocked',
      reason: 'reference-resolution-failed',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      phase: 'matching',
      error: 'Target repository unavailable',
    });
    expect(sourceService.getContentItemWithDetails).not.toHaveBeenCalled();
    expect(validationModule.validateContentTypeAssignments).not.toHaveBeenCalled();
  });

  it('blocks missing assignments even when discovery failure is allowed', async () => {
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(
      createResolverResult({ success: false, error: 'Discovery API unavailable' })
    );
    vi.mocked(sourceService.getContentItemWithDetails).mockResolvedValue(
      createItem('initial-1', 'Initial one')
    );
    const invalidValidation: validationModule.ContentTypeAssignmentValidationResult = {
      status: 'invalid',
      targetRepositoryId: 'target-repo',
      requiredContentTypeUris: ['https://schema.example.com/initial-1'],
      missingContentTypes: [
        {
          contentTypeUri: 'https://schema.example.com/initial-1',
          itemCount: 1,
          items: [{ id: 'initial-1', label: 'Initial one' }],
        },
      ],
      itemsWithoutSchema: [],
    };
    vi.mocked(validationModule.validateContentTypeAssignments).mockResolvedValue(invalidValidation);

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      abortOnReferenceDiscoveryFailure: false,
    });

    expect(result).toEqual({
      status: 'blocked',
      reason: 'content-type-validation-failed',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      validation: invalidValidation,
    });
  });

  it('blocks repository assignment lookup failures distinctly', async () => {
    vi.mocked(contentReferenceModule.resolveContentReferences).mockResolvedValue(
      createResolverResult({
        entries: [['initial-1', createEntry(createItem('initial-1', 'Initial one'))]],
      })
    );
    const lookupFailure: validationModule.ContentTypeAssignmentValidationResult = {
      status: 'lookup-failed',
      targetRepositoryId: 'target-repo',
      error: 'API Error: 403 Forbidden',
    };
    vi.mocked(validationModule.validateContentTypeAssignments).mockResolvedValue(lookupFailure);

    const result = await preflightContentItemRecreation({
      sourceService,
      targetService,
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
    });

    expect(result).toEqual({
      status: 'blocked',
      reason: 'content-type-lookup-failed',
      sourceRepositoryId: 'source-repo',
      targetRepositoryId: 'target-repo',
      initialItemIds: ['initial-1'],
      validation: lookupFailure,
    });
  });
});
