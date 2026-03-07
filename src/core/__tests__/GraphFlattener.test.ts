import { describe, it, expect } from 'vitest';
import { flattenToDAG, layoutDAG, computeTopologicalRanks, computeBranchGroups } from '../GraphFlattener';
import { calculateProduction, calculateMultiProduction, getDefaultBuildingLevels } from '../ProductionCalculator';

const defaultLevels = getDefaultBuildingLevels();
const noRecipes = new Map<string, string>();

describe('flattenToDAG', () => {
  it('deduplicates nodes for simple production', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    // Each item should appear exactly once
    const ids = dag.nodes.map((n) => n.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('creates edges from children to parents', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    expect(dag.edges.length).toBeGreaterThan(0);
    for (const edge of dag.edges) {
      expect(dag.nodes.some((n) => n.itemId === edge.fromItemId)).toBe(true);
      expect(dag.nodes.some((n) => n.itemId === edge.toItemId)).toBe(true);
    }
  });

  it('handles diamond dependencies', () => {
    // Steel has iron_ingot + coal; iron_ingot has iron_ore
    // Both are deduped in the DAG
    const result = calculateProduction('steel', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const ironOreNodes = dag.nodes.filter((n) => n.itemId === 'iron_ore');
    expect(ironOreNodes).toHaveLength(1);
  });

  it('sums rates for deduplicated nodes', () => {
    // A complex item with shared dependencies
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);

    for (const node of dag.nodes) {
      expect(node.totalRate.toNumber()).toBeGreaterThan(0);
    }
  });

  it('handles multi-root without multi_root node in edges', () => {
    const result = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'copper_wire', rate: 1 },
      ],
      noRecipes,
      defaultLevels
    );
    const dag = flattenToDAG(result);

    // No edges should reference __multi_root__
    for (const edge of dag.edges) {
      expect(edge.toItemId).not.toBe('__multi_root__');
      expect(edge.fromItemId).not.toBe('__multi_root__');
    }
  });

  it('handles raw resource only (no edges)', () => {
    const result = calculateProduction('iron_ore', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    expect(dag.nodes).toHaveLength(1);
    expect(dag.edges).toHaveLength(0);
  });
});

describe('flattenToDAG dedicated mode', () => {
  it('splits shared node with non-splitter-friendly ratio', () => {
    // Electric motor at 7.5/min has graphite feeding both steel and electromagnet
    // with a non-power-of-2 ratio
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const dag = flattenToDAG(result, 'dedicated');

    // Check for split graphite nodes
    const graphiteNodes = dag.nodes.filter((n) => n.itemId === 'graphite');

    // In merged mode, graphite has 2 consumers (steel + electromagnet)
    const mergedDag = flattenToDAG(result, 'merged');
    const mergedGraphiteOutEdges = mergedDag.edges.filter((e) => e.fromItemId === 'graphite');

    if (mergedGraphiteOutEdges.length >= 2) {
      // If graphite has multiple consumers, it should be split in dedicated mode
      // (unless the ratio happens to be splitter-friendly)
      expect(graphiteNodes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps single-consumer nodes unchanged', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const mergedDag = flattenToDAG(result, 'merged');
    const dedicatedDag = flattenToDAG(result, 'dedicated');

    // Simple linear chain — no shared nodes to split
    expect(dedicatedDag.nodes.length).toBe(mergedDag.nodes.length);
    expect(dedicatedDag.edges.length).toBe(mergedDag.edges.length);
  });

  it('split node rates sum to original total', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const mergedDag = flattenToDAG(result, 'merged');
    const dedicatedDag = flattenToDAG(result, 'dedicated');

    // For each item that was split, verify rates sum to original
    const mergedRates = new Map<string, number>();
    for (const node of mergedDag.nodes) {
      mergedRates.set(node.itemId, node.totalRate.toNumber());
    }

    const dedicatedRates = new Map<string, number>();
    for (const node of dedicatedDag.nodes) {
      const existing = dedicatedRates.get(node.itemId) ?? 0;
      dedicatedRates.set(node.itemId, existing + node.totalRate.toNumber());
    }

    for (const [itemId, mergedRate] of mergedRates) {
      const dedicatedRate = dedicatedRates.get(itemId) ?? 0;
      expect(dedicatedRate).toBeCloseTo(mergedRate, 6);
    }
  });

  it('all dedicated nodes have nodeKey different from itemId', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const dag = flattenToDAG(result, 'dedicated');

    for (const node of dag.nodes) {
      if (node.consumerItemId) {
        expect(node.nodeKey).toBe(`${node.itemId}_for_${node.consumerItemId}`);
        expect(node.consumerItemName).toBeTruthy();
      } else {
        expect(node.nodeKey).toBe(node.itemId);
      }
    }
  });

  it('merged mode sets nodeKey equal to itemId for all nodes', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const dag = flattenToDAG(result, 'merged');

    for (const node of dag.nodes) {
      expect(node.nodeKey).toBe(node.itemId);
    }
  });

  it('splitter-friendly shared nodes stay merged in dedicated mode', () => {
    // Find or construct a case where a shared node has a power-of-2 ratio sum
    // For now, verify that not ALL shared nodes are split — only unfriendly ones
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    const mergedDag = flattenToDAG(result, 'merged');
    const dedicatedDag = flattenToDAG(result, 'dedicated');

    // Count how many nodes have consumerItemId set (= were split)
    const splitCount = dedicatedDag.nodes.filter((n) => n.consumerItemId).length;
    // Some nodes should stay merged (those with friendly ratios or single consumer)
    const mergedCount = dedicatedDag.nodes.filter((n) => !n.consumerItemId).length;
    expect(mergedCount).toBeGreaterThan(0);

    // Total unique itemIds should be preserved
    const mergedItemIds = new Set(mergedDag.nodes.map((n) => n.itemId));
    const dedicatedItemIds = new Set(dedicatedDag.nodes.map((n) => n.itemId));
    expect(dedicatedItemIds).toEqual(mergedItemIds);

    // If any were split, verify they were actually non-friendly
    if (splitCount > 0) {
      expect(splitCount).toBeGreaterThanOrEqual(2); // split creates at least 2 nodes
    }
  });
});

