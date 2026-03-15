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
    itemsPermissionDenied: [],
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

  const allSchemaIds = extractUniqueSchemaIds(allItems);
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

  // Ensure all mapped target folders still exist and fallback to user-selected target folder.
  await normalizeTargetFolderMappings(targetService, targetRepositoryId, result.folderMappings);

  // --- Phase 4: Create items in dependency order ---
  console.log('\n🏗️  Phase 4: Creating content items in dependency order...');

  const sortedItems = topologicalSort(allItems, discovery.itemDependencies);
  const idMapping = new Map<string, string>(); // source ID → target ID

  console.log('  🔎 Pre-indexing target repository items for reference mapping...');
  const targetIndexedItems = await targetService.getAllContentItems(targetRepositoryId, () => {}, {
    size: 100,
  });
  const seededMappings = seedIdMappingFromIndexedItems(allItems, targetIndexedItems, idMapping);
  console.log(
    `  ✅ Indexed ${targetIndexedItems.length} target items, pre-seeded ${seededMappings} source→target mappings`
  );

  const progressBar = createProgressBar(sortedItems.length, 'Creating items');

  for (const item of sortedItems) {
    const targetFolderId =
      result.folderMappings.get(item.folderId || '') || result.folderMappings.get('') || undefined;

    // Check for duplicates
    const resolution = await resolveDuplicate(
      targetService,
      targetRepositoryId,
      targetFolderId || '',
      item,
      duplicateStrategy
    );

    if (resolution.action === 'skip') {
      await mapSourceToTargetIdentifiers(targetService, item, resolution.existingItemId, idMapping);
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
    const preparedBody = sanitizeHierarchyMetadataForCopy(
      replaceReferenceIdsInBody(item.body, idMapping)
    );

    if (resolution.action === 'update') {
      const updateResult = await retryOperation(() =>
        updateExistingItem(
          targetService,
          resolution.existingItemId,
          resolution.existingVersion,
          preparedBody,
          item.label
        )
      );
      if (updateResult.value) {
        await mapSourceToTargetIdentifiers(
          targetService,
          item,
          resolution.existingItemId,
          idMapping
        );
        result.itemsCreated.push({
          sourceId: item.id,
          targetId: resolution.existingItemId,
          label: item.label,
          action: 'updated',
        });
      } else {
        const errorMessage = updateResult.error || 'Unknown error occurred';
        if (isForbiddenApiError(errorMessage)) {
          const forbiddenDetails = analyzeForbiddenError(errorMessage, {
            operation: 'update',
            ...(resolveSchemaId(item) && { schemaId: resolveSchemaId(item) }),
            ...(item.folderId && { sourceFolderId: item.folderId }),
            ...(targetFolderId && { targetFolderId }),
            ...(item.locale && { targetLocale: item.locale }),
          });
          result.itemsPermissionDenied.push({
            sourceId: item.id,
            label: item.label,
            operation: 'update',
            error: errorMessage,
            ...(updateResult.request && { failedRequest: updateResult.request }),
            likelyCause: forbiddenDetails.likelyCause,
            recommendedAction: forbiddenDetails.recommendedAction,
            ...(forbiddenDetails.schemaId && { schemaId: forbiddenDetails.schemaId }),
            ...(forbiddenDetails.sourceFolderId && {
              sourceFolderId: forbiddenDetails.sourceFolderId,
            }),
            ...(forbiddenDetails.targetFolderId && {
              targetFolderId: forbiddenDetails.targetFolderId,
            }),
            ...(forbiddenDetails.targetLocale && { targetLocale: forbiddenDetails.targetLocale }),
          });
        } else {
          result.itemsFailed.push({
            sourceId: item.id,
            label: item.label,
            error: `Update failed: ${errorMessage}`,
            ...(updateResult.request && { failedRequest: updateResult.request }),
          });
        }
      }
      progressBar.increment();
      continue;
    }

    // Create new item
    const locale = targetLocale || item.locale;
    let createResult = await retryOperation(() =>
      createItemInTarget(
        targetService,
        targetRepositoryId,
        preparedBody,
        resolution.label,
        targetFolderId,
        locale
      )
    );

    // Bulk sync creates items without folderId. If folder-scoped create is denied,
    // retry once in repository root to avoid false negatives caused by folder access.
    if (!createResult.value && targetFolderId && isForbiddenApiError(createResult.error || '')) {
      console.warn(
        `  ⚠️  Folder-scoped create denied for "${item.label}". Retrying in repository root...`
      );
      createResult = await retryOperation(() =>
        createItemInTarget(
          targetService,
          targetRepositoryId,
          preparedBody,
          resolution.label,
          undefined,
          locale
        )
      );
    }

    if (createResult.value) {
      mapItemIdentifiers(item, createResult.value, idMapping);
      result.itemsCreated.push({
        sourceId: item.id,
        targetId: createResult.value.id,
        label: resolution.label,
        action: 'created',
      });

      // Handle delivery key
      const deliveryKey = item.body._meta?.deliveryKey;
      if (deliveryKey) {
        const keyResult = await targetService.updateDeliveryKey(
          createResult.value.id,
          createResult.value.version,
          deliveryKey
        );

        if (!keyResult.success) {
          console.warn(
            `  ⚠️  Could not assign delivery key for item "${resolution.label}" (${createResult.value.id}): ${keyResult.error}`
          );
        }
      }
    } else {
      const errorMessage = createResult.error || 'Unknown error occurred';
      if (isForbiddenApiError(errorMessage)) {
        const forbiddenDetails = analyzeForbiddenError(errorMessage, {
          operation: 'create',
          ...(resolveSchemaId(item) && { schemaId: resolveSchemaId(item) }),
          ...(item.folderId && { sourceFolderId: item.folderId }),
          ...(targetFolderId && { targetFolderId }),
          ...(locale && { targetLocale: locale }),
        });
        result.itemsPermissionDenied.push({
          sourceId: item.id,
          label: item.label,
          operation: 'create',
          error: errorMessage,
          ...(createResult.request && { failedRequest: createResult.request }),
          likelyCause: forbiddenDetails.likelyCause,
          recommendedAction: forbiddenDetails.recommendedAction,
          ...(forbiddenDetails.schemaId && { schemaId: forbiddenDetails.schemaId }),
          ...(forbiddenDetails.sourceFolderId && {
            sourceFolderId: forbiddenDetails.sourceFolderId,
          }),
          ...(forbiddenDetails.targetFolderId && {
            targetFolderId: forbiddenDetails.targetFolderId,
          }),
          ...(forbiddenDetails.targetLocale && { targetLocale: forbiddenDetails.targetLocale }),
        });
      } else {
        result.itemsFailed.push({
          sourceId: item.id,
          label: item.label,
          error: `Creation failed: ${errorMessage}`,
          ...(createResult.request && { failedRequest: createResult.request }),
        });
      }
    }

    progressBar.increment();
  }

  progressBar.stop();

  // --- Phase 5: Establish hierarchy relationships ---
  console.log('\n🔗 Phase 5: Establishing hierarchy relationships...');

  const hierarchyDetailedItems = detailedItems.filter(item => item.hierarchy);
  const hierarchyBySourceId = new Map(hierarchyDetailedItems.map(item => [item.id, item]));
  const rootItems = hierarchyDetailedItems.filter(item => item.hierarchy?.root);
  const unsortedChildItems = hierarchyDetailedItems.filter(
    item => item.hierarchy && !item.hierarchy.root && item.hierarchy.parentId
  );
  const childItems = sortHierarchyChildrenByDepth(unsortedChildItems, hierarchyDetailedItems);
  const parentSourceIds = new Set(
    childItems.map(item => (item.hierarchy as { root: false; parentId: string }).parentId)
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

  // Ensure all target parents are valid hierarchy nodes before linking children.
  for (const parentSourceId of parentSourceIds) {
    const targetParentId = idMapping.get(parentSourceId);
    const sourceParent = hierarchyBySourceId.get(parentSourceId);

    if (!targetParentId || !sourceParent) {
      continue;
    }

    const conversionOk = await ensureItemIsHierarchyNode(targetService, targetParentId);
    if (!conversionOk) {
      result.itemsFailed.push({
        sourceId: parentSourceId,
        label: sourceParent.label,
        error: 'Hierarchy conversion failed: could not convert target parent to hierarchy node',
      });
    }
  }

  // Establish child relationships in passes so unresolved descendants can be retried
  // after their parents are successfully linked.
  let pendingChildren = [...childItems];
  const maxPasses = Math.max(1, childItems.length);

  for (let pass = 1; pass <= maxPasses && pendingChildren.length > 0; pass++) {
    let establishedThisPass = 0;
    const nextPending: Amplience.ContentItemWithDetails[] = [];

    for (const child of pendingChildren) {
      const targetChildId = idMapping.get(child.id);
      const targetParentId = idMapping.get(
        (child.hierarchy as { root: false; parentId: string }).parentId
      );
      if (!targetChildId || !targetParentId) {
        continue;
      }

      const linked = await targetService.createHierarchyNode(
        targetRepositoryId,
        targetChildId,
        targetParentId
      );

      if (linked) {
        establishedThisPass++;

        // Some hierarchies require parent nodes to be published before they can
        // be used as valid parents for deeper descendants.
        if (parentSourceIds.has(child.id) && shouldPublishItem(child)) {
          const published = await publishWithRetry(targetService, targetChildId);
          if (published) {
            result.itemsPublished.push({ sourceId: child.id, targetId: targetChildId });
            await delay(100);
          }
        }
      } else {
        nextPending.push(child);
      }
    }

    if (nextPending.length === 0) {
      pendingChildren = nextPending;
      break;
    }

    if (establishedThisPass === 0) {
      for (const unresolved of nextPending) {
        result.itemsFailed.push({
          sourceId: unresolved.id,
          label: unresolved.label,
          error: 'Hierarchy relationship failed: parent could not be established as hierarchy node',
        });
      }
      pendingChildren = nextPending;
      break;
    }

    pendingChildren = nextPending;
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
  console.log(`  🔒 Permission Denied: ${result.itemsPermissionDenied.length}`);
  console.log(`  ❌ Failed: ${result.itemsFailed.length}`);
  console.log(`  📤 Published: ${result.itemsPublished.length}`);
  console.log(`  ⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`);

  return result;
}

/**
 * Extracts unique schema IDs from items using runtime-safe fallback logic.
 * Some API responses can omit `schemaId` while still exposing `_meta.schema`.
 */
export function extractUniqueSchemaIds(items: Amplience.ContentItemWithDetails[]): string[] {
  const schemaIds = new Set<string>();

  for (const item of items) {
    const schemaId = resolveSchemaId(item);
    if (schemaId) {
      schemaIds.add(schemaId);
    }
  }

  return [...schemaIds];
}

export type FailedItemRecord = {
  error: string;
  failedRequest?: FailedRequestRecord;
  label: string;
  sourceId: string;
};

export type FailedRequestRecord = {
  endpoint: string;
  method: 'PATCH' | 'POST';
  payloadJson: string;
};

type RetryResult<T> = {
  error?: string;
  request?: FailedRequestRecord;
  value: T | null;
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
  itemsPermissionDenied: PermissionDeniedItemRecord[];
  itemsPublished: PublishedItemRecord[];
  itemsSkipped: SkippedItemRecord[];
  validationResult: HubValidationResult | null;
};

export type PermissionDeniedItemRecord = {
  error: string;
  failedRequest?: FailedRequestRecord;
  label: string;
  likelyCause?: string;
  operation: 'create' | 'update';
  recommendedAction?: string;
  schemaId?: string;
  sourceId: string;
  sourceFolderId?: string;
  targetFolderId?: string;
  targetLocale?: string;
};

export type PublishedItemRecord = {
  sourceId: string;
  targetId: string;
};

type MappingCandidate = {
  body?: unknown;
  deliveryId?: string;
  id: string;
  label: string;
  schemaId?: string;
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

    // Replace deliveryId fields represented directly on objects
    if (typeof obj.deliveryId === 'string' && idMapping.has(obj.deliveryId)) {
      obj.deliveryId = idMapping.get(obj.deliveryId)!;
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

function mapItemIdentifiers(
  sourceItem: Pick<Amplience.ContentItemWithDetails, 'id' | 'deliveryId'>,
  targetItem: Pick<Amplience.ContentItemWithDetails, 'id' | 'deliveryId'>,
  idMapping: Map<string, string>
): void {
  idMapping.set(sourceItem.id, targetItem.id);
  if (sourceItem.deliveryId) {
    idMapping.set(sourceItem.deliveryId, targetItem.deliveryId || targetItem.id);
  }
}

function mapCandidateIdentifiers(
  sourceItem: Pick<MappingCandidate, 'id' | 'deliveryId'>,
  targetItem: Pick<MappingCandidate, 'id' | 'deliveryId'>,
  idMapping: Map<string, string>
): void {
  idMapping.set(sourceItem.id, targetItem.id);

  if (sourceItem.deliveryId) {
    idMapping.set(sourceItem.deliveryId, targetItem.deliveryId || targetItem.id);
  }
}

export function seedIdMappingFromIndexedItems(
  sourceItems: MappingCandidate[],
  targetItems: MappingCandidate[],
  idMapping: Map<string, string>
): number {
  const targetByDeliveryKey = new Map<string, MappingCandidate[]>();
  const targetBySchemaAndLabel = new Map<string, MappingCandidate[]>();

  for (const target of targetItems) {
    const deliveryKey = normalizeForLookup(extractDeliveryKey(target));
    if (deliveryKey) {
      const candidates = targetByDeliveryKey.get(deliveryKey) || [];
      candidates.push(target);
      targetByDeliveryKey.set(deliveryKey, candidates);
    }

    const schema = normalizeForLookup(extractSchemaId(target));
    const label = normalizeForLookup(target.label);
    if (schema && label) {
      const key = `${schema}::${label}`;
      const candidates = targetBySchemaAndLabel.get(key) || [];
      candidates.push(target);
      targetBySchemaAndLabel.set(key, candidates);
    }
  }

  let seededCount = 0;

  for (const source of sourceItems) {
    if (idMapping.has(source.id)) {
      continue;
    }

    let matched: MappingCandidate | undefined;

    const sourceDeliveryKey = normalizeForLookup(extractDeliveryKey(source));
    if (sourceDeliveryKey) {
      const candidates = targetByDeliveryKey.get(sourceDeliveryKey) || [];
      if (candidates.length === 1) {
        matched = candidates[0];
      }
    }

    if (!matched) {
      const sourceSchema = normalizeForLookup(extractSchemaId(source));
      const sourceLabel = normalizeForLookup(source.label);
      if (sourceSchema && sourceLabel) {
        const candidates = targetBySchemaAndLabel.get(`${sourceSchema}::${sourceLabel}`) || [];
        if (candidates.length === 1) {
          matched = candidates[0];
        }
      }
    }

    if (!matched) {
      continue;
    }

    mapCandidateIdentifiers(source, matched, idMapping);
    seededCount++;
  }

  return seededCount;
}

function extractDeliveryKey(item: Pick<MappingCandidate, 'body'>): string {
  if (!item.body || typeof item.body !== 'object') {
    return '';
  }

  const body = item.body as { _meta?: Record<string, unknown> };
  const meta = body._meta;
  if (!meta || typeof meta !== 'object') {
    return '';
  }

  return typeof meta.deliveryKey === 'string' ? meta.deliveryKey : '';
}

function extractSchemaId(item: Pick<MappingCandidate, 'schemaId' | 'body'>): string {
  if (item.schemaId && item.schemaId.trim()) {
    return item.schemaId.trim();
  }

  if (!item.body || typeof item.body !== 'object') {
    return '';
  }

  const body = item.body as { _meta?: Record<string, unknown> };
  const meta = body._meta;
  if (!meta || typeof meta !== 'object') {
    return '';
  }

  return typeof meta.schema === 'string' ? meta.schema.trim() : '';
}

function normalizeForLookup(value?: string): string {
  return (value || '').trim().toLowerCase();
}

async function mapSourceToTargetIdentifiers(
  targetService: AmplienceService,
  sourceItem: Pick<Amplience.ContentItemWithDetails, 'id' | 'deliveryId'>,
  targetItemId: string,
  idMapping: Map<string, string>
): Promise<void> {
  const targetDetails = await targetService.getContentItemWithDetails(targetItemId);
  if (targetDetails) {
    mapItemIdentifiers(sourceItem, targetDetails, idMapping);

    return;
  }

  idMapping.set(sourceItem.id, targetItemId);
  if (sourceItem.deliveryId) {
    idMapping.set(sourceItem.deliveryId, targetItemId);
  }
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
): Promise<RetryResult<Amplience.ContentItemWithDetails>> {
  const request: Amplience.CreateContentItemRequest = {
    body,
    label,
    ...(folderId && { folderId }),
    ...(locale && { locale }),
  };
  const failedRequest: FailedRequestRecord = {
    method: 'POST',
    endpoint: `https://api.amplience.net/v2/content/content-repositories/${repositoryId}/content-items`,
    payloadJson: JSON.stringify(request),
  };

  const result = await service.createContentItem(repositoryId, request);
  if (result.success && result.updatedItem) {
    return { value: result.updatedItem };
  }

  return {
    value: null,
    error: result.error || 'Unknown error occurred while creating content item',
    request: failedRequest,
  };
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

async function normalizeTargetFolderMappings(
  targetService: AmplienceService,
  targetRepositoryId: string,
  folderMappings: Map<string, string>
): Promise<void> {
  if (folderMappings.size === 0) {
    return;
  }

  const targetFolders = await targetService.getAllFolders(targetRepositoryId, () => {});
  const existingTargetFolderIds = new Set(targetFolders.map(folder => folder.id));
  const selectedTargetFolderId = folderMappings.get('');

  for (const [sourceFolderId, mappedTargetFolderId] of folderMappings.entries()) {
    if (existingTargetFolderIds.has(mappedTargetFolderId)) {
      continue;
    }

    if (selectedTargetFolderId && existingTargetFolderIds.has(selectedTargetFolderId)) {
      folderMappings.set(sourceFolderId, selectedTargetFolderId);
      console.warn(
        `  ⚠️  Target folder mapping for source "${sourceFolderId || '(repository root)'}" is unavailable. Falling back to selected target folder ${selectedTargetFolderId}.`
      );
      continue;
    }

    folderMappings.delete(sourceFolderId);
    console.warn(
      `  ⚠️  Target folder mapping for source "${sourceFolderId || '(repository root)'}" is unavailable and no fallback folder is accessible. Item will be created in repository root.`
    );
  }
}

async function publishWithRetry(service: AmplienceService, itemId: string): Promise<boolean> {
  const result = await service.publishContentItem(itemId);

  return result.success;
}

async function ensureItemIsHierarchyNode(
  targetService: AmplienceService,
  targetItemId: string
): Promise<boolean> {
  const targetItem = await targetService.getContentItemWithDetails(targetItemId);
  if (!targetItem) {
    return false;
  }

  if (targetItem.body._meta?.hierarchy) {
    return true;
  }

  const updateResult = await targetService.updateContentItem(targetItemId, {
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

  return updateResult.success;
}

async function retryOperation<T>(
  operation: () => Promise<RetryResult<T>>,
  attempt: number = 1,
  lastError?: string,
  lastRequest?: FailedRequestRecord
): Promise<RetryResult<T>> {
  try {
    const outcome = await operation();

    if (outcome.value !== null) {
      return outcome;
    }

    const errorMessage = outcome.error || lastError || 'Unknown error occurred';
    const request = outcome.request || lastRequest;

    if (!isRetryableApiError(errorMessage)) {
      return { value: null, error: errorMessage, ...(request && { request }) };
    }

    if (attempt >= MAX_RETRIES) {
      console.error(
        `  ❌ Operation failed after ${MAX_RETRIES} retries. Last error: ${errorMessage}`
      );

      return { value: null, error: errorMessage, ...(request && { request }) };
    }

    const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    console.warn(`  ⚠️  Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms. ${errorMessage}`);
    await delay(backoff);

    return retryOperation(operation, attempt + 1, errorMessage, request);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (!isRetryableApiError(errorMessage)) {
      return {
        value: null,
        error: errorMessage,
        ...(lastRequest && { request: lastRequest }),
      };
    }

    if (attempt >= MAX_RETRIES) {
      console.error(
        `  ❌ Operation failed after ${MAX_RETRIES} retries. Last error: ${errorMessage}`
      );

      return {
        value: null,
        error: errorMessage,
        ...(lastRequest && { request: lastRequest }),
      };
    }

    const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    console.warn(`  ⚠️  Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms. ${errorMessage}`);
    await delay(backoff);

    return retryOperation(operation, attempt + 1, errorMessage, lastRequest);
  }
}

function shouldPublishItem(item: Amplience.ContentItemWithDetails): boolean {
  return (
    item.status === 'ACTIVE' &&
    (item.publishingStatus === 'EARLY' || item.publishingStatus === 'LATEST')
  );
}

function sanitizeHierarchyMetadataForCopy(body: Amplience.Body): Amplience.Body {
  const cloned = JSON.parse(JSON.stringify(body)) as Amplience.Body;

  if (!cloned._meta || typeof cloned._meta !== 'object') {
    return cloned;
  }

  const meta = cloned._meta as Record<string, unknown>;
  if ('hierarchy' in meta) {
    delete meta.hierarchy;
  }

  return cloned;
}

function isRetryableApiError(errorMessage: string): boolean {
  const match = errorMessage.match(/API Error:\s*(\d{3})/);
  if (!match) {
    return true;
  }

  const status = Number(match[1]);
  if (status === 429 || status >= 500) {
    return true;
  }

  return false;
}

function isForbiddenApiError(errorMessage: string): boolean {
  const match = errorMessage.match(/API Error:\s*(\d{3})/);
  if (match && Number(match[1]) === 403) {
    return true;
  }

  return (
    errorMessage.includes('FORBIDDEN') ||
    errorMessage.includes('Authorization required') ||
    errorMessage.includes('403 Forbidden')
  );
}

function analyzeForbiddenError(
  errorMessage: string,
  context: {
    operation: 'create' | 'update';
    schemaId?: string;
    sourceFolderId?: string;
    targetFolderId?: string;
    targetLocale?: string | null;
  }
): {
  likelyCause: string;
  recommendedAction: string;
  schemaId?: string;
  sourceFolderId?: string;
  targetFolderId?: string;
  targetLocale?: string;
} {
  const normalized = errorMessage.toLowerCase();
  const schemaContext = context.schemaId ? ` for schema ${context.schemaId}` : '';

  let likelyCause = `Missing permission to ${context.operation} content${schemaContext}.`;
  let recommendedAction =
    'Verify the target hub credentials have repository write permissions and schema-level authoring rights.';

  if (normalized.includes('authorization required') || normalized.includes('forbidden')) {
    likelyCause = `The current token is authenticated but not authorized to ${context.operation} this content${schemaContext}.`;
    recommendedAction =
      'Check user/API client roles in the target hub, including repository access, folder restrictions, and content-type permissions.';
  }

  return {
    likelyCause,
    recommendedAction,
    ...(context.schemaId && { schemaId: context.schemaId }),
    ...(context.sourceFolderId && { sourceFolderId: context.sourceFolderId }),
    ...(context.targetFolderId && { targetFolderId: context.targetFolderId }),
    ...(context.targetLocale && { targetLocale: context.targetLocale }),
  };
}

function sortHierarchyChildrenByDepth(
  childItems: Amplience.ContentItemWithDetails[],
  allHierarchyItems: Amplience.ContentItemWithDetails[]
): Amplience.ContentItemWithDetails[] {
  const byId = new Map(allHierarchyItems.map(item => [item.id, item]));
  const depthCache = new Map<string, number>();

  function getDepth(itemId: string, visited: Set<string> = new Set()): number {
    if (depthCache.has(itemId)) {
      return depthCache.get(itemId)!;
    }

    if (visited.has(itemId)) {
      // Break potential cycles defensively; keep deterministic ordering.
      return Number.MAX_SAFE_INTEGER;
    }

    const item = byId.get(itemId);
    if (!item || !item.hierarchy) {
      depthCache.set(itemId, 0);

      return 0;
    }

    if (item.hierarchy.root) {
      depthCache.set(itemId, 0);

      return 0;
    }

    const parentId = item.hierarchy.parentId;
    if (!parentId) {
      depthCache.set(itemId, 1);

      return 1;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(itemId);
    const depth = getDepth(parentId, nextVisited) + 1;
    depthCache.set(itemId, depth);

    return depth;
  }

  return [...childItems].sort((a, b) => {
    const depthA = getDepth(a.id);
    const depthB = getDepth(b.id);

    if (depthA !== depthB) {
      return depthA - depthB;
    }

    return a.id.localeCompare(b.id);
  });
}

function resolveSchemaId(item: Amplience.ContentItemWithDetails): string {
  const bodyMeta = item.body?._meta as Record<string, unknown> | undefined;
  const fallbackSchema = typeof bodyMeta?.schema === 'string' ? bodyMeta.schema : '';

  return (item.schemaId || fallbackSchema || '').trim();
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
): Promise<RetryResult<Amplience.ContentItemWithDetails>> {
  const initialPayload: Amplience.UpdateContentItemRequest = {
    body,
    label,
    version,
  };
  const endpoint = `https://api.amplience.net/v2/content/content-items/${itemId}`;

  const result = await service.updateContentItem(itemId, initialPayload);

  if (result.success && result.updatedItem) {
    return { value: result.updatedItem };
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
        return { value: retryResult.updatedItem };
      }

      return {
        value: null,
        error: retryResult.error || result.error || 'Version conflict could not be resolved',
        request: {
          method: 'PATCH',
          endpoint,
          payloadJson: JSON.stringify({ body, label, version: current.version }),
        },
      };
    }
  }

  return {
    value: null,
    error: result.error || 'Unknown error occurred while updating content item',
    request: {
      method: 'PATCH',
      endpoint,
      payloadJson: JSON.stringify(initialPayload),
    },
  };
}
