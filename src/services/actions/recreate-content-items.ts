import cliProgress from 'cli-progress';
import { AmplienceService } from '../amplience-service';
import {
  nullifyReferences,
  transformBodyReferences,
  type ReferenceResolutionResult,
  type BodyTransformOptions,
} from '../content-reference';
import type {
  ContentItemRecreationPreflightReady,
  ContentItemRecreationPreflightResult,
} from './preflight-content-item-recreation';

function assertReadyPreflight(
  preflight: ContentItemRecreationPreflightResult,
  sourceRepositoryId: string,
  targetRepositoryId: string,
  itemIds: readonly string[]
): asserts preflight is ContentItemRecreationPreflightReady {
  if (preflight.status !== 'ready') {
    throw new Error('A ready content item recreation preflight is required');
  }

  if (preflight.sourceRepositoryId !== sourceRepositoryId) {
    throw new Error('Preflight source repository does not match recreation request');
  }

  if (preflight.targetRepositoryId !== targetRepositoryId) {
    throw new Error('Preflight target repository does not match recreation request');
  }

  const requestedItemIds = new Set(itemIds);
  const preflightItemIds = new Set(preflight.initialItemIds);
  const itemSetsMatch =
    requestedItemIds.size === preflightItemIds.size &&
    [...requestedItemIds].every(itemId => preflightItemIds.has(itemId));

  if (!itemSetsMatch) {
    throw new Error('Preflight item set does not match recreation request');
  }

  const missingSourceSnapshots = itemIds.filter(itemId => !preflight.sourceItems.has(itemId));
  if (missingSourceSnapshots.length > 0) {
    throw new Error(
      `Preflight source snapshots are missing requested items: ${missingSourceSnapshots.join(', ')}`
    );
  }
}

/**
 * Core logic for recreating content items from source to target hub
 * Note: This action assumes hierarchy analysis has already been done by the caller
 *
 * @param sourceService - Service for the source hub
 * @param targetService - Service for the target hub
 * @param itemsWithFolders - Items to recreate with their folder assignments
 * @param targetRepositoryId - Target repository ID
 * @param folderMapping - Map of source folder ID to target folder ID
 * @param progressBar - Optional progress bar for UI updates
 * @param targetLocale - Optional target locale override
 * @param resolveReferences - Whether to resolve content references (default: true for cross-hub)
 * @param sourceRepositoryId - Source repository ID (required when resolveReferences is true)
 * @param preflight - Completed content type and reference discovery preflight
 */
