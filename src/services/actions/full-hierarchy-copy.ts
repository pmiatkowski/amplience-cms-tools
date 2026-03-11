import { createProgressBar } from '~/utils';
import { AmplienceService } from '../amplience-service';
import { resolveDuplicate, type DuplicateStrategy } from './duplicate-handler';
import { discoverEmbeddedContent, type DiscoveryWarning } from './embedded-content-discovery';
import { validateHubCompatibility, type HubValidationResult } from './full-hierarchy-validation';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

export type CreatedItemRecord = {
  action: 'created' | 'updated';
  label: string;
  sourceId: string;
  targetId: string;
};

/**
 * Performs a full hierarchy copy including all embedded content items.
 *
 * Phases:
 *  1. Discovery — recursively discovers all hierarchy children + embedded content
 *  2. Validation — checks schemas/content types match between hubs
 *  3. Folder creation — mirrors source folder structure in target
 *  4. Item creation — creates items in dependency order (leaves first)
 *  5. Hierarchy establishment — sets parent-child relationships
 *  6. Publishing — publishes items that were published in source
 *
 * @param options - Full configuration for the copy operation
 * @example
 * const result = await executeFullHierarchyCopy({
 *   sourceService, targetService,
 *   sourceRepositoryId, targetRepositoryId,
 *   hierarchyItems: ['item-id-1', 'item-id-2'],
 *   folderMapping: new Map(),
 *   duplicateStrategy: 'skip',
 *   isDryRun: false,
 * });
 * console.log(`Created: ${result.itemsCreated.length}`);
 */
