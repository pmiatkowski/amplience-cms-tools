/**
 * Tests for Content Reference Dependency Graph Service
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildDependencyGraph,
  topologicalSort,
  kahnTopologicalSort,
  detectStronglyConnectedComponents,
  getPhase1Items,
  getPhase2Items,
  wouldCreateCycle,
  getDependencyDepth,
  getTransitiveDependencies,
  type DependencyGraph,
} from './content-reference-graph';
import {
  createReferenceRegistry,
  registerItem,
} from './content-reference-mapping';
import type { DetectedReference, ReferenceRegistry } from './types';

// Helper function to create a mock content item with details
function createMockContentItem(
  id: string,
  label: string,
  schema: string
): Amplience.ContentItemWithDetails {
  return {
    id,
    label,
    schemaId: schema,
    status: 'ACTIVE' as Amplience.ContentStatus,
    publishingStatus: 'LATEST' as Amplience.PublishingStatus,
    createdDate: '2024-01-01T00:00:00Z',
    lastModifiedDate: '2024-01-01T00:00:00Z',
    version: 1,
    deliveryId: `delivery-${id}`,
    validationState: 'VALID',
    contentRepositoryId: 'repo-1',
    createdBy: 'user-1',
    lastModifiedBy: 'user-1',
    body: {
      _meta: {
        name: label,
        schema,
        deliveryKey: null,
      },
    },
  } as Amplience.ContentItemWithDetails;
}

// Helper function to create a detected reference
function createMockReference(
  sourceId: string,
  contentType: string,
  path: string
): DetectedReference {
  return {
    sourceId,
    contentType,
    path,
    isArrayElement: path.includes('['),
    referenceSchemaType: 'content-reference',
  };
}

// Helper to create a simple graph for testing
function createSimpleRegistry(
  items: { id: string; deps: string[] }[]
): ReferenceRegistry {
  const registry = createReferenceRegistry();

  for (const { id, deps } of items) {
    const item = createMockContentItem(id, `Item ${id}`, 'https://schema.test.com/test');
    const refs = deps.map((depId) =>
      createMockReference(depId, 'https://schema.test.com/test', `body.link-${depId}`)
    );
    registerItem(registry, item, refs);
  }

  return registry;
}

describe('buildDependencyGraph', () => {
  it('should build graph from registry', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);

    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('a')?.dependencies.has('b')).toBe(true);
    expect(graph.nodes.get('b')?.dependents.has('a')).toBe(true);
  });

  it('should handle items with no dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);

    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('a')?.dependencies.size).toBe(0);
    expect(graph.nodes.get('b')?.dependencies.size).toBe(0);
  });

  it('should filter out references to items not in registry', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['external'] }, // external not in registry
    ]);

    const graph = buildDependencyGraph(registry);

    expect(graph.nodes.size).toBe(1);
    expect(graph.nodes.get('a')?.dependencies.size).toBe(0);
  });

  it('should build bidirectional links', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b', 'c'] },
      { id: 'b', deps: [] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);

    // a depends on b and c
    expect(graph.nodes.get('a')?.dependencies.has('b')).toBe(true);
    expect(graph.nodes.get('a')?.dependencies.has('c')).toBe(true);

    // b and c are depended on by a
    expect(graph.nodes.get('b')?.dependents.has('a')).toBe(true);
    expect(graph.nodes.get('c')?.dependents.has('a')).toBe(true);
  });
});

describe('topologicalSort', () => {
  it('should return items in dependency order', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order = topologicalSort(graph);

    // b (dependency) should come before a (dependent)
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
  });

  it('should handle linear chain A -> B -> C', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order = topologicalSort(graph);

    // c -> b -> a
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
  });

  it('should handle diamond dependencies', () => {
    // Diamond: d -> b -> a
    //              -> c -> a
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['a'] },
      { id: 'd', deps: ['b', 'c'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order = topologicalSort(graph);

    // a should be first (no dependencies)
    // d should be last (depends on b and c)
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('should handle cyclic graph by adding cycles at end', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order = topologicalSort(graph);

    // Should still return all nodes
    expect(order.length).toBe(2);
    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('should return all nodes', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: [] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order = topologicalSort(graph);

    expect(order.length).toBe(3);
    expect(order).toContain('a');
    expect(order).toContain('b');
    expect(order).toContain('c');
  });
});

describe('kahnTopologicalSort', () => {
  it('should be equivalent to topologicalSort', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b', 'c'] },
      { id: 'b', deps: ['d'] },
      { id: 'c', deps: ['d'] },
      { id: 'd', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const order1 = topologicalSort(graph);
    const order2 = kahnTopologicalSort(graph);

    expect(order1).toEqual(order2);
  });

  it('should handle complex graph efficiently', () => {
    // Create a larger graph
    const items: { id: string; deps: string[] }[] = [];
    for (let i = 0; i < 100; i++) {
      items.push({
        id: `item-${i}`,
        deps: i > 0 ? [`item-${i - 1}`] : [],
      });
    }

    const registry = createSimpleRegistry(items);
    const graph = buildDependencyGraph(registry);
    const order = kahnTopologicalSort(graph);

    expect(order.length).toBe(100);
    // First item should be item-0 (no dependencies)
    expect(order[0]).toBe('item-0');
    // Last item should be item-99 (depends on all others)
    expect(order[99]).toBe('item-99');
  });
});

describe('detectStronglyConnectedComponents', () => {
  it('should detect simple cycle A -> B -> A', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(1);
    expect(sccs[0]).toContain('a');
    expect(sccs[0]).toContain('b');
  });

  it('should detect self-cycle A -> A', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(1);
    expect(sccs[0]).toContain('a');
  });

  it('should return empty array for acyclic graph', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(0);
  });

  it('should handle multiple disconnected cycles', () => {
    // Cycle 1: a -> b -> a
    // Cycle 2: c -> d -> c
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['d'] },
      { id: 'd', deps: ['c'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(2);

    // Each SCC should have 2 nodes
    const sccSizes = sccs.map((scc) => scc.length);
    expect(sccSizes).toContain(2);
    expect(sccSizes).toContain(2);
  });

  it('should detect complex cycle A -> B -> C -> A', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(1);
    expect(sccs[0].length).toBe(3);
    expect(sccs[0]).toContain('a');
    expect(sccs[0]).toContain('b');
    expect(sccs[0]).toContain('c');
  });

  it('should not include single nodes without self-reference', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(0);
  });

  it('should handle mixed acyclic and cyclic components', () => {
    // a -> b -> c -> d (acyclic)
    // e -> f -> e (cycle)
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: ['d'] },
      { id: 'd', deps: [] },
      { id: 'e', deps: ['f'] },
      { id: 'f', deps: ['e'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const sccs = detectStronglyConnectedComponents(graph);

    expect(sccs.length).toBe(1);
    expect(sccs[0]).toContain('e');
    expect(sccs[0]).toContain('f');
  });
});

describe('getPhase1Items', () => {
  it('should exclude items in circular groups', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);

    // Both a and b are in a cycle, so phase1 should be empty
    expect(phase1.length).toBe(0);
  });

  it('should include items with no circular dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);

    expect(phase1.length).toBe(2);
    expect(phase1).toContain('a');
    expect(phase1).toContain('b');
  });

  it('should handle mixed cyclic and acyclic items', () => {
    // a -> b -> c (acyclic)
    // d -> e -> d (cycle)
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
      { id: 'd', deps: ['e'] },
      { id: 'e', deps: ['d'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);

    expect(phase1.length).toBe(3);
    expect(phase1).toContain('a');
    expect(phase1).toContain('b');
    expect(phase1).toContain('c');
    expect(phase1).not.toContain('d');
    expect(phase1).not.toContain('e');
  });

  it('should return all items when no cycles exist', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: [] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);

    expect(phase1.length).toBe(3);
  });
});

describe('getPhase2Items', () => {
  it('should return only items in circular groups', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    expect(phase2.length).toBe(2);
    expect(phase2).toContain('a');
    expect(phase2).toContain('b');
  });

  it('should return empty array for acyclic graph', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    expect(phase2.length).toBe(0);
  });

  it('should handle self-referencing items', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    expect(phase2.length).toBe(1);
    expect(phase2).toContain('a');
  });

  it('should handle multiple disconnected circular groups', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['d'] },
      { id: 'd', deps: ['c'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    expect(phase2.length).toBe(4);
    expect(phase2).toContain('a');
    expect(phase2).toContain('b');
    expect(phase2).toContain('c');
    expect(phase2).toContain('d');
  });
});

describe('wouldCreateCycle', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
    ]);
    graph = buildDependencyGraph(registry);
  });

  it('should return true for cycle-creating edge', () => {
    // Adding c -> a would create cycle: a -> b -> c -> a
    expect(wouldCreateCycle(graph, 'c', 'a')).toBe(true);
  });

  it('should return false for safe edge', () => {
    // Adding c -> b is safe (no cycle)
    expect(wouldCreateCycle(graph, 'a', 'c')).toBe(false);
  });

  it('should return true for self-reference', () => {
    expect(wouldCreateCycle(graph, 'a', 'a')).toBe(true);
  });

  it('should return false when target does not exist', () => {
    expect(wouldCreateCycle(graph, 'a', 'nonexistent')).toBe(false);
  });

  it('should return false when source does not exist', () => {
    expect(wouldCreateCycle(graph, 'nonexistent', 'a')).toBe(false);
  });

  it('should detect indirect cycle', () => {
    // Adding c -> b would create cycle: b -> c -> b
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['b'] },
    ]);
    graph = buildDependencyGraph(registry);

    // Adding a -> c would create: c -> b -> a -> c
    expect(wouldCreateCycle(graph, 'a', 'c')).toBe(true);
  });
});

describe('getDependencyDepth', () => {
  it('should return 0 for items with no dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    expect(getDependencyDepth(graph, 'a')).toBe(0);
  });

  it('should return correct depth for linear chain', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);

    expect(getDependencyDepth(graph, 'c')).toBe(0);
    expect(getDependencyDepth(graph, 'b')).toBe(1);
    expect(getDependencyDepth(graph, 'a')).toBe(2);
  });

  it('should handle diamond dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['a'] },
      { id: 'd', deps: ['b', 'c'] },
    ]);

    const graph = buildDependencyGraph(registry);

    expect(getDependencyDepth(graph, 'a')).toBe(0);
    expect(getDependencyDepth(graph, 'b')).toBe(1);
    expect(getDependencyDepth(graph, 'c')).toBe(1);
    expect(getDependencyDepth(graph, 'd')).toBe(2);
  });

  it('should handle circular dependencies without infinite loop', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);

    // Should not hang and should return a reasonable value
    const depthA = getDependencyDepth(graph, 'a');
    const depthB = getDependencyDepth(graph, 'b');

    expect(typeof depthA).toBe('number');
    expect(typeof depthB).toBe('number');
  });

  it('should return 0 for non-existent node', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    expect(getDependencyDepth(graph, 'nonexistent')).toBe(0);
  });
});

describe('getTransitiveDependencies', () => {
  it('should return empty set for items with no dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const deps = getTransitiveDependencies(graph, 'a');

    expect(deps.size).toBe(0);
  });

  it('should return all transitive dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: ['d'] },
      { id: 'd', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const deps = getTransitiveDependencies(graph, 'a');

    expect(deps.size).toBe(3);
    expect(deps.has('b')).toBe(true);
    expect(deps.has('c')).toBe(true);
    expect(deps.has('d')).toBe(true);
  });

  it('should handle diamond dependencies', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
      { id: 'b', deps: ['a'] },
      { id: 'c', deps: ['a'] },
      { id: 'd', deps: ['b', 'c'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const deps = getTransitiveDependencies(graph, 'd');

    expect(deps.size).toBe(3);
    expect(deps.has('a')).toBe(true);
    expect(deps.has('b')).toBe(true);
    expect(deps.has('c')).toBe(true);
  });

  it('should handle circular dependencies without infinite loop', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);

    // Should not hang
    const depsA = getTransitiveDependencies(graph, 'a');
    const depsB = getTransitiveDependencies(graph, 'b');

    expect(depsA.has('b')).toBe(true);
    expect(depsB.has('a')).toBe(true);
  });

  it('should return empty set for non-existent node', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: [] },
    ]);

    const graph = buildDependencyGraph(registry);
    const deps = getTransitiveDependencies(graph, 'nonexistent');

    expect(deps.size).toBe(0);
  });

  it('should handle deep chains', () => {
    // Create a deep chain
    const items: { id: string; deps: string[] }[] = [];
    for (let i = 0; i < 50; i++) {
      items.push({
        id: `item-${i}`,
        deps: i > 0 ? [`item-${i - 1}`] : [],
      });
    }

    const registry = createSimpleRegistry(items);
    const graph = buildDependencyGraph(registry);

    // item-49 should have all items 0-48 as transitive dependencies
    const deps = getTransitiveDependencies(graph, 'item-49');
    expect(deps.size).toBe(49);
  });
});

describe('phase 1 and phase 2 integration', () => {
  it('should correctly separate items for two-phase creation', () => {
    // Complex scenario:
    // - a -> b -> c (acyclic, phase 1)
    // - d -> e -> d (cycle, phase 2)
    // - f -> d (depends on cycle item, phase 2)
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: [] },
      { id: 'd', deps: ['e'] },
      { id: 'e', deps: ['d'] },
      { id: 'f', deps: ['d'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    // Phase 1: a, b, c (acyclic)
    expect(phase1).toContain('a');
    expect(phase1).toContain('b');
    expect(phase1).toContain('c');

    // Phase 2: d, e (circular), f depends on d which is in cycle
    expect(phase2).toContain('d');
    expect(phase2).toContain('e');
    // Note: f is NOT in a cycle itself, but depends on d
    expect(phase1).toContain('f');
  });

  it('should handle all items in phase 2 when all are in cycles', () => {
    const registry = createSimpleRegistry([
      { id: 'a', deps: ['b'] },
      { id: 'b', deps: ['c'] },
      { id: 'c', deps: ['a'] },
    ]);

    const graph = buildDependencyGraph(registry);
    const phase1 = getPhase1Items(graph, graph.circularGroups);
    const phase2 = getPhase2Items(graph, graph.circularGroups);

    expect(phase1.length).toBe(0);
    expect(phase2.length).toBe(3);
  });
});
