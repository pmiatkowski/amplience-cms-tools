import { applicationConfig } from '../../config';
import { AmplienceService } from '../amplience-service';
import {
  resolveContentReferences,
  type ResolverFailurePhase,
  type ResolverResult,
} from '../content-reference';
import {
  validateContentTypeAssignments,
  type ContentTypeAssignmentValidationResult,
  type ContentTypeValidationCandidate,
} from './validate-content-type-assignments';
import {
  validateDeliveryKeyConflicts,
  type DeliveryKeyConflictValidationResult,
} from './validate-delivery-key-conflicts';

type ValidAssignmentResult = Extract<ContentTypeAssignmentValidationResult, { status: 'valid' }>;
type InvalidAssignmentResult = Extract<
  ContentTypeAssignmentValidationResult,
  { status: 'invalid' }
>;
type AssignmentLookupFailure = Extract<
  ContentTypeAssignmentValidationResult,
  { status: 'lookup-failed' }
>;
type DeliveryKeyConflictResult = Extract<
  DeliveryKeyConflictValidationResult,
  { status: 'conflict' }
>;
type DeliveryKeyLookupFailure = Extract<
  DeliveryKeyConflictValidationResult,
  { status: 'lookup-failed' }
>;

type PreflightContext = {
  sourceRepositoryId: string;
  targetRepositoryId: string;
  initialItemIds: string[];
};

export type ContentItemRecreationPreflightBlocked =
  | (PreflightContext & {
      status: 'blocked';
      reason: 'reference-discovery-failed';
      error: string;
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'reference-resolution-failed';
      phase: Exclude<ResolverFailurePhase, 'discovery'>;
      error: string;
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'source-items-unavailable';
      missingItemIds: string[];
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'content-type-validation-failed';
      validation: InvalidAssignmentResult;
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'content-type-lookup-failed';
      validation: AssignmentLookupFailure;
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'delivery-key-conflicts';
      validation: DeliveryKeyConflictResult;
    })
  | (PreflightContext & {
      status: 'blocked';
      reason: 'delivery-key-lookup-failed';
      validation: DeliveryKeyLookupFailure;
    });

export type ContentItemRecreationPreflightOptions = {
  sourceService: AmplienceService;
  targetService: AmplienceService;
  sourceRepositoryId: string;
  targetRepositoryId: string;
  initialItemIds: readonly string[];
  abortOnReferenceDiscoveryFailure?: boolean;
  onProgress?: (phase: string, current: number, total: number) => void;
};

export type ContentItemRecreationPreflightReady = PreflightContext & {
  status: 'ready';
  validation: ValidAssignmentResult;
  referenceResolution: ResolverResult;
  referenceSummary?: ContentItemRecreationReferenceSummary;
  sourceItems: Map<string, Amplience.ContentItemWithDetails>;
  warnings: string[];
};

export type ContentItemRecreationPreflightResult =
  | ContentItemRecreationPreflightReady
  | ContentItemRecreationPreflightBlocked;

export type ContentItemRecreationReferenceSummary = {
  totalDiscovered: number;
  matchedReferences: number;
  itemsToCreate: number;
  externalReferences: number;
  circularGroups: number;
};

const relaxedDiscoveryWarning =
  'Reference discovery failed. Only explicitly selected and hierarchy items were validated; content references will be nullified.';

async function fetchKnownItems(
  sourceService: AmplienceService,
  initialItemIds: readonly string[]
): Promise<{
  items: Amplience.ContentItemWithDetails[];
  missingItemIds: string[];
}> {
  const items: Amplience.ContentItemWithDetails[] = [];
  const missingItemIds: string[] = [];

  for (const itemId of initialItemIds) {
    try {
      const item = await sourceService.getContentItemWithDetails(itemId);
      if (item) {
        items.push(item);
      } else {
        missingItemIds.push(itemId);
      }
    } catch {
      missingItemIds.push(itemId);
    }
  }

  return { items, missingItemIds };
}