export async function executeFullHierarchyCopy(
  options: FullHierarchyCopyOptions
): Promise<FullHierarchyCopyResult> {
  const startTime = Date.now();
  const {
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    hierarchyItems,
    folderMapping,
    duplicateStrategy,
    isDryRun,
    targetLocale,
  } = options;

  const result: FullHierarchyCopyResult = {
    itemsCreated: [],
    itemsSkipped: [],
    itemsFailed: [],
    itemsPublished: [],
    folderMappings: new Map(folderMapping),
    discoveryWarnings: [],
    validationResult: null,
    duration: 0,
  };

  // --- Phase 1: Discovery ---
  console.log('\n🔍 Phase 1: Discovering all content items and embedded dependencies...');

  // Fetch detailed info for all hierarchy items
  const detailedItems: Amplience.ContentItemWithDetails[] = [];
  for (const itemId of hierarchyItems) {
    const details = await sourceService.getContentItemWithDetails(itemId);
    if (details) {
      detailedItems.push(details);
    }
  }

  // Discover all embedded content recursively
  const discovery = await discoverEmbeddedContent(sourceService, detailedItems, sourceRepositoryId);

  result.discoveryWarnings = discovery.warnings;
  console.log(`  ✅ Discovered ${discovery.totalDiscovered} embedded content items`);
  if (discovery.warnings.length > 0) {
    console.log(`  ⚠️  ${discovery.warnings.length} warnings (see report for details)`);
  }

  // Fetch detailed info for discovered embedded items
  const embeddedDetailedItems: Amplience.ContentItemWithDetails[] = [];
  for (const embedId of discovery.embeddedItemIds) {
    const details = await sourceService.getContentItemWithDetails(embedId);
    if (details) {
      embeddedDetailedItems.push(details);
    }
  }

  const allItems = [...detailedItems, ...embeddedDetailedItems];

  // --- Phase 2: Validation ---
  console.log('\n🔎 Phase 2: Validating schema and content type compatibility...');

  const allSchemaIds = [...new Set(allItems.map(item => item.schemaId))];
  const validationResult = await validateHubCompatibility(
    sourceService,
    targetService,
    allSchemaIds
  );

  result.validationResult = validationResult;

  if (!validationResult.valid) {
    console.error('\n❌ Validation failed! Mismatches found:');
    for (const error of validationResult.errors) {
      console.error(`  • [${error.type}] ${error.message}`);
    }
    result.duration = Date.now() - startTime;

    return result;
  }

  console.log(`  ✅ All ${validationResult.schemasChecked} schemas validated successfully`);

  if (isDryRun) {
    console.log('\n🔍 DRY RUN — Validation passed. No changes will be made.');
    result.duration = Date.now() - startTime;

    return result;
  }

  // --- Phase 3: Mirror folder structure ---
  console.log('\n📁 Phase 3: Mirroring folder structure in target...');

  await mirrorFolderStructure(
    sourceService,
    targetService,
    sourceRepositoryId,
    targetRepositoryId,
    allItems,
    result.folderMappings
  );

  // --- Phase 4: Create items in dependency order ---
  console.log('\n🏗️  Phase 4: Creating content items in dependency order...');

  const sortedItems = topologicalSort(allItems, discovery.itemDependencies);
  const idMapping = new Map<string, string>(); // source ID → target ID

  const progressBar = createProgressBar(sortedItems.length, 'Creating items');

  for (const item of sortedItems) {
    const targetFolderId = result.folderMappings.get(item.folderId || '') || undefined;

    // Check for duplicates
    const resolution = await resolveDuplicate(
      targetService,
      targetRepositoryId,
      targetFolderId || '',
      item,
      duplicateStrategy
    );

    if (resolution.action === 'skip') {
      idMapping.set(item.id, resolution.existingItemId);
      result.itemsSkipped.push({
        sourceId: item.id,
        targetId: resolution.existingItemId,
        label: item.label,
        reason: 'duplicate-skipped',
      });
      progressBar.increment();
      continue;
    }

    // Prepare body with updated reference IDs
    const preparedBody = replaceReferenceIdsInBody(item.body, idMapping);

    if (resolution.action === 'update') {
      const updateSuccess = await retryOperation(() =>
        updateExistingItem(
          targetService,
          resolution.existingItemId,
          resolution.existingVersion,
          preparedBody,
          item.label
        )
      );
      if (updateSuccess) {
        idMapping.set(item.id, resolution.existingItemId);
        result.itemsCreated.push({
          sourceId: item.id,
          targetId: resolution.existingItemId,
          label: item.label,
          action: 'updated',
        });
      } else {
        result.itemsFailed.push({
          sourceId: item.id,
          label: item.label,
          error: 'Update failed after retries',
        });
      }
      progressBar.increment();
      continue;
    }

    // Create new item
    const locale = targetLocale || item.locale;
    const newItem = await retryOperation(() =>
      createItemInTarget(
        targetService,
        targetRepositoryId,
        preparedBody,
        resolution.label,
        targetFolderId,
        locale
      )
    );

    if (newItem) {
      idMapping.set(item.id, newItem.id);
      result.itemsCreated.push({
        sourceId: item.id,
        targetId: newItem.id,
        label: resolution.label,
        action: 'created',
      });

      // Handle delivery key
      const deliveryKey = item.body._meta?.deliveryKey;
      if (deliveryKey) {
        await targetService.assignDeliveryKey(newItem.id, deliveryKey);
      }
    } else {
      result.itemsFailed.push({
        sourceId: item.id,
        label: item.label,
        error: 'Creation failed after retries',
      });
    }

    progressBar.increment();
  }

  progressBar.stop();

  // --- Phase 5: Establish hierarchy relationships ---
  console.log('\n🔗 Phase 5: Establishing hierarchy relationships...');

  const hierarchyDetailedItems = detailedItems.filter(item => item.hierarchy);
  const rootItems = hierarchyDetailedItems.filter(item => item.hierarchy?.root);
  const childItems = hierarchyDetailedItems.filter(
    item => item.hierarchy && !item.hierarchy.root && item.hierarchy.parentId
  );

  // Establish roots first
  for (const root of rootItems) {
    const targetId = idMapping.get(root.id);
    if (!targetId) continue;

    const targetItem = await targetService.getContentItemWithDetails(targetId);
    if (targetItem && !targetItem.body._meta?.hierarchy?.root) {
      await targetService.updateContentItem(targetId, {
        body: {
          ...targetItem.body,
          _meta: {
            ...targetItem.body._meta,
            hierarchy: { root: true, parentId: null },
          },
        },
        label: targetItem.label,
        version: targetItem.version,
        ...(targetItem.folderId && { folderId: targetItem.folderId }),
        ...(targetItem.locale && { locale: targetItem.locale }),
      });
    }

    // Publish root to establish as valid hierarchy node
    if (shouldPublishItem(root)) {
      await publishWithRetry(targetService, targetId);
      await delay(200);
    }
  }

  // Establish child relationships
  for (const child of childItems) {
    const targetChildId = idMapping.get(child.id);
    const targetParentId = idMapping.get(
      (child.hierarchy as { root: false; parentId: string }).parentId
    );
    if (!targetChildId || !targetParentId) continue;

    await retryOperation(() =>
      targetService
        .createHierarchyNode(targetRepositoryId, targetChildId, targetParentId)
        .then(success => (success ? ({} as Amplience.ContentItemWithDetails) : null))
    );
  }

  // --- Phase 6: Publish ---
  console.log('\n📤 Phase 6: Publishing items...');

  // Publish hierarchy parent-first (roots already published above)
  for (const child of childItems) {
    const targetId = idMapping.get(child.id);
    if (!targetId || !shouldPublishItem(child)) continue;

    const published = await publishWithRetry(targetService, targetId);
    if (published) {
      result.itemsPublished.push({ sourceId: child.id, targetId });
    }
    await delay(100);
  }

  // Publish embedded items
  for (const embItem of embeddedDetailedItems) {
    const targetId = idMapping.get(embItem.id);
    if (!targetId || !shouldPublishItem(embItem)) continue;

    const published = await publishWithRetry(targetService, targetId);
    if (published) {
      result.itemsPublished.push({ sourceId: embItem.id, targetId });
    }
  }

  result.duration = Date.now() - startTime;

  // Final summary
  console.log('\n📊 Operation Summary:');
  console.log(`  ✅ Created/Updated: ${result.itemsCreated.length}`);
  console.log(`  ⏩ Skipped: ${result.itemsSkipped.length}`);
  console.log(`  ❌ Failed: ${result.itemsFailed.length}`);
  console.log(`  📤 Published: ${result.itemsPublished.length}`);
  console.log(`  ⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`);

  return result;
}

