import { ProductionResult, ProductionNode, BuildingRequirement } from './ProductionCalculator';
import { Recipe } from '../data/recipes';
import { Rational } from './math/rational';

export interface FlatNode {
  itemId: string;
  itemName: string;
  totalRate: Rational;
  building: BuildingRequirement | null;
  isRaw: boolean;
  recipe: Recipe | null;
}

export interface FlatEdge {
  fromItemId: string;   // producer (child in tree)
  toItemId: string;     // consumer (parent in tree)
  rate: Rational;       // items/min flowing on this connection
  itemName: string;     // display name of the item flowing
}

export interface FlatDAG {
  nodes: FlatNode[];
  edges: FlatEdge[];
}

/**
 * Flatten the recursive ProductionNode tree into a deduplicated DAG.
 * Each item appears exactly once; rates are summed across all tree occurrences.
 */
export function flattenToDAG(result: ProductionResult): FlatDAG {
  // Step 1: Build deduplicated nodes from allNodes map
  const nodeMap = new Map<string, FlatNode>();

  for (const [itemId, nodes] of result.allNodes) {
    // Sum rates across all occurrences
    let totalRate = Rational.zero();
    let building: BuildingRequirement | null = null;
    let isRaw = false;
    let recipe: Recipe | null = null;
    let itemName = itemId;

    for (const node of nodes) {
      totalRate = totalRate.add(node.ratePerMinute);
      itemName = node.itemName;
      isRaw = node.isRaw;
      recipe = node.recipe;

      // Take building info from first node (type/level consistent per item)
      if (!building && node.building) {
        building = {
          buildingType: node.building.buildingType,
          count: node.building.count,
          level: node.building.level,
        };
      } else if (building && node.building) {
        // Sum building counts
        building = {
          buildingType: building.buildingType,
          count: building.count.add(node.building.count),
          level: building.level,
        };
      }
    }

    nodeMap.set(itemId, { itemId, itemName, totalRate, building, isRaw, recipe });
  }

  // Step 2: Walk tree to discover unique edges
  const edgeMap = new Map<string, FlatEdge>();

  function walkEdges(node: ProductionNode) {
    for (const child of node.children) {
      // Skip edges from the synthetic multi-root node
      if (node.itemId !== '__multi_root__') {
        const edgeKey = `${child.itemId}->${node.itemId}`;
        const existing = edgeMap.get(edgeKey);
        if (existing) {
          // Sum rates for duplicate edges
          edgeMap.set(edgeKey, {
            ...existing,
            rate: existing.rate.add(child.ratePerMinute),
          });
        } else {
          edgeMap.set(edgeKey, {
            fromItemId: child.itemId,
            toItemId: node.itemId,
            rate: child.ratePerMinute,
            itemName: child.itemName,
          });
        }
      }
      walkEdges(child);
    }
  }

  walkEdges(result.root);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/**
 * Compute layout positions for the DAG using topological ranking.
 * Raw resources on left (rank 0), final product on right (highest rank).
 */
export function layoutDAG(dag: FlatDAG): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (dag.nodes.length === 0) return positions;

  // Build adjacency: for each node, which nodes feed into it (inputs)
  const inputsOf = new Map<string, string[]>();    // itemId -> list of input itemIds
  const outputsOf = new Map<string, string[]>();   // itemId -> list of consumer itemIds

  for (const node of dag.nodes) {
    inputsOf.set(node.itemId, []);
    outputsOf.set(node.itemId, []);
  }

  for (const edge of dag.edges) {
    inputsOf.get(edge.toItemId)?.push(edge.fromItemId);
    outputsOf.get(edge.fromItemId)?.push(edge.toItemId);
  }

  // Topological rank: raw/leaf nodes get rank 0, others get max(input ranks) + 1
  const ranks = new Map<string, number>();

  function computeRank(itemId: string, visited: Set<string>): number {
    if (ranks.has(itemId)) return ranks.get(itemId)!;
    if (visited.has(itemId)) return 0; // cycle guard
    visited.add(itemId);

    const inputs = inputsOf.get(itemId) ?? [];
    if (inputs.length === 0) {
      ranks.set(itemId, 0);
      return 0;
    }

    let maxInputRank = 0;
    for (const inputId of inputs) {
      maxInputRank = Math.max(maxInputRank, computeRank(inputId, visited));
    }
    const rank = maxInputRank + 1;
    ranks.set(itemId, rank);
    return rank;
  }

  for (const node of dag.nodes) {
    computeRank(node.itemId, new Set());
  }

  // Group nodes by rank
  const rankGroups = new Map<number, FlatNode[]>();
  for (const node of dag.nodes) {
    const rank = ranks.get(node.itemId) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(node);
  }

  // Initial Y positions: spread within each rank
  const xSpacing = 280;
  const ySpacing = 130;

  for (const [rank, nodes] of rankGroups) {
    // Sort by total throughput (largest centered)
    nodes.sort((a, b) => b.totalRate.toNumber() - a.totalRate.toNumber());
    for (let i = 0; i < nodes.length; i++) {
      const stagger = (i - (nodes.length - 1) / 2) * 30; // ±30px offset from center
      const x = rank * xSpacing + stagger;
      const y = (i - (nodes.length - 1) / 2) * ySpacing;
      positions.set(nodes[i].itemId, { x, y });
    }
  }

  // Barycentric pass: adjust Y to average of input positions, then re-space
  const maxRank = Math.max(...Array.from(ranks.values()));
  for (let rank = 1; rank <= maxRank; rank++) {
    const nodes = rankGroups.get(rank);
    if (!nodes) continue;

    // Compute barycentric Y for each node
    const barycenters: { node: FlatNode; y: number }[] = [];
    for (const node of nodes) {
      const inputs = inputsOf.get(node.itemId) ?? [];
      if (inputs.length > 0) {
        let sumY = 0;
        for (const inputId of inputs) {
          sumY += positions.get(inputId)?.y ?? 0;
        }
        barycenters.push({ node, y: sumY / inputs.length });
      } else {
        barycenters.push({ node, y: positions.get(node.itemId)?.y ?? 0 });
      }
    }

    // Sort by barycentric Y and re-space to avoid overlap
    barycenters.sort((a, b) => a.y - b.y);
    const centerOffset = (barycenters.length - 1) / 2;
    for (let i = 0; i < barycenters.length; i++) {
      const stagger = (i - centerOffset) * 30;
      const targetY = (i - centerOffset) * ySpacing;
      positions.set(barycenters[i].node.itemId, {
        x: rank * xSpacing + stagger,
        y: targetY,
      });
    }
  }

  return positions;
}
