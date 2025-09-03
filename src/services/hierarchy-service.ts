import { AmplienceService } from './amplience-service';

export class HierarchyService {
  private amplienceService: AmplienceService;

  constructor(amplienceService: AmplienceService) {
    this.amplienceService = amplienceService;
  }

  /**
   * Build a hierarchy tree from a root content item
   */
  public async buildHierarchyTree(
    rootItemId: string,
    repositoryId: string
  ): Promise<Amplience.HierarchyNode> {
    try {
      console.log(`Building hierarchy tree for root item: ${rootItemId}`);

      // Get the root item
      const rootItem = await this.amplienceService.getContentItemWithDetails(rootItemId);
      if (!rootItem) {
        throw new Error(`Root item with ID ${rootItemId} not found`);
      }

      // Get all descendant items using the Hierarchy API
      let descendants = await this.amplienceService.getHierarchyDescendantsByApi(
        repositoryId,
        rootItemId,
        14,
        (fetched, total) => {
          console.log(`  📥 Fetched ${fetched}/${total} descendants...`);
        }
      );

      // If Hierarchy API returned no results, fall back to scanning all repository items
      if (descendants.length === 0) {
        console.log(
          `  🔄 Hierarchy API returned no descendants, falling back to repository scan...`
        );
        descendants = await this.amplienceService.getAllHierarchyDescendants(
          repositoryId,
          rootItemId,
          (fetched, total) => {
            console.log(`  📥 Scanned ${fetched}/${total} repository items...`);
          }
        );
      }

      // Build the tree structure
      const rootNode: Amplience.HierarchyNode = {
        item: rootItem,
        children: [],
      };

      // Create a map for quick lookup of items by ID
      const itemMap = new Map<string, Amplience.ContentItem>();
      itemMap.set(rootItem.id, rootItem);

      descendants.forEach(item => {
        itemMap.set(item.id, item);
      });

      // Create a map for building the tree structure
      const nodeMap = new Map<string, Amplience.HierarchyNode>();
      nodeMap.set(rootItem.id, rootNode);

      // Create nodes for all descendants
      descendants.forEach(item => {
        nodeMap.set(item.id, {
          item,
          children: [],
        });
      });

      // Build parent-child relationships
      descendants.forEach(item => {
        const node = nodeMap.get(item.id);
        if (!node) return;

        const parentId = item.hierarchy?.parentId;
        if (parentId) {
          const parentNode = nodeMap.get(parentId);
          if (parentNode) {
            parentNode.children.push(node);
          }
        }
      });

      console.log(`✅ Built hierarchy tree with ${descendants.length + 1} items`);

      return rootNode;
    } catch (error) {
      console.error(`❌ Error building hierarchy tree:`, error);
      throw error;
    }
  }

  /**
   * Generate a synchronization plan by comparing source and target hierarchies
   */
  public async generateSyncPlan(
    sourceTree: Amplience.HierarchyNode,
    targetTree: Amplience.HierarchyNode,
    updateContent: boolean = false
  ): Promise<Amplience.SyncPlan> {
    console.log('Generating synchronization plan...');

    const plan: Amplience.SyncPlan = {
      itemsToCreate: [],
      itemsToRemove: [],
      // Note: itemsToUpdate functionality can be added in future iterations
      // when content comparison and update logic is implemented
    };

    // Compare hierarchies recursively
    await this.compareNodes(sourceTree, targetTree, plan, updateContent);

    console.log(
      `✅ Generated sync plan: ${plan.itemsToCreate.length} to create, ${plan.itemsToRemove.length} to remove`
    );

    return plan;
  }