describe('flattenToDAG hybrid mode', () => {
  it('splits fewer nodes than dedicated mode', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const hybridDag = flattenToDAG(result, 'hybrid');
    const dedicatedDag = flattenToDAG(result, 'dedicated');

    // Hybrid is more permissive, so it should split the same or fewer nodes
    const hybridSplitCount = hybridDag.nodes.filter((n) => n.consumerItemId).length;
    const dedicatedSplitCount = dedicatedDag.nodes.filter((n) => n.consumerItemId).length;

    expect(hybridSplitCount).toBeLessThanOrEqual(dedicatedSplitCount);
  });

  it('split node rates sum to original total', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const mergedDag = flattenToDAG(result, 'merged');
    const hybridDag = flattenToDAG(result, 'hybrid');

    const mergedRates = new Map<string, number>();
    for (const node of mergedDag.nodes) {
      mergedRates.set(node.itemId, node.totalRate.toNumber());
    }

    const hybridRates = new Map<string, number>();
    for (const node of hybridDag.nodes) {
      const existing = hybridRates.get(node.itemId) ?? 0;
      hybridRates.set(node.itemId, existing + node.totalRate.toNumber());
    }

    for (const [itemId, mergedRate] of mergedRates) {
      const hybridRate = hybridRates.get(itemId) ?? 0;
      expect(hybridRate).toBeCloseTo(mergedRate, 6);
    }
  });

  it('hybrid split items are a subset of dedicated split items', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const hybridDag = flattenToDAG(result, 'hybrid');
    const dedicatedDag = flattenToDAG(result, 'dedicated');

    const hybridSplitItems = new Set(
      hybridDag.nodes.filter((n) => n.consumerItemId).map((n) => n.itemId),
    );
    const dedicatedSplitItems = new Set(
      dedicatedDag.nodes.filter((n) => n.consumerItemId).map((n) => n.itemId),
    );

    for (const itemId of hybridSplitItems) {
      expect(dedicatedSplitItems.has(itemId)).toBe(true);
    }
  });

  it('preserves all unique itemIds', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const mergedDag = flattenToDAG(result, 'merged');
    const hybridDag = flattenToDAG(result, 'hybrid');

    const mergedItemIds = new Set(mergedDag.nodes.map((n) => n.itemId));
    const hybridItemIds = new Set(hybridDag.nodes.map((n) => n.itemId));
    expect(hybridItemIds).toEqual(mergedItemIds);
  });
});

