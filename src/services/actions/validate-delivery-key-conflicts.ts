import { AmplienceService } from '../amplience-service';

export type DeliveryKeyConflict = {
  deliveryKey: string;
  sourceItems: DeliveryKeyItemSummary[];
  targetItem?: DeliveryKeyTargetItemSummary;
};

export type DeliveryKeyConflictValidationResult =
  | {
      status: 'valid';
      checkedDeliveryKeys: string[];
    }
  | {
      status: 'conflict';
      checkedDeliveryKeys: string[];
      conflicts: DeliveryKeyConflict[];
    }
  | {
      status: 'lookup-failed';
      stage?: 'direct-lookup' | 'repository-inventory';
      checkedDeliveryKeys: string[];
      deliveryKey: string;
      error: string;
      repositoryId?: string;
      repositoryLabel?: string;
    };

export type DeliveryKeyItemSummary = {
  id: string;
  label: string;
};

export type DeliveryKeyTargetItemSummary = DeliveryKeyItemSummary & {
  contentRepositoryId?: string;
};

type ValidateDeliveryKeyConflictsOptions = {
  targetService: AmplienceService;
  items: readonly DeliveryKeyValidationCandidate[];
  onProgress?: (current: number, total: number) => void;
  onInventoryProgress?: (current: number, total: number) => void;
};

type DeliveryKeyValidationCandidate = {
  readonly id: string;
  readonly label: string;
  readonly body: Amplience.Body;
};

const lookupConcurrency = 5;

function compareItems(first: DeliveryKeyItemSummary, second: DeliveryKeyItemSummary): number {
  return first.label.localeCompare(second.label) || first.id.localeCompare(second.id);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toTargetItemSummary(
  item: Amplience.ContentItem,
  contentRepositoryId?: string
): DeliveryKeyTargetItemSummary {
  return {
    id: item.id,
    label: item.label,
    ...(contentRepositoryId ? { contentRepositoryId } : {}),
  };
}

export async function validateDeliveryKeyConflicts({
  targetService,
  items,
  onProgress,
  onInventoryProgress,
}: ValidateDeliveryKeyConflictsOptions): Promise<DeliveryKeyConflictValidationResult> {
  const sourceItemsByKey = new Map<string, Map<string, DeliveryKeyItemSummary>>();

  for (const item of items) {
    const deliveryKey = item.body._meta?.deliveryKey;
    if (!deliveryKey) continue;

    const sourceItems = sourceItemsByKey.get(deliveryKey) || new Map();
    sourceItems.set(item.id, { id: item.id, label: item.label });
    sourceItemsByKey.set(deliveryKey, sourceItems);
  }

  const deliveryKeys = [...sourceItemsByKey.keys()].sort((first, second) =>
    first.localeCompare(second)
  );
  if (deliveryKeys.length === 0) {
    return { status: 'valid', checkedDeliveryKeys: [] };
  }

  const targetItemsByKey = new Map<string, DeliveryKeyTargetItemSummary>();
  const directlyResolvedDeliveryKeys = new Set<string>();
  const queue = [...deliveryKeys];
  let lookupFailure: { deliveryKey: string; error: string } | undefined;
  let inventoryRequired = false;

  const workers = Array.from({ length: Math.min(lookupConcurrency, queue.length) }, async () => {
    while (queue.length > 0 && !lookupFailure && !inventoryRequired) {
      const deliveryKey = queue.shift();
      if (!deliveryKey) return;

      try {
        const targetItem = await targetService.getContentItemByDeliveryKey(deliveryKey);
        if (targetItem) {
          targetItemsByKey.set(
            deliveryKey,
            toTargetItemSummary(targetItem, targetItem.contentRepositoryId)
          );
          directlyResolvedDeliveryKeys.add(deliveryKey);
        } else {
          inventoryRequired = true;
        }
      } catch (error) {
        lookupFailure ||= { deliveryKey, error: getErrorMessage(error) };
      }
    }
  });

  await Promise.all(workers);
  const directlyCheckedDeliveryKeys = [...directlyResolvedDeliveryKeys].sort((first, second) =>
    first.localeCompare(second)
  );

  if (lookupFailure) {
    return {
      status: 'lookup-failed',
      stage: 'direct-lookup',
      checkedDeliveryKeys: directlyCheckedDeliveryKeys,
      deliveryKey: lookupFailure.deliveryKey,
      error: lookupFailure.error,
    };
  }

  if (inventoryRequired) {
    const unresolvedDeliveryKey =
      deliveryKeys.find(deliveryKey => !directlyResolvedDeliveryKeys.has(deliveryKey)) ||
      deliveryKeys[0];
    let repositories: Amplience.ContentRepository[];

    try {
      repositories = await targetService.getRepositories();
    } catch (error) {
      return {
        status: 'lookup-failed',
        stage: 'repository-inventory',
        checkedDeliveryKeys: directlyCheckedDeliveryKeys,
        deliveryKey: unresolvedDeliveryKey,
        error: getErrorMessage(error),
      };
    }

    const candidateDeliveryKeys = new Set(deliveryKeys);

    for (const [repositoryIndex, repository] of repositories.entries()) {
      try {
        for (const status of ['ACTIVE', 'ARCHIVED'] as const) {
          const repositoryItems = await targetService.getAllContentItems(repository.id, () => {}, {
            size: 100,
            sort: 'lastModifiedDate,asc',
            status: status as Amplience.ContentStatus,
          });

          for (const item of repositoryItems) {
            const deliveryKey = item.body._meta?.deliveryKey;
            if (
              deliveryKey &&
              candidateDeliveryKeys.has(deliveryKey) &&
              !targetItemsByKey.has(deliveryKey)
            ) {
              targetItemsByKey.set(deliveryKey, toTargetItemSummary(item, repository.id));
            }
          }
        }
      } catch (error) {
        return {
          status: 'lookup-failed',
          stage: 'repository-inventory',
          checkedDeliveryKeys: directlyCheckedDeliveryKeys,
          deliveryKey: unresolvedDeliveryKey,
          repositoryId: repository.id,
          repositoryLabel: repository.name,
          error: getErrorMessage(error),
        };
      }

      onInventoryProgress?.(repositoryIndex + 1, repositories.length);
    }
  }

  const checkedDeliveryKeys = inventoryRequired ? deliveryKeys : directlyCheckedDeliveryKeys;

  const conflicts = deliveryKeys.flatMap(deliveryKey => {
    const sourceItems = [...(sourceItemsByKey.get(deliveryKey)?.values() || [])].sort(compareItems);
    const targetItem = targetItemsByKey.get(deliveryKey);

    if (sourceItems.length < 2 && !targetItem) {
      return [];
    }

    return [
      {
        deliveryKey,
        sourceItems,
        ...(targetItem
          ? {
              targetItem,
            }
          : {}),
      },
    ];
  });

  onProgress?.(deliveryKeys.length, deliveryKeys.length);

  return conflicts.length > 0
    ? { status: 'conflict', checkedDeliveryKeys, conflicts }
    : { status: 'valid', checkedDeliveryKeys };
}
