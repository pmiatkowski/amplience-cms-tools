/**
 * Content Reference Dependency Graph Service
 *
 * This module provides dependency graph algorithms for determining the correct
 * order for item creation. It handles circular references with a two-phase approach.
 */
import type { ReferenceRegistry } from './types';



/**
 * Build a dependency graph from the reference registry
 * An edge A -> B means "A depends on B" (A references B)
 */
export function buildDependencyGraph(registry: ReferenceRegistry): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();

  // Create nodes for all registered items
  for (const [sourceId, entry] of registry.entries) {
    // Filter to only include dependencies on items also in the registry
    const dependencies = new Set(
      entry.referencesTo.filter((refId) => registry.entries.has(refId))
    );

    nodes.set(sourceId, {
      id: sourceId,
      dependencies,
      dependents: new Set(),
    });
  }

  // Build reverse links (dependents)
  for (const [sourceId, node] of nodes) {
    for (const depId of node.dependencies) {
      const depNode = nodes.get(depId);
      if (depNode) {
        depNode.dependents.add(sourceId);
      }
    }
  }

  // Detect circular groups
  const circularGroups = detectStronglyConnectedComponents({ nodes, circularGroups: [] });

  return { nodes, circularGroups };
}




/**
 * The dependency graph structure
 */
export type DependencyGraph = {
  /** Map of node ID to node */
  nodes: Map<string, DependencyNode>;
  /** Circular reference groups detected in the graph */
  circularGroups: string[][];
}


/**
 * A node in the dependency graph
 */
export type DependencyNode = {
  /** Unique identifier (source item ID) */
  id: string;
  /** Set of item IDs this node depends on (references to) */
  dependencies: Set<string>;
  /** Set of item IDs that depend on this node (referenced by) */
  dependents: Set<string>;
}



/**
 * Detect all strongly connected components (cycles) using Tarjan's algorithm
 * Returns an array of node groups that form cycles (size > 1 or self-referencing)
 */
export function detectStronglyConnectedComponents(graph: DependencyGraph): string[][] {
  const { nodes } = graph;
  const sccs: string[][] = [];

  // Tarjan's algorithm state
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();

  function strongConnect(nodeId: string): void {
    // Set the depth index for nodeId
    indices.set(nodeId, index);
    lowLinks.set(nodeId, index);
    index++;
    stack.push(nodeId);
    onStack.add(nodeId);

    const node = nodes.get(nodeId);
    if (node) {
      // Consider dependencies as successors in the graph
      for (const depId of node.dependencies) {
        if (!indices.has(depId)) {
          // Successor has not yet been visited; recurse on it
          strongConnect(depId);
          const currentLowLink = lowLinks.get(nodeId) ?? 0;
          const depLowLink = lowLinks.get(depId) ?? 0;
          lowLinks.set(nodeId, Math.min(currentLowLink, depLowLink));
        } else if (onStack.has(depId)) {
          // Successor is in stack and hence in the current SCC
          const currentLowLink = lowLinks.get(nodeId) ?? 0;
          const depIndex = indices.get(depId) ?? 0;
          lowLinks.set(nodeId, Math.min(currentLowLink, depIndex));
        }
      }
    }

    // If nodeId is a root node, pop the stack and generate an SCC
    const nodeIndex = indices.get(nodeId) ?? 0;
    const nodeLowLink = lowLinks.get(nodeId) ?? 0;

    if (nodeLowLink === nodeIndex) {
      const scc: string[] = [];
      let w: string | undefined;

      do {
        w = stack.pop();
        if (w) {
          onStack.delete(w);
          scc.push(w);
        }
      } while (w !== nodeId);

      // Only include SCCs that are actual cycles (size > 1 or self-reference)
      if (scc.length > 1) {
        sccs.push(scc);
      } else if (scc.length === 1) {
        // Check for self-reference
        const singleNodeId = scc[0];
        const singleNode = nodes.get(singleNodeId);
        if (singleNode && singleNode.dependencies.has(singleNodeId)) {
          sccs.push(scc);
        }
      }
    }
  }

  // Run Tarjan's algorithm for each node
  for (const nodeId of nodes.keys()) {
    if (!indices.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  return sccs;
}






/**
 * Get the dependency depth for an item (longest path to a leaf)
 * Returns 0 for items with no dependencies
 */
export function getDependencyDepth(graph: DependencyGraph, nodeId: string): number {
  const node = graph.nodes.get(nodeId);
  if (!node || node.dependencies.size === 0) {
    return 0;
  }

  // Use memoization to avoid recalculating
  const depthCache = new Map<string, number>();

  // Handle circular dependencies by using iterative approach with visited set
  const visited = new Set<string>();
  const stack: { id: string; processing: boolean }[] = [{ id: nodeId, processing: false }];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current.processing) {
      // All dependencies processed, calculate depth
      const n = graph.nodes.get(current.id);
      if (!n || n.dependencies.size === 0) {
        depthCache.set(current.id, 0);
      } else {
        let maxChildDepth = 0;
        for (const depId of n.dependencies) {
          maxChildDepth = Math.max(maxChildDepth, depthCache.get(depId) ?? 0);
        }
        depthCache.set(current.id, maxChildDepth + 1);
      }
      continue;
    }

    if (depthCache.has(current.id) || visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);
    stack.push({ id: current.id, processing: true });

    const n = graph.nodes.get(current.id);
    if (n) {
      for (const depId of n.dependencies) {
        if (!visited.has(depId) && !depthCache.has(depId)) {
          stack.push({ id: depId, processing: false });
        }
      }
    }
  }

  return depthCache.get(nodeId) ?? 0;
}