  /**
   * Recursively compare nodes and populate the sync plan
   */
  private async compareNodes(
    sourceNode: Amplience.HierarchyNode,
    targetNode: Amplience.HierarchyNode,
    plan: Amplience.SyncPlan,
    updateContent: boolean
  ): Promise<void> {
    // Validate uniqueness of children in source tree
    this.validateChildrenUniqueness(sourceNode.children, 'source');

    // Create a map of target children for efficient lookup
    const targetChildrenMap = new Map<string, Amplience.HierarchyNode>();
    targetNode.children.forEach(child => {
      const signature = this.getItemSignature(child.item);
      targetChildrenMap.set(signature, child);
    });

    // Process each source child
    for (const sourceChild of sourceNode.children) {
      const sourceSignature = this.getItemSignature(sourceChild.item);
      const matchingTargetChild = targetChildrenMap.get(sourceSignature);

      if (!matchingTargetChild) {
        // Item doesn't exist in target - needs to be created
        plan.itemsToCreate.push({
          action: 'CREATE',
          sourceItem: sourceChild.item,
          targetParentId: targetNode.item.id,
        });

        // Continue recursively for all descendants (they all need to be created)
        await this.addAllDescendantsToCreate(sourceChild, plan, sourceChild.item.id);
      } else {
        // Item exists - check if content update is needed
        if (updateContent && this.shouldUpdateContent(sourceChild.item, matchingTargetChild.item)) {
          // Note: UPDATE functionality to be implemented in future iterations
          console.log(`Item ${sourceChild.item.label} would be updated (not implemented yet)`);
        }

        // Continue recursively comparing children
        await this.compareNodes(sourceChild, matchingTargetChild, plan, updateContent);
      }
    }

    // Find items in target that don't exist in source (to be removed)
    const sourceChildrenMap = new Map<string, Amplience.HierarchyNode>();
    sourceNode.children.forEach(child => {
      const signature = this.getItemSignature(child.item);
      sourceChildrenMap.set(signature, child);
    });

    for (const targetChild of targetNode.children) {
      const targetSignature = this.getItemSignature(targetChild.item);
      if (!sourceChildrenMap.has(targetSignature)) {
        // Item exists in target but not in source - needs to be removed
        plan.itemsToRemove.push({
          action: 'REMOVE',
          sourceItem: targetChild.item, // Using target item as source for removal
          targetItem: targetChild.item,
        });

        // Continue recursively for all descendants (they all need to be removed)
        await this.addAllDescendantsToRemove(targetChild, plan);
      }
    }
  }

  /**
   * Add all descendants of a node to the create list
   */
  private async addAllDescendantsToCreate(
    node: Amplience.HierarchyNode,
    plan: Amplience.SyncPlan,
    parentId: string
  ): Promise<void> {
    for (const child of node.children) {
      plan.itemsToCreate.push({
        action: 'CREATE',
        sourceItem: child.item,
        targetParentId: parentId,
      });

      // Recursively add grandchildren
      await this.addAllDescendantsToCreate(child, plan, child.item.id);
    }
  }

  /**
   * Add all descendants of a node to the remove list
   */
  private async addAllDescendantsToRemove(
    node: Amplience.HierarchyNode,
    plan: Amplience.SyncPlan
  ): Promise<void> {
    for (const child of node.children) {
      plan.itemsToRemove.push({
        action: 'REMOVE',
        sourceItem: child.item,
        targetItem: child.item,
      });

      // Recursively add grandchildren
      await this.addAllDescendantsToRemove(child, plan);
    }
  }

  /**
   * Generate a unique signature for an item based on name and schema
   */
  private getItemSignature(item: Amplience.ContentItem): string {
    const name = item.body._meta?.name || item.label;
    const schema = item.body._meta?.schema || item.schemaId;

    return `${name}:${schema}`;
  }

  /**
   * Validate that no two children share the same signature
   */
  private validateChildrenUniqueness(children: Amplience.HierarchyNode[], context: string): void {
    const signatures = new Set<string>();
    const duplicates: string[] = [];

    children.forEach(child => {
      const signature = this.getItemSignature(child.item);
      if (signatures.has(signature)) {
        duplicates.push(signature);
      } else {
        signatures.add(signature);
      }
    });

    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate items found in ${context} hierarchy: ${duplicates.join(', ')}. ` +
          'Each level in the hierarchy must have unique name+schema combinations.'
      );
    }
  }

  /**
   * Determine if content should be updated (placeholder for future implementation)
   */

  private shouldUpdateContent(
    _sourceItem: Amplience.ContentItem,
    _targetItem: Amplience.ContentItem
  ): boolean {
    // For now, we don't implement content comparison
    // This would involve deep comparison of the body content
    return false;
  }

  /**
   * Display a formatted sync plan to the console
   */
  public displaySyncPlan(plan: Amplience.SyncPlan): void {
    console.log('\n📋 Synchronization Plan:');
    console.log('========================');

    if (plan.itemsToCreate.length > 0) {
      console.log(`\n🆕 Items to CREATE (${plan.itemsToCreate.length}):`);
      plan.itemsToCreate.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.sourceItem.label} (${item.sourceItem.body._meta?.schema || 'no-schema'})`
        );
      });
    }

    if (plan.itemsToRemove.length > 0) {
      console.log(`\n🗑️  Items to REMOVE (${plan.itemsToRemove.length}):`);
      plan.itemsToRemove.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.sourceItem.label} (${item.sourceItem.body._meta?.schema || 'no-schema'})`
        );
      });
    }

    if (plan.itemsToCreate.length === 0 && plan.itemsToRemove.length === 0) {
      console.log('\n✅ No changes needed - hierarchies are already synchronized!');
    }

    console.log('========================\n');
  }
}
