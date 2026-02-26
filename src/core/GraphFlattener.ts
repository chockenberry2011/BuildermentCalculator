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

export type LayoutOrientation = 'horizontal' | 'vertical';

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
 * When orientation is 'vertical', x/y are swapped so flow goes top-to-bottom.
 */
export function layoutDAG(dag: FlatDAG, orientation: LayoutOrientation = 'horizontal'): Map<string, { x: number; y: number }> {
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

  // Pass 1: Forward ranks — raw/leaf nodes get rank 0, others get max(input ranks) + 1
  const forwardRanks = new Map<string, number>();

  function computeForwardRank(itemId: string, visited: Set<string>): number {
    if (forwardRanks.has(itemId)) return forwardRanks.get(itemId)!;
    if (visited.has(itemId)) return 0; // cycle guard
    visited.add(itemId);

    const inputs = inputsOf.get(itemId) ?? [];
    if (inputs.length === 0) {
      forwardRanks.set(itemId, 0);
      return 0;
    }

    let maxInputRank = 0;
    for (const inputId of inputs) {
      maxInputRank = Math.max(maxInputRank, computeForwardRank(inputId, visited));
    }
    const rank = maxInputRank + 1;
    forwardRanks.set(itemId, rank);
    return rank;
  }

  for (const node of dag.nodes) {
    computeForwardRank(node.itemId, new Set());
  }

  // Pass 2: Sink-aligned ranks — pull nodes rightward toward their consumers
  // Sinks (no consumers) keep their forward rank. Others get min(consumer ranks) - 1.
  const ranks = new Map<string, number>();

  function computeSinkRank(itemId: string, visited: Set<string>): number {
    if (ranks.has(itemId)) return ranks.get(itemId)!;
    if (visited.has(itemId)) return forwardRanks.get(itemId) ?? 0; // cycle guard
    visited.add(itemId);

    const consumers = outputsOf.get(itemId) ?? [];
    if (consumers.length === 0) {
      // Sink node: keep forward rank
      const rank = forwardRanks.get(itemId) ?? 0;
      ranks.set(itemId, rank);
      return rank;
    }

    let minConsumerRank = Infinity;
    for (const consumerId of consumers) {
      minConsumerRank = Math.min(minConsumerRank, computeSinkRank(consumerId, visited));
    }
    const rank = minConsumerRank - 1;
    ranks.set(itemId, rank);
    return rank;
  }

  for (const node of dag.nodes) {
    computeSinkRank(node.itemId, new Set());
  }

  // Normalize ranks so the minimum is 0
  const minRank = Math.min(...Array.from(ranks.values()));
  if (minRank !== 0) {
    for (const [itemId, rank] of ranks) {
      ranks.set(itemId, rank - minRank);
    }
  }

  // Insert dummy nodes for long-span edges so barycenter considers them
  interface LayoutItem { itemId: string }
  const dummyIds = new Set<string>();

  for (const edge of dag.edges) {
    const fromRank = ranks.get(edge.fromItemId) ?? 0;
    const toRank = ranks.get(edge.toItemId) ?? 0;
    const span = toRank - fromRank;
    if (span >= 2) {
      let prevId = edge.fromItemId;
      for (let r = fromRank + 1; r < toRank; r++) {
        const dummyId = `__dummy_${edge.fromItemId}_${edge.toItemId}_${r}`;
        dummyIds.add(dummyId);
        ranks.set(dummyId, r);
        // Wire dummy into adjacency so barycenter sees it
        inputsOf.set(dummyId, [prevId]);
        const prevOutputs = outputsOf.get(prevId) ?? [];
        prevOutputs.push(dummyId);
        outputsOf.set(prevId, prevOutputs);
        outputsOf.set(dummyId, []);
        prevId = dummyId;
      }
      // Connect last dummy to the real consumer
      const lastDummyOutputs = outputsOf.get(prevId) ?? [];
      lastDummyOutputs.push(edge.toItemId);
      outputsOf.set(prevId, lastDummyOutputs);
      const consumerInputs = inputsOf.get(edge.toItemId) ?? [];
      consumerInputs.push(prevId);
      inputsOf.set(edge.toItemId, consumerInputs);
    }
  }

  // Group nodes by rank (including dummies)
  const rankGroups = new Map<number, LayoutItem[]>();
  for (const node of dag.nodes) {
    const rank = ranks.get(node.itemId) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(node);
  }
  for (const dummyId of dummyIds) {
    const rank = ranks.get(dummyId) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push({ itemId: dummyId });
  }

  // DFS order from sinks — gives each branch its own vertical lane (git-history style)
  const dfsOrder = new Map<string, number>();
  let orderCounter = 0;

  function dfsForOrder(itemId: string) {
    if (dfsOrder.has(itemId)) return;
    dfsOrder.set(itemId, orderCounter++);
    // Visit inputs sorted by forward rank (shallowest/simplest branches first)
    const inputs = [...(inputsOf.get(itemId) ?? [])];
    inputs.sort((a, b) => (forwardRanks.get(a) ?? 0) - (forwardRanks.get(b) ?? 0));
    for (const inputId of inputs) {
      dfsForOrder(inputId);
    }
  }

  // Start DFS from sinks (no consumers)
  const sinks = dag.nodes.filter(n => (outputsOf.get(n.itemId) ?? []).length === 0);
  for (const sink of sinks) {
    dfsForOrder(sink.itemId);
  }
  for (const node of dag.nodes) {
    dfsForOrder(node.itemId);
  }
  for (const dummyId of dummyIds) {
    dfsForOrder(dummyId);
  }

  // Dynamic ySpacing based on column density
  const xSpacing = 280;
  let maxNodesInRank = 0;
  for (const [, items] of rankGroups) {
    maxNodesInRank = Math.max(maxNodesInRank, items.length);
  }
  const ySpacing = Math.max(130, maxNodesInRank * 20 + 70);

  // Initial Y positions: order within each rank by DFS discovery order
  for (const [rank, items] of rankGroups) {
    items.sort((a, b) => (dfsOrder.get(a.itemId) ?? 0) - (dfsOrder.get(b.itemId) ?? 0));
    for (let i = 0; i < items.length; i++) {
      const x = rank * xSpacing;
      const y = (i - (items.length - 1) / 2) * ySpacing;
      positions.set(items[i].itemId, { x, y });
    }
  }

  // Bidirectional barycentric passes: refine Y using both inputs and outputs
  const maxRank = Math.max(...Array.from(ranks.values()));

  function reorderRank(rank: number, getNeighbors: (itemId: string) => string[]): boolean {
    const items = rankGroups.get(rank);
    if (!items || items.length < 2) return false;

    // Snapshot order before sort
    const orderBefore = items.map(item => item.itemId);

    const barycenters: { item: LayoutItem; y: number }[] = [];
    for (const item of items) {
      const neighbors = getNeighbors(item.itemId);
      if (neighbors.length > 0) {
        let sumY = 0;
        for (const nId of neighbors) {
          sumY += positions.get(nId)?.y ?? 0;
        }
        barycenters.push({ item, y: sumY / neighbors.length });
      } else {
        barycenters.push({ item, y: positions.get(item.itemId)?.y ?? 0 });
      }
    }

    barycenters.sort((a, b) => a.y - b.y);
    const centerOffset = (barycenters.length - 1) / 2;
    for (let i = 0; i < barycenters.length; i++) {
      positions.set(barycenters[i].item.itemId, {
        x: rank * xSpacing,
        y: (i - centerOffset) * ySpacing,
      });
    }

    // Update rankGroups order to match sorted result
    items.length = 0;
    for (const bc of barycenters) {
      items.push(bc.item);
    }

    // Check if order changed
    for (let i = 0; i < items.length; i++) {
      if (items[i].itemId !== orderBefore[i]) return true;
    }
    return false;
  }

  for (let iter = 0; iter < 24; iter++) {
    let changed = false;
    // Forward pass: order by input positions
    for (let rank = 1; rank <= maxRank; rank++) {
      if (reorderRank(rank, (id) => inputsOf.get(id) ?? [])) changed = true;
    }
    // Backward pass: order by output/consumer positions
    for (let rank = maxRank - 1; rank >= 0; rank--) {
      if (reorderRank(rank, (id) => outputsOf.get(id) ?? [])) changed = true;
    }
    if (!changed) break;
  }

  // Remove dummy nodes from output positions
  for (const dummyId of dummyIds) {
    positions.delete(dummyId);
  }

  // For vertical orientation, swap x and y so flow goes top-to-bottom
  if (orientation === 'vertical') {
    for (const [itemId, pos] of positions) {
      positions.set(itemId, { x: pos.y, y: pos.x });
    }
  }

  return positions;
}