export async function recreateContentItems(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  itemsWithFolders: Array<{ itemId: string; sourceFolderId: string }>,
  targetRepositoryId: string,
  folderMapping: Map<string, string>, // Map of source folder ID → target folder ID
  progressBar: cliProgress.SingleBar | undefined,
  targetLocale: string | null | undefined,
  resolveReferences: boolean,
  sourceRepositoryId: string,
  preflight: ContentItemRecreationPreflightResult
): Promise<RecreateResult> {
  const itemIds = itemsWithFolders.map(item => item.itemId);
  assertReadyPreflight(preflight, sourceRepositoryId, targetRepositoryId, itemIds);
  const expectedItemCount = preflight.referenceSummary?.itemsToCreate ?? itemIds.length;
  console.log(`\n🔄 Starting recreation of ${expectedItemCount} content items...`);

  // Verify both services can access their respective repositories
  console.log(`\n🔍 Verifying service access...`);
  try {
    const sourceRepos = await sourceService.getRepositories();
    console.log(`✓ Source service authenticated - found ${sourceRepos.length} repositories`);

    const targetRepos = await targetService.getRepositories();
    console.log(`✓ Target service authenticated - found ${targetRepos.length} repositories`);

    // Verify target repository exists and is accessible
    const targetRepo = targetRepos.find(r => r.id === targetRepositoryId);
    if (!targetRepo) {
      throw new Error(
        `Target repository ${targetRepositoryId} not found in accessible repositories`
      );
    }
    console.log(`✓ Target repository confirmed: ${targetRepo.label} (${targetRepo.id})`);
  } catch (verificationError) {
    console.error(`❌ Service verification failed:`, verificationError);
    throw verificationError;
  }

  let successCount = 0;
  let failureCount = 0;
  let referencedSuccessCount = 0;
  let referencedFailureCount = 0;
  const results: Array<{
    id: string;
    success: boolean;
    error?: string;
    newId?: string;
    sourceItem?: Amplience.ContentItemWithDetails;
  }> = [];
  const referencedResults: Array<{
    id: string;
    success: boolean;
    error?: string;
    newId?: string;
    sourceItem: Amplience.ContentItemWithDetails;
  }> = [];
  const itemsToPublish: Array<{ itemId: string; sourceItem: Amplience.ContentItemWithDetails }> =
    [];

  // Reference resolution state
  let referenceResolutionResult: ReferenceResolutionResult | undefined;
  let sourceToTargetIdMap = new Map<string, string>();
  // Track whether we need to nullify references (when resolution is disabled or failed)
  let shouldNullifyReferences = !resolveReferences;
  const preparedReferenceResolution = preflight.referenceResolution;

  if (resolveReferences && preparedReferenceResolution.success) {
    referenceResolutionResult = preparedReferenceResolution.resolution;
    sourceToTargetIdMap = new Map(preparedReferenceResolution.registry.sourceToTargetIdMap);
    shouldNullifyReferences = false;

    console.log(`\n🔗 Using prepared content reference resolution...`);
    if (preflight.referenceSummary) {
      console.log(`  ✓ Discovered ${preflight.referenceSummary.totalDiscovered} items`);
      console.log(
        `  ✓ Matched ${preflight.referenceSummary.matchedReferences} referenced items in target`
      );
      console.log(`  ✓ Need to create ${preflight.referenceSummary.itemsToCreate} new items`);
    }

    if (referenceResolutionResult.circularGroups.length > 0) {
      console.log(
        `  ⚠️  Found ${referenceResolutionResult.circularGroups.length} circular reference groups`
      );
    }
  } else if (resolveReferences) {
    const errorMessage = preparedReferenceResolution.success
      ? 'Unknown error'
      : preparedReferenceResolution.error;
    console.warn(`  ⚠️  Reference resolution failed: ${errorMessage}`);
    console.log(`  📋 References will be nullified to prevent 403 errors...`);
    shouldNullifyReferences = true;
  }

  const requestedItemIds = new Set(itemIds);
  const orderedItemIds = referenceResolutionResult
    ? referenceResolutionResult.creationOrder.filter(itemId => requestedItemIds.has(itemId))
    : [];
  const orderedItemIdSet = new Set(orderedItemIds);
  const executionItemIds = referenceResolutionResult
    ? [...orderedItemIds, ...itemIds.filter(itemId => !orderedItemIdSet.has(itemId))]
    : itemIds;

  // Repair matched referenced items left incomplete by an earlier partial run.
  if (referenceResolutionResult) {
    const matchedReferencedEntries = [...referenceResolutionResult.registry.entries].filter(
      ([sourceId, entry]) =>
        !itemIds.includes(sourceId) &&
        Boolean(entry.targetId) &&
        !referenceResolutionResult.registry.externalReferenceIds.has(sourceId)
    );

    for (const [sourceId, entry] of matchedReferencedEntries) {
      try {
        const targetId = entry.targetId!;
        const targetItem = await targetService.getContentItemWithDetails(targetId);
        if (!targetItem) {
          throw new Error(`Could not load matched target item ${targetId}`);
        }

        const sourceDeliveryKey = entry.sourceItem.body._meta?.deliveryKey;
        const targetDeliveryKey = targetItem.body._meta?.deliveryKey;

        if (sourceDeliveryKey && !targetDeliveryKey) {
          await assignDeliveryKey(targetService, targetId, sourceDeliveryKey, targetItem.version);
          console.log(`  ✓ Repaired delivery key for matched reference ${sourceId}`);
        } else if (
          sourceDeliveryKey &&
          targetDeliveryKey &&
          sourceDeliveryKey !== targetDeliveryKey
        ) {
          throw new Error(
            `Matched target item ${targetId} has a different delivery key (${targetDeliveryKey})`
          );
        }

        const targetIsPublished =
          targetItem.publishingStatus === 'EARLY' || targetItem.publishingStatus === 'LATEST';
        if (shouldPublishItem(entry.sourceItem) && !targetIsPublished) {
          itemsToPublish.push({ itemId: targetId, sourceItem: entry.sourceItem });
          console.log(`  📋 Matched reference ${sourceId} marked for publishing recovery`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        referencedFailureCount++;
        referencedResults.push({
          id: sourceId,
          success: false,
          error: errorMessage,
          sourceItem: entry.sourceItem,
        });
        console.error(
          `  ❌ Failed to recover matched referenced item ${sourceId}: ${errorMessage}`
        );
      }
    }

    if (referencedFailureCount > 0) {
      return {
        success: false,
        itemsCreated: 0,
        itemsUpdated: 0,
        failed: referencedFailureCount,
        publishFailed: 0,
        referenceResolution: referenceResolutionResult,
      };
    }
  }

  // Create discovered references that weren't matched in target
  // These are content items referenced by the main items but don't exist in target hub
  if (referenceResolutionResult) {
    // Find items that were discovered but don't have a target ID (not matched)
    const unmatchedEntries = [...referenceResolutionResult.registry.entries.entries()].filter(
      ([sourceId, entry]) =>
        // Item was discovered (has sourceItem) but doesn't have a target ID
        entry.sourceItem &&
        !entry.targetId &&
        !itemIds.includes(sourceId) &&
        !referenceResolutionResult.registry.externalReferenceIds.has(sourceId)
    );

    const unmatchedEntriesById = new Map(unmatchedEntries);
    const orderedUnmatchedEntries = referenceResolutionResult.creationOrder
      .map(sourceId => {
        const entry = unmatchedEntriesById.get(sourceId);

        return entry ? ([sourceId, entry] as const) : null;
      })
      .filter(
        (entry): entry is readonly [string, NonNullable<(typeof unmatchedEntries)[number][1]>] =>
          entry !== null
      );

    for (const [sourceId, entry] of unmatchedEntries) {
      if (!orderedUnmatchedEntries.some(([orderedSourceId]) => orderedSourceId === sourceId)) {
        orderedUnmatchedEntries.push([sourceId, entry]);
      }
    }

    if (orderedUnmatchedEntries.length > 0) {
      console.log(
        `\n🔗 Phase 0: Creating ${orderedUnmatchedEntries.length} referenced items not in target...`
      );

      let fatalReferenceCreationFailure = false;

      for (const [sourceId, entry] of orderedUnmatchedEntries) {
        if (!entry.sourceItem) continue;
        let creationRecorded = false;
        let itemCreated = false;

        try {
          console.log(`  📋 Creating referenced item: ${entry.sourceItem.label} (${sourceId})`);

          // Prepare body for creation (remove hierarchy info for standalone items)
          const baseBody = prepareItemBodyForCreation(entry.sourceItem);

          // Transform any references in this item too
          let itemBody: Record<string, unknown>;
          if (sourceToTargetIdMap.size > 0) {
            const transformOptions: BodyTransformOptions = {
              phase: 2,
              sourceToTargetIdMap,
              preserveUnmapped: false,
            };
            itemBody = transformBodyReferences(baseBody, transformOptions);
          } else {
            itemBody = baseBody;
          }

          // Create the referenced item
          const newItem = await createContentItemInTarget(targetService, targetRepositoryId, {
            body: itemBody,
            label: entry.sourceItem.label,
            folderId: undefined, // Referenced items go to repository root
            locale: entry.sourceItem.locale,
          });

          if (newItem) {
            itemCreated = true;
            // Update the mapping
            sourceToTargetIdMap.set(sourceId, newItem.id);
            console.log(`  ✅ Created: ${entry.sourceItem.label} → ${newItem.id}`);

            // Assign delivery key if present
            if (entry.sourceItem.body._meta?.deliveryKey && !newItem.body._meta?.deliveryKey) {
              await assignDeliveryKey(
                targetService,
                newItem.id,
                entry.sourceItem.body._meta.deliveryKey,
                newItem.version
              );
              console.log(`  ✓ Assigned delivery key: ${entry.sourceItem.body._meta.deliveryKey}`);
            }

            // Track for publishing if source was published
            if (shouldPublishItem(entry.sourceItem)) {
              itemsToPublish.push({ itemId: newItem.id, sourceItem: entry.sourceItem });
            }

            referencedSuccessCount++;
            referencedResults.push({
              id: sourceId,
              success: true,
              newId: newItem.id,
              sourceItem: entry.sourceItem,
            });
            creationRecorded = true;
          } else {
            fatalReferenceCreationFailure = true;
            referencedFailureCount++;
            referencedResults.push({
              id: sourceId,
              success: false,
              error: 'Failed to create referenced item',
              sourceItem: entry.sourceItem,
            });
            creationRecorded = true;
            console.warn(`  ⚠️  Failed to create referenced item: ${entry.sourceItem.label}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!creationRecorded) {
            fatalReferenceCreationFailure = !itemCreated;
            referencedFailureCount++;
            referencedResults.push({
              id: sourceId,
              success: false,
              error: errorMessage,
              sourceItem: entry.sourceItem,
            });
          }
          console.warn(`  ❌ Error creating referenced item ${sourceId}: ${errorMessage}`);
        }

        if (fatalReferenceCreationFailure) {
          break;
        }
      }

      if (fatalReferenceCreationFailure) {
        console.error(
          '❌ Referenced item creation failed. Dependent content items were not created.'
        );

        return {
          success: false,
          itemsCreated: referencedSuccessCount,
          itemsUpdated: 0,
          failed: referencedFailureCount,
          publishFailed: 0,
          referenceResolution: referenceResolutionResult,
        };
      }
    }
  }

  // Phase 1: Create all content items without hierarchy relationships
  console.log(`\n🏗️  Phase 1: Creating ${itemIds.length} content items...`);

  for (const itemId of executionItemIds) {
    try {
      console.log(`\n📋 Processing item: ${itemId}`);

      // Step 1: Use the source snapshot that passed preflight validation
      const sourceItem = preflight.sourceItems.get(itemId)!;

      console.log(`  ✓ Fetched: ${sourceItem.label}`);

      // Step 2: Determine target folder for this item
      let targetFolderId: string | undefined;

      // Find the original folder assignment for this item
      const itemWithFolder = itemsWithFolders.find(item => item.itemId === itemId);
      if (itemWithFolder) {
        // Use the folder mapping to get the target folder ID
        targetFolderId = folderMapping.get(itemWithFolder.sourceFolderId);
        if (targetFolderId) {
          const sourceDescription = itemWithFolder.sourceFolderId
            ? `source folder: ${itemWithFolder.sourceFolderId}`
            : 'repository root';
          console.log(`  📁 Target folder: ${targetFolderId} (mapped from ${sourceDescription})`);
        } else {
          const sourceDescription = itemWithFolder.sourceFolderId
            ? `source folder: ${itemWithFolder.sourceFolderId}`
            : 'repository root';
          console.log(
            `  ⚠️  No target folder mapping found for ${sourceDescription}, placing in repository root`
          );
        }
      } else {
        console.log(`  📁 No specific folder assignment found, placing in repository root`);
      }

      // Step 3: Prepare item body for creation
      // If reference resolution was performed, transform the body to resolve references
      let newItemBody: Record<string, unknown>;
      if (resolveReferences && referenceResolutionResult) {
        // First prepare the base body
        const baseBody = prepareItemBodyForCreation(sourceItem);

        // Determine if this item is in a circular group
        const isInCircularGroup = referenceResolutionResult?.circularGroups.some(group =>
          group.includes(itemId)
        );

        if (isInCircularGroup) {
          // Phase 1: Nullify circular references
          const transformOptions: BodyTransformOptions = {
            phase: 1,
            sourceToTargetIdMap,
            preserveUnmapped: false,
          };
          newItemBody = transformBodyReferences(baseBody, transformOptions);
          console.log(`  🔄 Transformed body (phase 1 - circular refs nullified)`);
        } else {
          // Resolve references directly - nullify any unmapped references
          // to prevent 403 errors from invalid cross-hub content IDs
          const transformOptions: BodyTransformOptions = {
            phase: 2,
            sourceToTargetIdMap,
            preserveUnmapped: false, // Nullify unmapped refs to prevent 403 errors
          };
          newItemBody = transformBodyReferences(baseBody, transformOptions);
          console.log(`  🔄 Transformed body with resolved references`);
        }
      } else if (shouldNullifyReferences) {
        // Reference resolution was not performed or failed - nullify all references
        // to prevent 403 Forbidden errors from invalid cross-hub content IDs
        const baseBody = prepareItemBodyForCreation(sourceItem);
        newItemBody = nullifyReferences(baseBody);
        console.log(`  ⚠️  Nullified content references (resolution was skipped or failed)`);
      } else {
        newItemBody = prepareItemBodyForCreation(sourceItem);
      }

      // Step 4: Create content item in target
      const newItem = await createContentItemInTarget(targetService, targetRepositoryId, {
        body: newItemBody,
        label: sourceItem.label,
        folderId: targetFolderId,
        locale: determineTargetLocale(sourceItem.locale, targetLocale),
      });

      if (!newItem) {
        throw new Error('Failed to create content item');
      }

      console.log(`  ✓ Created: ${newItem.id}`);

      sourceToTargetIdMap.set(itemId, newItem.id);

      // Step 5: Handle delivery key if present
      if (sourceItem.body._meta?.deliveryKey && !newItem.body._meta?.deliveryKey) {
        await assignDeliveryKey(
          targetService,
          newItem.id,
          sourceItem.body._meta.deliveryKey,
          newItem.version
        );
        console.log(`  ✓ Assigned delivery key: ${sourceItem.body._meta.deliveryKey}`);
      }

      // Step 6: Collect items that need to be published (defer actual publishing)
      if (shouldPublishItem(sourceItem)) {
        itemsToPublish.push({ itemId: newItem.id, sourceItem });
        console.log(
          `  📋 Marked for publishing (source was ${sourceItem.status} with ${sourceItem.publishingStatus} publishing status)`
        );
      }

      results.push({ id: itemId, success: true, newId: newItem.id, sourceItem });
      successCount++;
      console.log(`  ✅ Successfully created item`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to create item ${itemId}: ${errorMessage}`);
      results.push({ id: itemId, success: false, error: errorMessage });
      failureCount++;
    } finally {
      // Update progress bar if provided
      if (progressBar) {
        progressBar.increment();
      }
    }
  }

  // Phase 2: Establish hierarchy relationships
  console.log(`\n🔗 Phase 2: Establishing hierarchy relationships...`);

  const hierarchyItems = results.filter(r => r.success && r.sourceItem?.hierarchy);
  const hierarchyRootItems = hierarchyItems.filter(r => r.sourceItem?.hierarchy?.root);
  const hierarchyChildItems = hierarchyItems.filter(
    r => r.sourceItem?.hierarchy && !r.sourceItem.hierarchy.root
  );

  console.log(
    `  � Found ${hierarchyRootItems.length} root items and ${hierarchyChildItems.length} child items`
  );

  // First, ensure all root items are properly established as hierarchy nodes
  if (hierarchyRootItems.length > 0) {
    console.log(`  🌳 Establishing root hierarchy items...`);

    for (const rootResult of hierarchyRootItems) {
      if (rootResult.newId && rootResult.sourceItem?.hierarchy?.root) {
        try {
          console.log(`    🔧 Ensuring ${rootResult.newId} is properly set as hierarchy root...`);

          // Verify the root item was created with proper hierarchy metadata
          const createdRootItem = await targetService.getContentItemWithDetails(rootResult.newId);
          if (!createdRootItem) {
            console.warn(`    ⚠️  Could not fetch created root item ${rootResult.newId}`);
            continue;
          }

          if (!createdRootItem.body._meta?.hierarchy?.root) {
            console.log(
              `    ⚠️  Root item ${rootResult.newId} missing hierarchy metadata, updating...`
            );

            // Update the item to ensure it has proper hierarchy root metadata
            const updateData: Amplience.UpdateContentItemRequest = {
              body: {
                ...createdRootItem.body,
                _meta: {
                  ...createdRootItem.body._meta,
                  hierarchy: {
                    root: true,
                    parentId: null,
                  },
                },
              },
              label: createdRootItem.label,
              version: createdRootItem.version,
              ...(createdRootItem.folderId && { folderId: createdRootItem.folderId }),
              ...(createdRootItem.locale && { locale: createdRootItem.locale }),
            };

            const updateResult = await targetService.updateContentItem(
              rootResult.newId,
              updateData
            );
            if (updateResult.success) {
              console.log(`    ✓ Updated root item with hierarchy metadata`);
            } else {
              console.warn(
                `    ⚠️  Failed to update root item hierarchy metadata: ${updateResult.error}`
              );
            }
          } else {
            console.log(`    ✓ Root item already has proper hierarchy metadata`);
          }

          // Optionally publish root items to ensure they're properly established
          // This might be required for the API to recognize them as valid hierarchy nodes
          if (rootResult.sourceItem && shouldPublishItem(rootResult.sourceItem)) {
            try {
              console.log(
                `    📤 Publishing root hierarchy item to establish it as valid hierarchy node...`
              );
              await publishTargetItem(targetService, rootResult.newId);
              console.log(`    ✓ Root hierarchy item published successfully`);

              // Small delay to ensure the published state is propagated
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (publishError) {
              console.warn(`    ⚠️  Failed to publish root hierarchy item: ${publishError}`);
              console.warn(
                `    💡 Continuing without publishing - hierarchy relationships may fail`
              );
            }
          }
        } catch (error) {
          console.warn(`    ⚠️  Error verifying/updating root item ${rootResult.newId}:`, error);
        }
      }
    }
  }

  // Now establish parent-child relationships
  if (hierarchyChildItems.length > 0) {
    console.log(`  👶 Establishing child-parent relationships...`);

    for (const childResult of hierarchyChildItems) {
      if (childResult.newId && childResult.sourceItem?.hierarchy?.parentId) {
        try {
          const parentSourceId = childResult.sourceItem.hierarchy.parentId;
          console.log(`    🔗 Setting up child ${childResult.newId} with parent ${parentSourceId}`);

          const parentResult = results.find(r => r.id === parentSourceId && r.success && r.newId);

          if (parentResult && parentResult.newId) {
            console.log(`    ✓ Found parent in results: ${parentResult.newId}`);

            // Add a small delay to ensure parent item is fully committed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify parent item exists and has hierarchy metadata before creating relationship
            try {
              const parentItem = await targetService.getContentItemWithDetails(parentResult.newId);
              if (!parentItem) {
                console.warn(
                  `    ⚠️ Parent item ${parentResult.newId} not found, skipping relationship`
                );
                continue;
              }

              if (!parentItem.body._meta?.hierarchy) {
                console.warn(
                  `    ⚠️ Parent item ${parentResult.newId} missing hierarchy metadata, skipping relationship`
                );
                continue;
              }

              console.log(`    ✓ Parent item verified as valid hierarchy node`);
            } catch (verifyError) {
              console.warn(
                `    ⚠️ Could not verify parent item ${parentResult.newId}:`,
                verifyError
              );
              continue;
            }

            const relationshipCreated = await createParentChildRelationship(
              targetService,
              targetRepositoryId,
              childResult.newId,
              parentResult.newId
            );

            if (relationshipCreated) {
              console.log(
                `    ✓ Established hierarchy relationship with parent ${parentResult.newId}`
              );
            } else {
              console.warn(
                `    ⚠️ Failed to establish hierarchy relationship with parent ${parentResult.newId}`
              );
            }
          } else {
            console.warn(
              `    ⚠️ Parent item ${parentSourceId} not found in results - hierarchy relationship skipped`
            );
          }
        } catch (error) {
          console.warn(
            `    ⚠️ Error establishing relationship for child ${childResult.newId}:`,
            error
          );
        }
      }
    }
  }

  // Step 8: Batch publish all items that were marked for publishing
  let publishFailedCount = 0;
  if (itemsToPublish.length > 0) {
    console.log(`\n📤 Publishing ${itemsToPublish.length} content items...`);
    const configuredConcurrency = parseInt(process.env.PUBLISH_CONCURRENCY || '5', 10);
    const publishConcurrency =
      isNaN(configuredConcurrency) || configuredConcurrency <= 0 ? 5 : configuredConcurrency;
    console.log(`  ⚙️  Using publish concurrency: ${publishConcurrency}`);

    const publishResults: Array<{ itemId: string; success: boolean; error?: string }> = [];
    const queue = [...itemsToPublish];
    const workerCount = Math.min(publishConcurrency, queue.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
          return;
        }

        try {
          await publishTargetItem(targetService, current.itemId);
          console.log(
            `  ✓ Published: ${current.itemId} (source was ${current.sourceItem.status} with ${current.sourceItem.publishingStatus})`
          );
          publishResults.push({ itemId: current.itemId, success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Failed to publish ${current.itemId}: ${errorMessage}`);
          publishResults.push({ itemId: current.itemId, success: false, error: errorMessage });
        }
      }
    });

    await Promise.all(workers);
    const publishedCount = publishResults.filter(r => r.success).length;
    publishFailedCount = publishResults.filter(r => !r.success).length;

    console.log(
      `  📊 Publishing completed: ${publishedCount} successful, ${publishFailedCount} failed`
    );

    if (publishFailedCount > 0) {
      console.log('  ❌ Failed to publish:');
      publishResults
        .filter(r => !r.success)
        .forEach(r => console.log(`    - ${r.itemId}: ${r.error}`));
    }
  }

  // Phase 3: Update items with circular references (if reference resolution was performed)
  let itemsUpdated = 0;
  if (
    resolveReferences &&
    referenceResolutionResult &&
    referenceResolutionResult.circularGroups.length > 0
  ) {
    console.log(`\n🔄 Phase 3: Resolving circular references...`);

    // Collect all item IDs in circular groups
    const circularGroupIds = new Set(referenceResolutionResult.circularGroups.flat());

    for (const itemId of circularGroupIds) {
      const result = results.find(r => r.id === itemId && r.success && r.newId);
      if (!result || !result.newId || !result.sourceItem) {
        continue;
      }

      try {
        console.log(`  🔄 Updating ${result.newId} with resolved references...`);

        // Fetch the current item to get its version
        const currentItem = await targetService.getContentItemWithDetails(result.newId);
        if (!currentItem) {
          console.warn(`    ⚠️ Could not fetch item ${result.newId} for update`);
          continue;
        }

        // Prepare the body with resolved references
        const baseBody = prepareItemBodyForCreation(result.sourceItem);
        const transformOptions: BodyTransformOptions = {
          phase: 2,
          sourceToTargetIdMap,
          preserveUnmapped: true,
        };
        const resolvedBody = transformBodyReferences(baseBody, transformOptions);

        // Update the item
        const updateRequest: Amplience.UpdateContentItemRequest = {
          body: resolvedBody,
          label: result.sourceItem.label,
          version: currentItem.version,
          ...(currentItem.folderId && { folderId: currentItem.folderId }),
          ...(currentItem.locale && { locale: currentItem.locale }),
        };

        const updateResult = await targetService.updateContentItem(result.newId, updateRequest);

        if (updateResult.success) {
          console.log(`    ✓ Resolved circular references for ${result.newId}`);
          itemsUpdated++;
        } else {
          console.warn(`    ⚠️ Failed to update ${result.newId}: ${updateResult.error}`);
        }
      } catch (updateError) {
        console.warn(`    ⚠️ Error updating ${result.newId}:`, updateError);
      }
    }
  }

  // Final report
  const totalSuccessCount = successCount + referencedSuccessCount;
  const totalFailureCount = failureCount + referencedFailureCount;
  console.log('\n📊 Recreation Summary:');
  console.log(
    `✅ Successfully recreated: ${totalSuccessCount} items ` +
      `(including hierarchy children and recursively referenced items)`
  );
  if (itemsUpdated > 0) {
    console.log(`🔄 Updated with resolved references: ${itemsUpdated} items`);
  }
  console.log(`❌ Failed: ${totalFailureCount} items`);

  if (totalFailureCount > 0) {
    console.log('\n❌ Failed items:');
    referencedResults
      .filter(result => !result.success)
      .forEach(result => console.log(`  - ${result.id}: ${result.error}`));
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.id}: ${r.error}`));
  }

  if (totalSuccessCount > 0) {
    console.log('\n✅ Successfully recreated items:');
    referencedResults
      .filter(result => result.success)
      .forEach(result => console.log(`  - ${result.id} → ${result.newId}`));
    results.filter(r => r.success).forEach(r => console.log(`  - ${r.id} → ${r.newId}`));
  }

  return {
    success: totalFailureCount === 0 && publishFailedCount === 0,
    itemsCreated: totalSuccessCount,
    itemsUpdated,
    failed: totalFailureCount,
    publishFailed: publishFailedCount,
    referenceResolution: referenceResolutionResult,
  };
}

/**
 * Result of the recreate content items operation
 */
export type RecreateResult = {
  success: boolean;
  itemsCreated: number;
  itemsUpdated: number;
  failed: number;
  publishFailed: number;
  referenceResolution?: ReferenceResolutionResult | undefined;
};

/**
 * Prepare content item body for creation by removing read-only properties
 */
function prepareItemBodyForCreation(
  sourceItem: Amplience.ContentItemWithDetails
): Record<string, unknown> {
  const body = { ...sourceItem.body };

  // Ensure _meta exists and preserve the schema
  if (body._meta) {
    body._meta = { ...body._meta };

    // Preserve the schema from the source item (this is required for content creation)
    // The schema should come from either sourceItem.schemaId or sourceItem.body._meta.schema
    const schema = sourceItem.schemaId || sourceItem.body._meta?.schema;
    if (schema) {
      body._meta.schema = schema;
    }

    // Roots must retain their marker so Amplience creates a valid hierarchy node.
    // Child parent IDs belong to the source hub and are recreated after item creation.
    if (body._meta?.hierarchy) {
      if (body._meta.hierarchy.root) {
        console.log('  🌳 Preserved hierarchy root marker for creation');
      } else {
        delete body._meta.hierarchy;
        console.log(
          '  🗂️  Removed hierarchy parent info from child item - will establish relationship after creation'
        );
      }
    }
  } else {
    // If _meta doesn't exist, create it with the schema
    const schema = sourceItem.schemaId || sourceItem.body._meta?.schema;
    if (schema) {
      body._meta = { schema };
    }
  }

  // Note: Content references/links are handled by the caller using:
  // - transformBodyReferences() when reference resolution succeeds
  // - nullifyReferences() when reference resolution fails or is skipped
  // This ensures invalid cross-hub content IDs don't cause 403 errors

  return body;
} /**
 * Create content item in target repository
 */
async function createContentItemInTarget(
  service: AmplienceService,
  repositoryId: string,
  newObject: NewObject
): Promise<Amplience.ContentItem | null> {
  const { body, locale, folderId, label } = newObject;
  try {
    console.log(`  🔨 Creating content item in target...`);

    // Prepare the request data
    const createRequest: Amplience.CreateContentItemRequest = {
      body,
      label,
      ...(locale && { locale }), // Only add folderId if it exists
      ...(folderId && { folderId }), // Only add folderId if it exists
    };

    console.log(
      `  🔍 Attempting to create content item${folderId ? ` in folder ${folderId}` : ' in repository root'}...`
    );

    // Use the existing createContentItem method
    const result = await service.createContentItem(repositoryId, createRequest);

    if (result.success && result.updatedItem) {
      return result.updatedItem;
    } else {
      console.error(`  ❌ Failed to create content item: ${result.error}`);

      // If creation failed and we were trying to use a folder, try without folder
      if (folderId && result.error?.includes('403')) {
        console.log(`  🔄 Retrying without folder assignment...`);
        const retryRequest: Amplience.CreateContentItemRequest = {
          body,
          label,
          ...(locale && { locale }), // Only add folderId if it exists
        };

        const retryResult = await service.createContentItem(repositoryId, retryRequest);
        if (retryResult.success && retryResult.updatedItem) {
          console.log(`  ✓ Created successfully without folder assignment`);

          return retryResult.updatedItem;
        } else {
          console.error(`  ❌ Retry also failed: ${retryResult.error}`);
        }
      }

      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error creating content item:`, error);

    return null;
  }
} /**
 * Assign delivery key to content item
 */
async function assignDeliveryKey(
  service: AmplienceService,
  itemId: string,
  deliveryKey: string,
  version: number
): Promise<void> {
  try {
    console.log(`  🔑 Assigning delivery key: ${deliveryKey}`);

    // Use the new method we added to AmplienceService
    const success = await service.assignDeliveryKey(itemId, deliveryKey, version);

    if (!success) {
      throw new Error('Failed to assign delivery key');
    }
  } catch (error) {
    console.error(`  ❌ Error assigning delivery key:`, error);
    throw error;
  }
}

/**
 * Create parent-child relationship between content items
 */
async function createParentChildRelationship(
  service: AmplienceService,
  repositoryId: string,
  childId: string,
  parentId: string
): Promise<boolean> {
  try {
    console.log(
      `      🔗 Attempting to create hierarchy relationship: child ${childId} -> parent ${parentId}`
    );

    const result = await service.createHierarchyNode(repositoryId, childId, parentId);

    if (result) {
      console.log(`      ✅ Successfully created hierarchy relationship`);
    } else {
      console.error(`      ❌ Failed to create hierarchy relationship (returned false)`);
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`      ❌ Error creating parent-child relationship: ${error.message}`);

      // Check for specific error patterns
      if (error.message.includes('CONTENT_ITEM_HIERARCHY_PARENT_NOT_HIERARCHY_NODE')) {
        console.error(
          `      💡 The parent item (${parentId}) is not recognized as a valid hierarchy node.`
        );
        console.error(
          `      💡 This might happen if the parent item needs to be published first or is missing hierarchy metadata.`
        );
      } else if (error.message.includes('400 Bad Request')) {
        console.error(
          `      💡 Bad request - check that both parent and child items exist and are valid.`
        );
      }
    } else {
      console.error(`      ❌ Unknown error creating parent-child relationship:`, error);
    }

    return false;
  }
}

type NewObject = {
  body: Record<string, unknown> & Amplience.MetaObj;
  label: string;
  folderId?: string | undefined;
  locale?: string | undefined;
};

/**
 * Determine if a content item should be published based on its status and publishing status
 */
function shouldPublishItem(item: Amplience.ContentItemWithDetails): boolean {
  return (
    item.status === 'ACTIVE' &&
    (item.publishingStatus === 'EARLY' || item.publishingStatus === 'LATEST')
  );
}

/**
 * Publish a content item in the target hub
 */
async function publishTargetItem(service: AmplienceService, itemId: string): Promise<void> {
  console.log(`  📤 Publishing content item: ${itemId}`);

  const result = await service.publishContentItem(itemId);

  if (!result.success) {
    console.log(`  ⚠️  Content item was created but could not be published`);
    throw new Error(result.error || 'Failed to publish content item');
  }

  console.log(`  ✓ Successfully published content item`);
}

/**
 * Determine the target locale based on user selection and source item locale
 */
function determineTargetLocale(
  sourceLocale: string | undefined,
  targetLocale: string | null | undefined
): string | undefined {
  // If targetLocale is null, keep source locale
  if (targetLocale === null) {
    return sourceLocale;
  }

  // If targetLocale is undefined, explicitly set no locale
  if (targetLocale === undefined) {
    return undefined;
  }

  // Otherwise, use the selected target locale
  return targetLocale;
}
