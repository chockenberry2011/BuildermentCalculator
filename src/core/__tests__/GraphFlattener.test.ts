import { describe, it, expect } from 'vitest';
import { flattenToDAG, layoutDAG } from '../GraphFlattener';
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
});