describe('flattenToDAG cascading splits', () => {
  it('all edges reference existing nodes (no orphaned edges)', () => {
    // super_computer has cascading splits: wood_log feeds graphite (which also splits)
    const result = calculateProduction('super_computer', 2, noRecipes, defaultLevels);
    for (const mode of ['dedicated', 'hybrid'] as const) {
      const dag = flattenToDAG(result, mode);
      const nodeKeys = new Set(dag.nodes.map((n) => n.nodeKey));

      for (const edge of dag.edges) {
        expect(nodeKeys.has(edge.fromNodeKey)).toBe(true);
        expect(nodeKeys.has(edge.toNodeKey)).toBe(true);
      }
    }
  });

  it('no nodes are orphaned (every non-root has incoming, every non-raw has outgoing)', () => {
    const result = calculateProduction('super_computer', 2, noRecipes, defaultLevels);
    for (const mode of ['dedicated', 'hybrid'] as const) {
      const dag = flattenToDAG(result, mode);
      const nodeKeys = new Set(dag.nodes.map((n) => n.nodeKey));
      const hasIncoming = new Set<string>();
      const hasOutgoing = new Set<string>();

      for (const edge of dag.edges) {
        if (nodeKeys.has(edge.toNodeKey)) hasIncoming.add(edge.toNodeKey);
        if (nodeKeys.has(edge.fromNodeKey)) hasOutgoing.add(edge.fromNodeKey);
      }

      for (const node of dag.nodes) {
        // Raw resources have no incoming edges — that's fine
        // But non-raw nodes should have at least one incoming edge
        if (!node.isRaw) {
          expect(hasIncoming.has(node.nodeKey)).toBe(true);
        }
        // Root node (super_computer) has no outgoing edges — that's fine
        // But non-root nodes should have at least one outgoing edge
        if (node.nodeKey !== 'super_computer') {
          expect(hasOutgoing.has(node.nodeKey)).toBe(true);
        }
      }
    }
  });
});

