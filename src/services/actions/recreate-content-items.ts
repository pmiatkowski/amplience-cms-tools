import cliProgress from 'cli-progress';
import { AmplienceService } from '../amplience-service';

/**
 * Core logic for recreating content items from source to target hub
 */
export async function recreateContentItems(
  sourceService: AmplienceService,
  targetService: AmplienceService,
  itemsWithFolders: Array<{ itemId: string; sourceFolderId: string }>, // Changed to include folder info
  targetRepositoryId: string,
  folderMapping: Map<string, string>, // Map of source folder ID → target folder ID
  progressBar?: cliProgress.SingleBar,
  targetLocale?: string | null | undefined // New parameter for target locale
): Promise<void> {
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

  // Step 0: Collect all hierarchy descendants for selected root items
  console.log(`\n🌳 Analyzing hierarchy structure...`);

  // First, get the source repository ID and all items for hierarchy analysis
  let sourceRepositoryId: string | undefined;
  let allSourceItems: Amplience.ContentItem[] = [];

  if (itemIds.length > 0) {
    console.log(`  🔍 Getting repository information...`);
    const firstItemDetails = await sourceService.getContentItemWithDetails(itemIds[0]);
    if (firstItemDetails && firstItemDetails.contentRepositoryId) {
      sourceRepositoryId = firstItemDetails.contentRepositoryId;
      console.log(`  🔍 Using source repository: ${sourceRepositoryId}`);

      // Fetch all content items from the repository once for efficient hierarchy analysis
      console.log(`  📦 Fetching all content items from repository for hierarchy analysis...`);
      allSourceItems = await sourceService.getAllContentItems(
        sourceRepositoryId,
        (fetched, total) =>
          console.log(`    📊 Loading repository items: ${fetched}/${total} items processed`),
        { size: 100 } // Use larger page size for efficiency
      );
      console.log(`  ✓ Loaded ${allSourceItems.length} items from source repository`);
    }
  }

  // Create a map of item ID to basic item info for quick hierarchy lookup
  const itemHierarchyMap = new Map<string, { hierarchy?: Amplience.Hierarchy }>();
  allSourceItems.forEach(item => {
    itemHierarchyMap.set(item.id, item.hierarchy ? { hierarchy: item.hierarchy } : {});
  });

  // Find root items (items that don't have parents or are explicitly root)
  const rootItems: string[] = [];
  const nonRootItems: string[] = [];

  for (const itemId of itemIds) {
    const itemInfo = itemHierarchyMap.get(itemId);
    if (itemInfo && itemInfo.hierarchy) {
      if (itemInfo.hierarchy.root) {
        rootItems.push(itemId);
      } else {
        nonRootItems.push(itemId);
      }
    } else {
      // If no hierarchy info, treat as standalone item
      rootItems.push(itemId);
    }
  }

  console.log(
    `  📊 Found ${rootItems.length} root/standalone items and ${nonRootItems.length} child items`
  );

  // Collect all descendants for root items using the new efficient method
  let allDescendants: string[] = [];
  let hierarchyApiAvailable = true; // Flag to track if Hierarchy API is available

  if (rootItems.length > 0 && sourceRepositoryId) {
    // Collect descendants for all root items using the Hierarchy API with fallback
    for (const rootId of rootItems) {
      console.log(`  🔍 Fetching descendants for root item: ${rootId}`);

      if (hierarchyApiAvailable) {
        try {
          // Try the new Hierarchy API first
          console.log(
            `🔎 Fetching hierarchy descendants for ${rootId} using Hierarchy API (depth: 14)`
          );
          const descendants = await sourceService.getHierarchyDescendantsByApi(
            sourceRepositoryId,
            rootId,
            14, // Max depth
            (fetched, total) =>
              console.log(`    📊 Loading content items: ${fetched}/${total} items processed`)
          );
          allDescendants.push(...descendants.map(d => d.id));
          console.log(
            `  ✓ Found ${descendants.length} descendants for ${rootId} using Hierarchy API`
          );
          continue; // Success, move to next root item
        } catch (error) {
          // Check if this is a 404 error indicating API not available
          if (error instanceof Error && error.message.includes('404')) {
            console.log(
              `  ℹ️ Hierarchy API not available, switching to repository scan method for all remaining items`
            );
            hierarchyApiAvailable = false; // Don't try Hierarchy API for remaining items
          } else {
            console.warn(
              `  ⚠️ Hierarchy API failed for ${rootId}: ${error instanceof Error ? error.message : String(error)}`
            );
            // For non-404 errors, still try fallback for this item
          }
        }
      }

      // Use repository scan method (either as fallback or because Hierarchy API is unavailable)
      try {
        console.log(`    🔄 Using repository scan method for ${rootId}`);
        const descendants = await sourceService.getAllHierarchyDescendants(
          sourceRepositoryId,
          rootId,
          (fetched, total) =>
            console.log(`    📊 Scanning repository items: ${fetched}/${total} items processed`)
        );
        allDescendants.push(...descendants.map(d => d.id));
        console.log(
          `  ✓ Found ${descendants.length} descendants for ${rootId} using repository scan method`
        );
      } catch (fallbackError) {
        console.error(`  ❌ Repository scan also failed for ${rootId}:`, fallbackError);
        // Continue with other root items
      }
    }

    // Remove duplicates
    allDescendants = [...new Set(allDescendants)];
  }
  console.log(`  📊 Found ${allDescendants.length} hierarchy descendants`);

  // If no hierarchy descendants were found and we have items that appear to be hierarchy items,
  // it might mean the items don't actually have hierarchy relationships despite the metadata
  if (allDescendants.length === 0 && (rootItems.length > 0 || nonRootItems.length > 0)) {
    console.log(
      `  💡 No hierarchy descendants found. Items may be standalone or hierarchy relationships may not exist.`
    );
  }

  // Create final processing list and sort by hierarchy depth to ensure parents are processed before children
  const allItemsToProcess = [...rootItems, ...allDescendants, ...nonRootItems];
  const uniqueItemsToProcess = [...new Set(allItemsToProcess)]; // Remove duplicates

  // Sort items by hierarchy depth to ensure parents are processed before children
  const sortedItemsToProcess = sortItemsByHierarchyDepth(uniqueItemsToProcess, itemHierarchyMap);

  console.log(
    `  📊 Total items to process: ${sortedItemsToProcess.length} (including discovered hierarchy children)`
  );
  console.log(`  📊 Items sorted by hierarchy depth for proper parent-child processing order`);

  // Debug: Show processing order for hierarchy items
  if (sortedItemsToProcess.length <= 20) {
    // Only show for small lists to avoid spam
    console.log(`  🔍 Processing order (first 20 items):`);
    sortedItemsToProcess.slice(0, 20).forEach((itemId, index) => {
      const itemInfo = itemHierarchyMap.get(itemId);
      const hierarchyInfo = itemInfo?.hierarchy
        ? itemInfo.hierarchy.root
          ? 'root'
          : `child of ${itemInfo.hierarchy.parentId}`
        : 'standalone';
      console.log(`    ${index + 1}. ${itemId} (${hierarchyInfo})`);
    });
    if (sortedItemsToProcess.length > 20) {
      console.log(`    ... and ${sortedItemsToProcess.length - 20} more items`);
    }
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

  // Phase 1: Create all content items without hierarchy relationships
  console.log(`\n🏗️  Phase 1: Creating ${sortedItemsToProcess.length} content items...`);

  for (const itemId of sortedItemsToProcess) {
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
          console.log(
            `  📁 Target folder: ${targetFolderId} (mapped from source folder: ${itemWithFolder.sourceFolderId})`
          );
        } else {
          console.log(
            `  ⚠️  No target folder mapping found for source folder: ${itemWithFolder.sourceFolderId}, placing in repository root`
          );
        }
      } else {
        console.log(`  📁 No specific folder assignment found, placing in repository root`);
      }

      // Step 3: Prepare item body for creation
      const newItemBody = prepareItemBodyForCreation(sourceItem);

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

  // Final report
  console.log('\n📊 Recreation Summary:');
  console.log(`✅ Successfully recreated: ${successCount} items (including hierarchy children)`);
  console.log(`❌ Failed: ${failureCount} items`);

  if (failureCount > 0) {
    console.log('\n❌ Failed items:');
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.id}: ${r.error}`));
  }

  if (successCount > 0) {
    console.log('\n✅ Successfully recreated items:');
    results.filter(r => r.success).forEach(r => console.log(`  - ${r.id} → ${r.newId}`));
  }
}

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
    if (body._meta?.hierarchy?.root) {
      body._meta.hierarchy = { root: true, parentId: null }; // Ensure root hierarchy is preserved
    } else if (body._meta?.hierarchy) {
      // For child items, remove hierarchy during creation - we'll establish relationships later
      delete body._meta.hierarchy;
      console.log(
        `  🗂️  Removed hierarchy info from child item - will establish relationship after creation`
      );
    }
  } else {
    // If _meta doesn't exist, create it with the schema
    const schema = sourceItem.schemaId || sourceItem.body._meta?.schema;
    if (schema) {
      body._meta = { schema };
    }
  }

  // Handle content links - remove invalid references that don't exist in target hub
  const bodyAny = body as Record<string, unknown>;
  if (bodyAny.component && Array.isArray(bodyAny.component)) {
    console.log(
      `  🔗 Found ${bodyAny.component.length} content links - these will need to be updated manually after creation`
    );
    // For now, we'll keep the component array but note that the IDs won't be valid in target hub
    // In a future enhancement, this could be mapped to equivalent content in target hub
  }

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
 * Sort items by hierarchy depth to ensure parents are processed before children
 */
function sortItemsByHierarchyDepth(
  itemIds: string[],
  itemHierarchyMap: Map<string, { hierarchy?: Amplience.Hierarchy }>
): string[] {
  // Calculate hierarchy depth for each item
  const itemsWithDepth = itemIds.map(itemId => {
    const itemInfo = itemHierarchyMap.get(itemId);
    let depth = 0;

    if (itemInfo?.hierarchy) {
      if (itemInfo.hierarchy.root) {
        depth = 0; // Root items have depth 0
      } else {
        // For child items, calculate depth by traversing up the hierarchy
        depth = calculateHierarchyDepth(itemId, itemHierarchyMap, new Set());
      }
    }

    return { itemId, depth };
  });

  // Sort by depth (ascending), so parents (lower depth) are processed before children (higher depth)
  itemsWithDepth.sort((a, b) => a.depth - b.depth);

  return itemsWithDepth.map(item => item.itemId);
}

/**
 * Calculate the hierarchy depth of an item by traversing up to the root
 */
function calculateHierarchyDepth(
  itemId: string,
  itemHierarchyMap: Map<string, { hierarchy?: Amplience.Hierarchy }>,
  visited: Set<string>
): number {
  // Prevent infinite loops in case of circular references
  if (visited.has(itemId)) {
    console.warn(`⚠️  Circular reference detected in hierarchy for item ${itemId}`);

    return 0;
  }

  visited.add(itemId);

  const itemInfo = itemHierarchyMap.get(itemId);
  if (!itemInfo?.hierarchy) {
    return 0; // No hierarchy info or not a hierarchy item
  }

  if (itemInfo.hierarchy.root) {
    return 0; // Root item has depth 0
  }

  if (!itemInfo.hierarchy.parentId) {
    return 0; // No parent, treat as root
  }

  // Recursively calculate parent depth + 1
  const parentDepth = calculateHierarchyDepth(
    itemInfo.hierarchy.parentId,
    itemHierarchyMap,
    visited
  );

  return parentDepth + 1;
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