export async function preflightContentItemRecreation({
  sourceService,
  targetService,
  sourceRepositoryId,
  targetRepositoryId,
  initialItemIds: requestedItemIds,
  abortOnReferenceDiscoveryFailure,
  onProgress,
}: ContentItemRecreationPreflightOptions): Promise<ContentItemRecreationPreflightResult> {
  const initialItemIds = [...new Set(requestedItemIds)];
  const context: PreflightContext = {
    sourceRepositoryId,
    targetRepositoryId,
    initialItemIds,
  };
  const referenceResolution = await resolveContentReferences({
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    initialItemIds,
    ...(onProgress ? { onProgress } : {}),
  });
  const shouldAbortOnDiscoveryFailure =
    abortOnReferenceDiscoveryFailure ??
    applicationConfig.contentTypeValidation.abortOnReferenceDiscoveryFailure;

  let candidates: ContentTypeValidationCandidate[];
  let referenceSummary: ContentItemRecreationReferenceSummary | undefined;
  let sourceItems: Map<string, Amplience.ContentItemWithDetails>;
  let warnings: string[] = [];

  if (referenceResolution.success) {
    const initialItemIdSet = new Set(initialItemIds);
    const candidateItems = new Map<string, Amplience.ContentItemWithDetails>();
    const missingItemIds: string[] = [];

    for (const itemId of initialItemIds) {
      const entry = referenceResolution.registry.entries.get(itemId);
      if (entry?.sourceItem) {
        candidateItems.set(itemId, entry.sourceItem);
      } else {
        missingItemIds.push(itemId);
      }
    }

    if (missingItemIds.length > 0) {
      return {
        status: 'blocked',
        reason: 'source-items-unavailable',
        ...context,
        missingItemIds,
      };
    }

    for (const [sourceId, entry] of referenceResolution.registry.entries) {
      const isAdditionalCreationCandidate =
        !initialItemIdSet.has(sourceId) &&
        !entry.targetId &&
        !referenceResolution.registry.externalReferenceIds.has(sourceId);

      if (isAdditionalCreationCandidate) {
        candidateItems.set(sourceId, entry.sourceItem);
      }
    }

    candidates = [...candidateItems.values()];
    referenceSummary = {
      totalDiscovered: new Set([
        ...referenceResolution.registry.entries.keys(),
        ...referenceResolution.registry.externalReferenceIds,
      ]).size,
      matchedReferences: [...referenceResolution.registry.entries].filter(
        ([sourceId, entry]) => !initialItemIdSet.has(sourceId) && Boolean(entry.targetId)
      ).length,
      itemsToCreate: candidateItems.size,
      externalReferences: referenceResolution.registry.externalReferenceIds.size,
      circularGroups: referenceResolution.resolution.circularGroups.length,
    };
    sourceItems = candidateItems;
  } else {
    if (referenceResolution.failurePhase !== 'discovery') {
      return {
        status: 'blocked',
        reason: 'reference-resolution-failed',
        ...context,
        phase: referenceResolution.failurePhase,
        error: referenceResolution.error,
      };
    }

    if (shouldAbortOnDiscoveryFailure) {
      return {
        status: 'blocked',
        reason: 'reference-discovery-failed',
        ...context,
        error: referenceResolution.error || 'Reference discovery failed',
      };
    }

    const knownItems = await fetchKnownItems(sourceService, initialItemIds);
    if (knownItems.missingItemIds.length > 0) {
      return {
        status: 'blocked',
        reason: 'source-items-unavailable',
        ...context,
        missingItemIds: knownItems.missingItemIds,
      };
    }

    candidates = knownItems.items;
    sourceItems = new Map(knownItems.items.map(item => [item.id, item]));
    warnings = [relaxedDiscoveryWarning];
  }

  const validation = await validateContentTypeAssignments({
    targetService,
    targetRepositoryId,
    items: candidates,
  });

  if (validation.status === 'lookup-failed') {
    return {
      status: 'blocked',
      reason: 'content-type-lookup-failed',
      ...context,
      validation,
    };
  }

  if (validation.status === 'invalid') {
    return {
      status: 'blocked',
      reason: 'content-type-validation-failed',
      ...context,
      validation,
    };
  }

  const deliveryKeyValidation = await validateDeliveryKeyConflicts({
    targetService,
    items: candidates,
    ...(onProgress
      ? {
          onProgress: (current: number, total: number): void =>
            onProgress('delivery-key-validation', current, total),
          onInventoryProgress: (current: number, total: number): void =>
            onProgress('delivery-key-inventory', current, total),
        }
      : {}),
  });

  if (deliveryKeyValidation.status === 'lookup-failed') {
    return {
      status: 'blocked',
      reason: 'delivery-key-lookup-failed',
      ...context,
      validation: deliveryKeyValidation,
    };
  }

  if (deliveryKeyValidation.status === 'conflict') {
    return {
      status: 'blocked',
      reason: 'delivery-key-conflicts',
      ...context,
      validation: deliveryKeyValidation,
    };
  }

  return {
    status: 'ready',
    ...context,
    validation,
    referenceResolution,
    ...(referenceSummary ? { referenceSummary } : {}),
    sourceItems,
    warnings,
  };
}