export type FailedItemRecord = {
  error: string;
  label: string;
  sourceId: string;
};

export type FullHierarchyCopyOptions = {
  duplicateStrategy: DuplicateStrategy;
  folderMapping: Map<string, string>;
  hierarchyItems: string[];
  isDryRun: boolean;
  sourceRepositoryId: string;
  sourceService: AmplienceService;
  targetLocale?: string | null;
  targetRepositoryId: string;
  targetService: AmplienceService;
};

export type FullHierarchyCopyResult = {
  discoveryWarnings: DiscoveryWarning[];
  duration: number;
  folderMappings: Map<string, string>;
  itemsCreated: CreatedItemRecord[];
  itemsFailed: FailedItemRecord[];
  itemsPublished: PublishedItemRecord[];
  itemsSkipped: SkippedItemRecord[];
  validationResult: HubValidationResult | null;
};

export type PublishedItemRecord = {
  sourceId: string;
  targetId: string;
};

/**
 * Replaces source content item IDs with target IDs in a content body.
 * Traverses the body recursively, updating `id` and `deliveryId` fields
 * within Content Link and Content Reference objects.
 */
export function replaceReferenceIdsInBody(
  body: Amplience.Body,
  idMapping: Map<string, string>
): Amplience.Body {
  const cloned = JSON.parse(JSON.stringify(body)) as Amplience.Body;

  function traverse(value: unknown): void {
    if (value === null || value === undefined || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const element of value) {
        traverse(element);
      }

      return;
    }

    const obj = value as Record<string, unknown>;

    // Replace `id` field if it maps to a target ID
    if (typeof obj.id === 'string' && idMapping.has(obj.id)) {
      obj.id = idMapping.get(obj.id)!;
    }

    // Replace deliveryId in _meta if it maps
    if (obj._meta && typeof obj._meta === 'object') {
      const meta = obj._meta as Record<string, unknown>;
      if (typeof meta.deliveryId === 'string' && idMapping.has(meta.deliveryId)) {
        meta.deliveryId = idMapping.get(meta.deliveryId)!;
      }
    }

    for (const key of Object.keys(obj)) {
      traverse(obj[key]);
    }
  }

  traverse(cloned);

  return cloned;
}

export type SkippedItemRecord = {
  label: string;
  reason: string;
  sourceId: string;
  targetId: string;
};

// --- Private Helpers ---