/**
 * Get items that can be created in phase 1 (no circular dependencies)
 * These items have all their dependencies resolvable in topological order
 */
export function getPhase1Items(graph: DependencyGraph, circularGroups: string[][]): string[] {
  // Flatten all items in circular groups
  const circularItems = new Set(circularGroups.flat());

  // Return all items not in circular groups
  const phase1Items: string[] = [];
  for (const nodeId of graph.nodes.keys()) {
    if (!circularItems.has(nodeId)) {
      phase1Items.push(nodeId);
    }
  }

  return phase1Items;
}





/**
 * Get items that need phase 2 update (items in circular groups)
 * These items are created with null references in phase 1, then updated in phase 2
 */
export function getPhase2Items(graph: DependencyGraph, circularGroups: string[][]): string[] {
  // Flatten all items in circular groups
  const circularItems = new Set(circularGroups.flat());

  // Return only items in circular groups
  const phase2Items: string[] = [];
  for (const nodeId of graph.nodes.keys()) {
    if (circularItems.has(nodeId)) {
      phase2Items.push(nodeId);
    }
  }

  return phase2Items;
}






/**
 * Get all transitive dependencies for an item
 * Returns all item IDs that this item directly or indirectly depends on
 */
export function getTransitiveDependencies(graph: DependencyGraph, nodeId: string): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [nodeId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const node = graph.nodes.get(current);
    if (node) {
      for (const depId of node.dependencies) {
        result.add(depId);
        if (!visited.has(depId)) {
          stack.push(depId);
        }
      }
    }
  }

  return result;
}






/**
 * Perform Kahn's algorithm for topological sort
 * More efficient for large graphs - O(V + E)
 */
export function kahnTopologicalSort(graph: DependencyGraph): string[] {
  const { nodes } = graph;
  const result: string[] = [];

  // Calculate in-degree (number of dependencies) for each node
  const inDegree = new Map<string, number>();
  const queue: string[] = [];

  for (const [nodeId, node] of nodes) {
    inDegree.set(nodeId, node.dependencies.size);
    if (node.dependencies.size === 0) {
      queue.push(nodeId);
    }
  }

  // Process nodes with no remaining dependencies
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    result.push(currentId);

    // For each node that depends on currentId, reduce its in-degree
    const currentNode = nodes.get(currentId);
    if (currentNode) {
      for (const dependentId of currentNode.dependents) {
        const degree = inDegree.get(dependentId) ?? 0;
        const newDegree = degree - 1;
        inDegree.set(dependentId, newDegree);

        if (newDegree === 0) {
          queue.push(dependentId);
        }
      }
    }
  }

  // If not all nodes are in result, add remaining (circular deps) at the end
  for (const nodeId of nodes.keys()) {
    if (!result.includes(nodeId)) {
      result.push(nodeId);
    }
  }

  return result;
}




/**
 * Perform topological sort on the dependency graph
 * Returns items in order where dependencies come before dependents
 * For cyclic graphs, returns items in best-effort order with cycles at the end
 */
export function topologicalSort(graph: DependencyGraph): string[] {
  return kahnTopologicalSort(graph);
}


/**
 * Check if adding a dependency from fromId to toId would create a cycle
 * Uses DFS to check if toId is reachable from fromId
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  fromId: string,
  toId: string
): boolean {
  // If toId doesn't exist in graph, no cycle possible
  if (!graph.nodes.has(toId)) {
    return false;
  }

  // If fromId doesn't exist, no cycle possible
  if (!graph.nodes.has(fromId)) {
    return false;
  }

  // Self-reference would create a cycle
  if (fromId === toId) {
    return true;
  }

  // Check if toId is reachable from fromId via DFS
  // If so, adding edge fromId -> toId would create a cycle
  const visited = new Set<string>();
  const stack: string[] = [toId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === fromId) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const node = graph.nodes.get(current);
    if (node) {
      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          stack.push(depId);
        }
      }
    }
  }

  return false;
}
