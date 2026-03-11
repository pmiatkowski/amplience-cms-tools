import { AmplienceService } from '../amplience-service';

export type DuplicateResolution =
  | { action: 'create'; label: string }
  | { action: 'skip'; existingItemId: string; label: string }
  | {
      action: 'update';
      existingItemId: string;
      existingVersion: number;
      label: string;
    };

export type DuplicateStrategy = 'skip' | 'update' | 'rename';

/**
 * Generates a unique delivery key by appending a numeric suffix.
 * E.g., "my-key" → "my-key-1", "my-key-1" → "my-key-2"
 */
export function generateUniqueDeliveryKey(baseKey: string, existingKeys: string[]): string {
  const existingSet = new Set(existingKeys);

  // Strip existing suffix
  const baseName = baseKey.replace(/-\d+$/, '');
  let counter = 1;
  let candidate = `${baseName}-${counter}`;

  while (existingSet.has(candidate)) {
    counter++;
    candidate = `${baseName}-${counter}`;
  }

  return candidate;
}

/**
 * Generates a unique label by appending a numeric suffix.
 * E.g., "My Item" → "My Item (1)", "My Item (1)" → "My Item (2)"
 */
export function generateUniqueLabel(baseLabel: string, existingLabels: string[]): string {
  const existingSet = new Set(existingLabels);

  // Strip existing suffix if present
  const baseName = baseLabel.replace(/\s*\(\d+\)$/, '');
  let counter = 1;
  let candidate = `${baseName} (${counter})`;

  while (existingSet.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})`;
  }

  return candidate;
}

/**
 * Checks if a content item with the given label already exists in the target folder
 * and applies the selected duplicate handling strategy.
 *
 * @param targetService - AmplienceService for the target hub
 * @param targetRepositoryId - Target repository ID
 * @param targetFolderId - Target folder ID (empty string for repository root)
 * @param sourceItem - The source content item being copied
 * @param strategy - User-selected duplicate handling strategy
 */
export async function resolveDuplicate(
  targetService: AmplienceService,
  targetRepositoryId: string,
  targetFolderId: string,
  sourceItem: Amplience.ContentItemWithDetails,
  strategy: DuplicateStrategy
): Promise<DuplicateResolution> {
  // Find existing items with the same label in the target folder
  const existingItems = await targetService.getAllContentItems(
    targetRepositoryId,
    () => {},
    targetFolderId ? { folderId: targetFolderId } : undefined
  );

  const duplicates = existingItems.filter(item => item.label === sourceItem.label);

  if (duplicates.length === 0) {
    return { action: 'create', label: sourceItem.label };
  }

  switch (strategy) {
    case 'skip': {
      const existing = duplicates[0];

      return {
        action: 'skip',
        existingItemId: existing.id,
        label: existing.label,
      };
    }

    case 'update': {
      const existing = duplicates[0];

      return {
        action: 'update',
        existingItemId: existing.id,
        existingVersion: existing.version,
        label: existing.label,
      };
    }

    case 'rename': {
      const newLabel = generateUniqueLabel(
        sourceItem.label,
        existingItems.map(i => i.label)
      );

      return { action: 'create', label: newLabel };
    }
  }
}