async function createItemInTarget(
  service: AmplienceService,
  repositoryId: string,
  body: Amplience.Body,
  label: string,
  folderId?: string,
  locale?: string | null
): Promise<Amplience.ContentItemWithDetails | null> {
  const request: Amplience.CreateContentItemRequest = {
    body,
    label,
    ...(folderId && { folderId }),
    ...(locale && { locale }),
  };

  const result = await service.createContentItem(repositoryId, request);
  if (result.success && result.updatedItem) {
    return result.updatedItem;
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mirrorFolderStructure(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  sourceRepositoryId: string,
  targetRepositoryId: string,
  items: Amplience.ContentItemWithDetails[],
  folderMapping: Map<string, string>
): Promise<void> {
  // Collect unique source folder IDs
  const sourceFolderIds = new Set<string>();
  for (const item of items) {
    if (item.folderId) {
      sourceFolderIds.add(item.folderId);
    }
  }

  if (sourceFolderIds.size === 0) {
    console.log('  ℹ️  All items are in repository root, no folder mirroring needed.');

    return;
  }

  // Build source folder path map
  const sourceFolders = await sourceService.getAllFolders(sourceRepositoryId, () => {});
  const targetFolders = await targetService.getAllFolders(targetRepositoryId, () => {});

  // Build path-to-folder maps
  const sourceFolderById = new Map(sourceFolders.map(f => [f.id, f]));
  const targetFolderByName = new Map(targetFolders.map(f => [f.name, f]));

  for (const folderId of sourceFolderIds) {
    if (folderMapping.has(folderId)) continue; // Already mapped

    const sourceFolder = sourceFolderById.get(folderId);
    if (!sourceFolder) continue;

    // Check if a folder with the same name exists in target
    const existingTarget = targetFolderByName.get(sourceFolder.name);
    if (existingTarget) {
      folderMapping.set(folderId, existingTarget.id);
      console.log(`  📁 Mapped existing folder: ${sourceFolder.name} → ${existingTarget.id}`);
    } else {
      // Create the folder in target
      const createResult = await targetService.createFolder(targetRepositoryId, sourceFolder.name);
      if (createResult.success && createResult.updatedItem) {
        folderMapping.set(folderId, createResult.updatedItem.id);
        console.log(`  📁 Created folder: ${sourceFolder.name} → ${createResult.updatedItem.id}`);
      } else {
        console.warn(`  ⚠️  Failed to create folder "${sourceFolder.name}": ${createResult.error}`);
      }
    }
  }
}

async function publishWithRetry(service: AmplienceService, itemId: string): Promise<boolean> {
  const result = await service.publishContentItem(itemId);

  return result.success;
}

async function retryOperation<T>(
  operation: () => Promise<T | null>,
  attempt: number = 1
): Promise<T | null> {
  try {
    return await operation();
  } catch {
    if (attempt >= MAX_RETRIES) {
      console.error(`  ❌ Operation failed after ${MAX_RETRIES} retries`);

      return null;
    }

    const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    console.warn(`  ⚠️  Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms...`);
    await delay(backoff);

    return retryOperation(operation, attempt + 1);
  }
}

function shouldPublishItem(item: Amplience.ContentItemWithDetails): boolean {
  return (
    item.status === 'ACTIVE' &&
    (item.publishingStatus === 'EARLY' || item.publishingStatus === 'LATEST')
  );
}

/**
 * Topologically sorts items so dependencies (embedded items) are created before
 * the items that reference them. Uses Kahn's algorithm.
 */
function topologicalSort(
  allItems: Amplience.ContentItemWithDetails[],
  dependencies: Map<string, Set<string>>
): Amplience.ContentItemWithDetails[] {
  const itemMap = new Map(allItems.map(item => [item.id, item]));
  const itemIds = new Set(allItems.map(item => item.id));

  // Build in-degree map
  const inDegree = new Map<string, number>();
  const reverseDeps = new Map<string, Set<string>>();

  for (const id of itemIds) {
    inDegree.set(id, 0);
    reverseDeps.set(id, new Set());
  }

  // For each item, count how many of its dependencies are in our set
  for (const [itemId, deps] of dependencies) {
    if (!itemIds.has(itemId)) continue;
    for (const depId of deps) {
      if (itemIds.has(depId)) {
        inDegree.set(itemId, (inDegree.get(itemId) || 0) + 1);
        reverseDeps.get(depId)!.add(itemId);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: Amplience.ContentItemWithDetails[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const item = itemMap.get(current);
    if (item) sorted.push(item);

    for (const dependent of reverseDeps.get(current) || []) {
      const newDegree = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // Add any remaining items (circular deps that Kahn's can't resolve)
  for (const item of allItems) {
    if (!sorted.includes(item)) {
      sorted.push(item);
    }
  }

  return sorted;
}

async function updateExistingItem(
  service: AmplienceService,
  itemId: string,
  version: number,
  body: Amplience.Body,
  label: string
): Promise<Amplience.ContentItemWithDetails | null> {
  const result = await service.updateContentItem(itemId, {
    body,
    label,
    version,
  });

  if (result.success && result.updatedItem) {
    return result.updatedItem;
  }

  // Handle 409 version conflict
  if (result.error?.includes('409')) {
    const current = await service.getContentItemWithDetails(itemId);
    if (current) {
      const retryResult = await service.updateContentItem(itemId, {
        body,
        label,
        version: current.version,
      });
      if (retryResult.success && retryResult.updatedItem) {
        return retryResult.updatedItem;
      }
    }
  }

  return null;
}
