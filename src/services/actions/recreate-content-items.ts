import cliProgress from 'cli-progress';
import { AmplienceService } from '../amplience-service';
import {
  nullifyReferences,
  resolveContentReferences,
  transformBodyReferences,
  type ReferenceResolutionResult,
  type BodyTransformOptions,
} from '../content-reference';

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
 */
export async function recreateContentItems(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  itemsWithFolders: Array<{ itemId: string; sourceFolderId: string }>,
  targetRepositoryId: string,
  folderMapping: Map<string, string>, // Map of source folder ID → target folder ID
  progressBar?: cliProgress.SingleBar,
  targetLocale?: string | null | undefined, // New parameter for target locale
  resolveReferences: boolean = true, // Enable reference resolution by default
  sourceRepositoryId?: string // Required when resolveReferences is true
): Promise<RecreateResult> {
  const itemIds = itemsWithFolders.map(item => item.itemId);
  console.log(`\n🔄 Starting recreation of ${itemIds.length} content items...`);

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
  const results: Array<{
    id: string;
    success: boolean;
    error?: string;
    newId?: string;
    sourceItem?: Amplience.ContentItemWithDetails;
  }> = [];
  const itemsToPublish: Array<{ itemId: string; sourceItem: Amplience.ContentItemWithDetails }> =
    [];

  // Reference resolution state
  let referenceResolutionResult: ReferenceResolutionResult | undefined;
  let sourceToTargetIdMap = new Map<string, string>();
  // Track whether we need to nullify references (when resolution is disabled or failed)
  let shouldNullifyReferences = !resolveReferences;

  // Resolve content references if enabled
  if (resolveReferences && sourceRepositoryId) {
    console.log(`\n🔗 Resolving content references...`);

    try {
      const resolverResult = await resolveContentReferences({
        sourceService,
        targetService,
        sourceRepositoryId,
        targetRepositoryId,
        initialItemIds: itemIds,
        onProgress: (phase, current, total) => {
          console.log(`  📊 ${phase}: ${current}/${total}`);
        },
      });

      if (resolverResult.success) {
        referenceResolutionResult = resolverResult.resolution;
        sourceToTargetIdMap = resolverResult.registry.sourceToTargetIdMap;
        shouldNullifyReferences = false; // Resolution succeeded, no need to nullify

        console.log(`  ✓ Discovered ${referenceResolutionResult.totalDiscovered} items`);
        console.log(
          `  ✓ Matched ${referenceResolutionResult.matchedCount} existing items in target`
        );
        console.log(`  ✓ Need to create ${referenceResolutionResult.toCreateCount} new items`);

        if (referenceResolutionResult.circularGroups.length > 0) {
          console.log(
            `  ⚠️  Found ${referenceResolutionResult.circularGroups.length} circular reference groups`
          );
        }
      } else {
        console.warn(`  ⚠️  Reference resolution failed: ${resolverResult.error}`);
        console.log(`  📋 References will be nullified to prevent 403 errors...`);
        shouldNullifyReferences = true;
      }
    } catch (refError) {
      console.warn(`  ⚠️  Reference resolution error:`, refError);
      console.log(`  📋 References will be nullified to prevent 403 errors...`);
      shouldNullifyReferences = true;
    }
  } else if (resolveReferences && !sourceRepositoryId) {
    console.log(
      `  ⚠️  Reference resolution requested but sourceRepositoryId not provided, skipping...`
    );
    console.log(`  📋 References will be nullified to prevent 403 errors...`);
    shouldNullifyReferences = true;
  }

  // Phase 1: Create all content items without hierarchy relationships
  console.log(`\n🏗️  Phase 1: Creating ${itemIds.length} content items...`);

  for (const itemId of itemIds) {
    try {
      console.log(`\n📋 Processing item: ${itemId}`);

      // Step 1: Fetch full content item details from source
      const sourceItem = await fetchFullContentItem(sourceService, itemId);
      if (!sourceItem) {
        throw new Error(`Could not fetch source item details`);
      }

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
      if (resolveReferences && sourceToTargetIdMap.size > 0) {
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

      // Step 5: Handle delivery key if present
      if (sourceItem.body._meta?.deliveryKey && !newItem.body._meta?.deliveryKey) {
        await assignDeliveryKey(targetService, newItem.id, sourceItem.body._meta.deliveryKey);
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
  if (itemsToPublish.length > 0) {
    console.log(`\n📤 Publishing ${itemsToPublish.length} content items...`);

    const publishPromises = itemsToPublish.map(async ({ itemId, sourceItem }) => {
      try {
        await publishTargetItem(targetService, itemId);
        console.log(
          `  ✓ Published: ${itemId} (source was ${sourceItem.status} with ${sourceItem.publishingStatus})`
        );

        return { itemId, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Failed to publish ${itemId}: ${errorMessage}`);

        return { itemId, success: false, error: errorMessage };
      }
    });

    const publishResults = await Promise.all(publishPromises);
    const publishedCount = publishResults.filter(r => r.success).length;
    const publishFailedCount = publishResults.filter(r => !r.success).length;

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
  console.log('\n📊 Recreation Summary:');
  console.log(`✅ Successfully recreated: ${successCount} items (including hierarchy children)`);
  if (itemsUpdated > 0) {
    console.log(`🔄 Updated with resolved references: ${itemsUpdated} items`);
  }
  console.log(`❌ Failed: ${failureCount} items`);

  if (failureCount > 0) {
    console.log('\n❌ Failed items:');
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.id}: ${r.error}`));
  }

  if (successCount > 0) {
    console.log('\n✅ Successfully recreated items:');
    results.filter(r => r.success).forEach(r => console.log(`  - ${r.id} → ${r.newId}`));
  }

  return {
    success: failureCount === 0,
    itemsCreated: successCount,
    itemsUpdated,
    failed: failureCount,
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
  referenceResolution?: ReferenceResolutionResult | undefined;
};

/**
 * Fetch full content item details including hierarchy children
 */
async function fetchFullContentItem(
  service: AmplienceService,
  itemId: string
): Promise<Amplience.ContentItemWithDetails | null> {
  try {
    console.log(`  🔍 Fetching content item ${itemId}...`);

    // Use the new method we added to AmplienceService
    const item = await service.getContentItemWithDetails(itemId);

    return item;
  } catch (error) {
    console.error(`  ❌ Error fetching content item ${itemId}:`, error);

    return null;
  }
}

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

    // Remove read-only fields that should not be included during content creation
    // For hierarchy, we'll handle relationships separately after all items are created
    // IMPORTANT: We must remove ALL hierarchy metadata during creation - the Amplience API
    // returns 403 Forbidden if we try to create items with _meta.hierarchy already set.
    // Hierarchy relationships must be established after creation using the hierarchy API.
    if (body._meta?.hierarchy) {
      const wasRoot = body._meta.hierarchy.root;
      delete body._meta.hierarchy;
      console.log(
        `  🗂️  Removed hierarchy info from ${wasRoot ? 'root' : 'child'} item - will establish relationship after creation`
      );
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

    // First, let's verify we can access the target repository
    console.log(`  🔍 Verifying access to target repository: ${repositoryId}`);
    try {
      const repos = await service.getRepositories();
      const targetRepo = repos.find(r => r.id === repositoryId);
      if (!targetRepo) {
        throw new Error(`Target repository ${repositoryId} not found or not accessible`);
      }
      console.log(`  ✓ Target repository accessible: ${targetRepo.label}`);

      // Check if the required schema/content type is available in the target repository
      const bodyWithMeta = body;
      const requiredSchema = bodyWithMeta._meta?.schema;
      if (requiredSchema && targetRepo.contentTypes) {
        console.log(`  🔍 Required schema: ${requiredSchema}`);
        // console.warn(JSON.stringify(targetRepo.contentTypes), null, 2);

        const hasContentType = targetRepo.contentTypes.some(
          ct => ct.contentTypeUri === requiredSchema
        );
        if (hasContentType) {
          console.log(`  ✓ Required content type available: ${requiredSchema}`);
        } else {
          console.log(
            `  ⚠️  Required content type not found in target repository: ${requiredSchema}`
          );
          console.log(`  � You need to register this content type in the target repository first.`);
          throw new Error(`Content type ${requiredSchema} not available in target repository`);
        }
      }
    } catch (repoError) {
      console.error(`  ❌ Cannot access target repository: ${repoError}`);
      throw repoError;
    }

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
  deliveryKey: string
): Promise<void> {
  try {
    console.log(`  🔑 Assigning delivery key: ${deliveryKey}`);

    // Use the new method we added to AmplienceService
    const success = await service.assignDeliveryKey(itemId, deliveryKey);

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
  try {
    console.log(`  📤 Publishing content item: ${itemId}`);

    const result = await service.publishContentItem(itemId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to publish content item');
    }

    console.log(`  ✓ Successfully published content item`);
  } catch (error) {
    console.error(`  ❌ Error publishing content item:`, error);
    // Don't throw the error - we want to continue with other operations
    // Just log it as a warning since the content item was created successfully
    console.log(`  ⚠️  Content item was created but could not be published`);
  }
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