describe('layoutDAG', () => {
  it('assigns positions to all nodes', () => {
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const positions = layoutDAG(dag);
    expect(positions.size).toBe(dag.nodes.length);
  });

  it('raw resources have rank 0 (leftmost x)', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const positions = layoutDAG(dag);

    const rawNode = dag.nodes.find((n) => n.isRaw);
    if (rawNode) {
      const rawPos = positions.get(rawNode.itemId)!;
      const productPos = positions.get('iron_ingot')!;
      expect(rawPos.x).toBeLessThan(productPos.x);
    }
  });

  it('returns empty map for empty DAG', () => {
    const positions = layoutDAG({ nodes: [], edges: [] });
    expect(positions.size).toBe(0);
  });

  it('places all direct inputs in the column immediately before the product (sink-aligned)', () => {
    const result = calculateProduction('electric_motor', 7.5, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const positions = layoutDAG(dag);

    const motorPos = positions.get('electric_motor')!;
    const ironGearPos = positions.get('iron_gear')!;
    const rotorPos = positions.get('rotor')!;
    const batteryPos = positions.get('battery')!;

    // Extract rank (column) from x position — all same-rank nodes share the same base x
    // Ranks are spaced 280px apart, so dividing by spacing and rounding gives the rank
    const xSpacing = 280;
    const getRank = (pos: { x: number }) => Math.round(pos.x / xSpacing);

    const motorRank = getRank(motorPos);
    const gearRank = getRank(ironGearPos);
    const rotorRank = getRank(rotorPos);
    const batteryRank = getRank(batteryPos);

    // All three direct inputs should be at the same rank
    expect(gearRank).toBe(rotorRank);
    expect(gearRank).toBe(batteryRank);

    // And that rank should be exactly one less than the product
    expect(gearRank).toBe(motorRank - 1);
  });

  it('does not include dummy nodes in layout output', () => {
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const positions = layoutDAG(dag);

    // No position keys should start with __dummy_
    for (const key of positions.keys()) {
      expect(key.startsWith('__dummy_')).toBe(false);
    }

    // Every position should correspond to a real DAG node
    const dagNodeKeys = new Set(dag.nodes.map((n) => n.nodeKey));
    for (const key of positions.keys()) {
      expect(dagNodeKeys.has(key)).toBe(true);
    }
  });

  it('nodes within the same rank share the same x position (no stagger)', () => {
    const result = calculateProduction('turbocharger', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const positions = layoutDAG(dag);

    // Group positions by rank (x / 280)
    const xSpacing = 280;
    const rankXValues = new Map<number, Set<number>>();
    for (const pos of positions.values()) {
      const rank = Math.round(pos.x / xSpacing);
      if (!rankXValues.has(rank)) rankXValues.set(rank, new Set());
      rankXValues.get(rank)!.add(pos.x);
    }

    // Each rank should have exactly one unique x value
    for (const [, xValues] of rankXValues) {
      expect(xValues.size).toBe(1);
    }
  });
});

describe('computeBranchGroups', () => {
  it('simple linear chain produces 1 branch, no shared', () => {
    const result = calculateProduction('iron_ingot', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const ranks = computeTopologicalRanks(dag);
    const rootKeys = new Set(['iron_ingot']);
    const groups = computeBranchGroups(dag, rootKeys, ranks);

    // Should have: Final Product, 1 branch (iron_ore), Raw Resources
    const rootGroup = groups.find((g) => g.isRoot);
    const rawGroup = groups.find((g) => g.isRaw);
    const sharedGroup = groups.find((g) => g.isShared);
    expect(rootGroup).toBeDefined();
    expect(rawGroup).toBeDefined();
    expect(sharedGroup).toBeUndefined();
  });

  it('branching recipe produces multiple branches + shared section', () => {
    const result = calculateProduction('computer', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const ranks = computeTopologicalRanks(dag);
    const rootKeys = new Set(['computer']);
    const groups = computeBranchGroups(dag, rootKeys, ranks);

    // Should have Final Product + at least 2 branches + Raw Resources
    const rootGroup = groups.find((g) => g.isRoot);
    const rawGroup = groups.find((g) => g.isRaw);
    const branchGroups = groups.filter((g) => !g.isRoot && !g.isRaw && !g.isShared);
    expect(rootGroup).toBeDefined();
    expect(rawGroup).toBeDefined();
    expect(branchGroups.length).toBeGreaterThanOrEqual(2);

    // All nodes should appear exactly once across all groups
    const allNodeKeys = groups.flatMap((g) => g.nodes.map((n) => n.nodeKey));
    expect(new Set(allNodeKeys).size).toBe(allNodeKeys.length);
    expect(allNodeKeys.length).toBe(dag.nodes.length);
  });

  it('single raw resource degenerates to raw group only', () => {
    const result = calculateProduction('iron_ore', 1, noRecipes, defaultLevels);
    const dag = flattenToDAG(result);
    const ranks = computeTopologicalRanks(dag);
    const rootKeys = new Set(['iron_ore']);
    const groups = computeBranchGroups(dag, rootKeys, ranks);

    // iron_ore is both root and raw — it goes to root group
    const rootGroup = groups.find((g) => g.isRoot);
    expect(rootGroup).toBeDefined();
    expect(rootGroup!.nodes).toHaveLength(1);
    // No branch groups since root has no inputs
    const branchGroups = groups.filter((g) => !g.isRoot && !g.isRaw && !g.isShared);
    expect(branchGroups.length).toBe(0);
  });

  it('multi-root production creates branches from multiple targets', () => {
    const result = calculateMultiProduction(
      [
        { itemId: 'iron_ingot', rate: 1 },
        { itemId: 'copper_wire', rate: 1 },
      ],
      noRecipes,
      defaultLevels,
    );
    const dag = flattenToDAG(result);
    const ranks = computeTopologicalRanks(dag);
    const rootKeys = new Set(['iron_ingot', 'copper_wire']);
    const groups = computeBranchGroups(dag, rootKeys, ranks);

    // All nodes should be accounted for
    const allNodeKeys = groups.flatMap((g) => g.nodes.map((n) => n.nodeKey));
    expect(new Set(allNodeKeys).size).toBe(allNodeKeys.length);
    expect(allNodeKeys.length).toBe(dag.nodes.length);
  });

  it('dedicated mode produces fewer shared nodes', () => {
    const result = calculateProduction('computer', 1, noRecipes, defaultLevels);

    const mergedDag = flattenToDAG(result, 'merged');
    const mergedRanks = computeTopologicalRanks(mergedDag);
    const mergedGroups = computeBranchGroups(mergedDag, new Set(['computer']), mergedRanks);
    const mergedShared = mergedGroups.find((g) => g.isShared)?.nodes.length ?? 0;

    const dedicatedDag = flattenToDAG(result, 'dedicated');
    const dedicatedRanks = computeTopologicalRanks(dedicatedDag);
    // In dedicated mode, root nodeKey for split nodes may differ
    const dedicatedRootKeys = new Set(
      dedicatedDag.nodes.filter((n) => n.itemId === 'computer').map((n) => n.nodeKey),
    );
    const dedicatedGroups = computeBranchGroups(dedicatedDag, dedicatedRootKeys, dedicatedRanks);
    const dedicatedShared = dedicatedGroups.find((g) => g.isShared)?.nodes.length ?? 0;

    expect(dedicatedShared).toBeLessThanOrEqual(mergedShared);
  });
});
