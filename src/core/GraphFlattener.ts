import { ProductionResult, ProductionNode, BuildingRequirement, findOptimalLevel, calculateBuildingCount, calculateExtractorCount } from './ProductionCalculator';
import { Recipe } from '../data/recipes';
import { Rational } from './math/rational';
import { gcdMultiple, isSplitterFriendlyRatio, isSimpleSplitterRatio } from './math/gcd';

export interface FlatNode {
  nodeKey: string;              // unique DAG identity (itemId for merged, "{itemId}_for_{consumerItemId}" for split)
  itemId: string;               // original game item (for colors, icons, recipes)
  itemName: string;
  totalRate: Rational;
  building: BuildingRequirement | null;
  isRaw: boolean;
  recipe: Recipe | null;
  consumerItemId?: string;      // set on split nodes only
  consumerItemName?: string;    // set on split nodes only
}

export interface FlatEdge {
  fromNodeKey: string;          // source node's nodeKey
  toNodeKey: string;            // target node's nodeKey
  fromItemId: string;           // original item IDs (for color)
  toItemId: string;
  rate: Rational;
  itemName: string;
  toItemName: string;           // consumer item display name
}

export interface FlatDAG {
  nodes: FlatNode[];
  edges: FlatEdge[];
}

export type LayoutOrientation = 'horizontal' | 'vertical';
export type BlueprintMergeMode = 'merged' | 'hybrid' | 'dedicated';

/**
 * Flatten the recursive ProductionNode tree into a deduplicated DAG.
 * Each item appears exactly once; rates are summed across all tree occurrences.
 *
 * When mode is 'dedicated', shared nodes whose outgoing ratios are not
 * splitter-friendly (sum not a power of 2) are split into per-consumer copies.
 * When mode is 'hybrid', only nodes whose ratio sum exceeds 6 are split
 * (more permissive than dedicated — keeps simple ratios like 1:2, 2:3 merged).
 */
export function flattenToDAG(result: ProductionResult, mode: BlueprintMergeMode = 'merged'): FlatDAG {
  // Step 1: Build deduplicated nodes from allNodes map
  const nodeMap = new Map<string, FlatNode>();

  for (const [itemId, nodes] of result.allNodes) {
    // Sum rates across all occurrences
    let totalRate = Rational.zero();
    let building: BuildingRequirement | null = null;
    let isRaw = false;
    let recipe: Recipe | null = null;
    let itemName = itemId;

    let configuredLevel = 1;

    for (const node of nodes) {
      totalRate = totalRate.add(node.ratePerMinute);
      itemName = node.itemName;
      isRaw = node.isRaw;
      recipe = node.recipe;

      // Take building info from first node (type/level consistent per item)
      if (!building && node.building) {
        configuredLevel = node.building.configuredLevel;
        building = {
          buildingType: node.building.buildingType,
          count: node.building.count,
          level: node.building.configuredLevel,
          configuredLevel: node.building.configuredLevel,
        };
      } else if (building && node.building) {
        // Sum building counts
        building = {
          buildingType: building.buildingType,
          count: building.count.add(node.building.count),
          level: building.level,
          configuredLevel: building.configuredLevel,
        };
      }
    }

    // Recompute building count from merged totalRate at configuredLevel, then auto-apply optimal
    if (building) {
      const recomputedCount = building.buildingType === 'extractor'
        ? calculateExtractorCount(totalRate, configuredLevel)
        : recipe
          ? calculateBuildingCount(totalRate, recipe, configuredLevel)
          : building.count;

      let effectiveLevel = configuredLevel;
      let effectiveCount = recomputedCount;

      if (!recomputedCount.isInteger()) {
        const optimal = findOptimalLevel(totalRate, recipe, building.buildingType, configuredLevel);
        if (optimal !== undefined) {
          effectiveLevel = optimal;
          effectiveCount = building.buildingType === 'extractor'
            ? calculateExtractorCount(totalRate, effectiveLevel)
            : recipe
              ? calculateBuildingCount(totalRate, recipe, effectiveLevel)
              : recomputedCount;
        }
      }

      building = {
        buildingType: building.buildingType,
        count: effectiveCount,
        level: effectiveLevel,
        configuredLevel,
      };
    }

    nodeMap.set(itemId, { nodeKey: itemId, itemId, itemName, totalRate, building, isRaw, recipe });
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
            fromNodeKey: child.itemId,
            toNodeKey: node.itemId,
            fromItemId: child.itemId,
            toItemId: node.itemId,
            rate: child.ratePerMinute,
            itemName: child.itemName,
            toItemName: node.itemName,
          });
        }
      }
      walkEdges(child);
    }
  }

  walkEdges(result.root);

  let nodes = Array.from(nodeMap.values());
  let edges = Array.from(edgeMap.values());

  // Step 3: Splitting post-pass for hybrid and dedicated modes
  if (mode === 'dedicated' || mode === 'hybrid') {
    const predicate = mode === 'hybrid' ? isSimpleSplitterRatio : isSplitterFriendlyRatio;
    const result = splitNonFriendlyNodes(nodes, edges, nodeMap, predicate);
    nodes = result.nodes;
    edges = result.edges;
  }

  return { nodes, edges };
}

/**
 * Post-pass: split shared nodes whose outgoing ratios fail the given friendliness predicate.
 */
function splitNonFriendlyNodes(
  nodes: FlatNode[],
  edges: FlatEdge[],
  nodeMap: Map<string, FlatNode>,
  isFriendly: (parts: number[]) => boolean,
): { nodes: FlatNode[]; edges: FlatEdge[] } {
  // Build outgoing edge map by fromNodeKey
  const outgoingOf = new Map<string, FlatEdge[]>();
  const incomingOf = new Map<string, FlatEdge[]>();
  for (const edge of edges) {
    const outList = outgoingOf.get(edge.fromNodeKey) ?? [];
    outList.push(edge);
    outgoingOf.set(edge.fromNodeKey, outList);

    const inList = incomingOf.get(edge.toNodeKey) ?? [];
    inList.push(edge);
    incomingOf.set(edge.toNodeKey, inList);
  }

  // Find nodes to split
  const nodesToSplit = new Set<string>();
  for (const node of nodes) {
    const outEdges = outgoingOf.get(node.nodeKey) ?? [];
    if (outEdges.length < 2) continue;

    // Extract edge rates and reduce to lowest-terms integers
    const rateNums = outEdges.map(e => e.rate.toNumber());
    const scaledRates = rateNums.map(r => Math.round(r * 1000000)); // scale to avoid float issues
    const g = gcdMultiple(scaledRates);
    const parts = g > 0 ? scaledRates.map(r => r / g) : scaledRates;

    if (!isFriendly(parts)) {
      nodesToSplit.add(node.nodeKey);
    }
  }

  if (nodesToSplit.size === 0) {
    return { nodes, edges };
  }

  // Build new nodes and edges
  const newNodes: FlatNode[] = [];
  const newEdges: FlatEdge[] = [];
  const removedNodeKeys = new Set<string>();

  for (const node of nodes) {
    if (!nodesToSplit.has(node.nodeKey)) {
      newNodes.push(node);
      continue;
    }

    removedNodeKeys.add(node.nodeKey);
    const outEdges = outgoingOf.get(node.nodeKey) ?? [];
    const inEdges = incomingOf.get(node.nodeKey) ?? [];

    // Calculate total outgoing rate
    let totalOutRate = Rational.zero();
    for (const e of outEdges) {
      totalOutRate = totalOutRate.add(e.rate);
    }

    // Create a dedicated node for each consumer
    for (const outEdge of outEdges) {
      const consumerNode = nodeMap.get(outEdge.toItemId);
      const consumerItemId = outEdge.toItemId;
      const consumerItemName = consumerNode?.itemName ?? consumerItemId;
      const dedicatedKey = `${node.itemId}_for_${consumerItemId}`;

      // fraction = edgeRate / totalOutgoingRate
      const fraction = outEdge.rate.divide(totalOutRate);
      const dedicatedRate = node.totalRate.multiply(fraction);

      let dedicatedBuilding: BuildingRequirement | null = null;
      if (node.building) {
        const cfgLevel = node.building.configuredLevel;
        // Recompute count from dedicatedRate at configuredLevel
        const recomputedCount = node.building.buildingType === 'extractor'
          ? calculateExtractorCount(dedicatedRate, cfgLevel)
          : node.recipe
            ? calculateBuildingCount(dedicatedRate, node.recipe, cfgLevel)
            : node.building.count.multiply(fraction);

        let effectiveLevel = cfgLevel;
        let effectiveCount = recomputedCount;

        if (!recomputedCount.isInteger()) {
          const optimal = findOptimalLevel(dedicatedRate, node.recipe, node.building.buildingType, cfgLevel);
          if (optimal !== undefined) {
            effectiveLevel = optimal;
            effectiveCount = node.building.buildingType === 'extractor'
              ? calculateExtractorCount(dedicatedRate, effectiveLevel)
              : node.recipe
                ? calculateBuildingCount(dedicatedRate, node.recipe, effectiveLevel)
                : recomputedCount;
          }
        }

        dedicatedBuilding = {
          buildingType: node.building.buildingType,
          count: effectiveCount,
          level: effectiveLevel,
          configuredLevel: cfgLevel,
        };
      }

      newNodes.push({
        nodeKey: dedicatedKey,
        itemId: node.itemId,
        itemName: node.itemName,
        totalRate: dedicatedRate,
        building: dedicatedBuilding,
        isRaw: node.isRaw,
        recipe: node.recipe,
        consumerItemId,
        consumerItemName,
      });

      // Outgoing edge from dedicated node to its single consumer
      newEdges.push({
        fromNodeKey: dedicatedKey,
        toNodeKey: outEdge.toNodeKey,
        fromItemId: node.itemId,
        toItemId: outEdge.toItemId,
        rate: outEdge.rate,
        itemName: outEdge.itemName,
        toItemName: outEdge.toItemName,
      });

      // Incoming edges from each parent, scaled proportionally
      for (const inEdge of inEdges) {
        const scaledRate = inEdge.rate.multiply(fraction);
        newEdges.push({
          fromNodeKey: inEdge.fromNodeKey,
          toNodeKey: dedicatedKey,
          fromItemId: inEdge.fromItemId,
          toItemId: node.itemId,
          rate: scaledRate,
          itemName: inEdge.itemName,
          toItemName: node.itemName,
        });
      }
    }
  }

  // Keep edges that don't involve removed nodes
  for (const edge of edges) {
    if (!removedNodeKeys.has(edge.fromNodeKey) && !removedNodeKeys.has(edge.toNodeKey)) {
      newEdges.push(edge);
    }
  }

  return { nodes: newNodes, edges: newEdges };
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
  const inputsOf = new Map<string, string[]>();    // nodeKey -> list of input nodeKeys
  const outputsOf = new Map<string, string[]>();   // nodeKey -> list of consumer nodeKeys

  for (const node of dag.nodes) {
    inputsOf.set(node.nodeKey, []);
    outputsOf.set(node.nodeKey, []);
  }

  for (const edge of dag.edges) {
    inputsOf.get(edge.toNodeKey)?.push(edge.fromNodeKey);
    outputsOf.get(edge.fromNodeKey)?.push(edge.toNodeKey);
  }

  // Pass 1: Forward ranks — raw/leaf nodes get rank 0, others get max(input ranks) + 1
  const forwardRanks = new Map<string, number>();

  function computeForwardRank(nodeKey: string, visited: Set<string>): number {
    if (forwardRanks.has(nodeKey)) return forwardRanks.get(nodeKey)!;
    if (visited.has(nodeKey)) return 0; // cycle guard
    visited.add(nodeKey);

    const inputs = inputsOf.get(nodeKey) ?? [];
    if (inputs.length === 0) {
      forwardRanks.set(nodeKey, 0);
      return 0;
    }

    let maxInputRank = 0;
    for (const inputKey of inputs) {
      maxInputRank = Math.max(maxInputRank, computeForwardRank(inputKey, visited));
    }
    const rank = maxInputRank + 1;
    forwardRanks.set(nodeKey, rank);
    return rank;
  }

  for (const node of dag.nodes) {
    computeForwardRank(node.nodeKey, new Set());
  }

  // Pass 2: Sink-aligned ranks — pull nodes rightward toward their consumers
  // Sinks (no consumers) keep their forward rank. Others get min(consumer ranks) - 1.
  const ranks = new Map<string, number>();

  function computeSinkRank(nodeKey: string, visited: Set<string>): number {
    if (ranks.has(nodeKey)) return ranks.get(nodeKey)!;
    if (visited.has(nodeKey)) return forwardRanks.get(nodeKey) ?? 0; // cycle guard
    visited.add(nodeKey);

    const consumers = outputsOf.get(nodeKey) ?? [];
    if (consumers.length === 0) {
      // Sink node: keep forward rank
      const rank = forwardRanks.get(nodeKey) ?? 0;
      ranks.set(nodeKey, rank);
      return rank;
    }

    let minConsumerRank = Infinity;
    for (const consumerKey of consumers) {
      minConsumerRank = Math.min(minConsumerRank, computeSinkRank(consumerKey, visited));
    }
    const rank = minConsumerRank - 1;
    ranks.set(nodeKey, rank);
    return rank;
  }

  for (const node of dag.nodes) {
    computeSinkRank(node.nodeKey, new Set());
  }

  // Normalize ranks so the minimum is 0
  const minRank = Math.min(...Array.from(ranks.values()));
  if (minRank !== 0) {
    for (const [nodeKey, rank] of ranks) {
      ranks.set(nodeKey, rank - minRank);
    }
  }

  // Insert dummy nodes for long-span edges so barycenter considers them
  interface LayoutItem { nodeKey: string }
  const dummyIds = new Set<string>();

  for (const edge of dag.edges) {
    const fromRank = ranks.get(edge.fromNodeKey) ?? 0;
    const toRank = ranks.get(edge.toNodeKey) ?? 0;
    const span = toRank - fromRank;
    if (span >= 2) {
      let prevId = edge.fromNodeKey;
      for (let r = fromRank + 1; r < toRank; r++) {
        const dummyId = `__dummy_${edge.fromNodeKey}_${edge.toNodeKey}_${r}`;
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
      lastDummyOutputs.push(edge.toNodeKey);
      outputsOf.set(prevId, lastDummyOutputs);
      const consumerInputs = inputsOf.get(edge.toNodeKey) ?? [];
      consumerInputs.push(prevId);
      inputsOf.set(edge.toNodeKey, consumerInputs);
    }
  }

  // Group nodes by rank (including dummies)
  const rankGroups = new Map<number, LayoutItem[]>();
  for (const node of dag.nodes) {
    const rank = ranks.get(node.nodeKey) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push({ nodeKey: node.nodeKey });
  }
  for (const dummyId of dummyIds) {
    const rank = ranks.get(dummyId) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push({ nodeKey: dummyId });
  }

  // DFS order from sinks — gives each branch its own vertical lane (git-history style)
  const dfsOrder = new Map<string, number>();
  let orderCounter = 0;

  function dfsForOrder(nodeKey: string) {
    if (dfsOrder.has(nodeKey)) return;
    dfsOrder.set(nodeKey, orderCounter++);
    // Visit inputs sorted by forward rank (shallowest/simplest branches first)
    const inputs = [...(inputsOf.get(nodeKey) ?? [])];
    inputs.sort((a, b) => (forwardRanks.get(a) ?? 0) - (forwardRanks.get(b) ?? 0));
    for (const inputKey of inputs) {
      dfsForOrder(inputKey);
    }
  }

  // Start DFS from sinks (no consumers)
  const sinks = dag.nodes.filter(n => (outputsOf.get(n.nodeKey) ?? []).length === 0);
  for (const sink of sinks) {
    dfsForOrder(sink.nodeKey);
  }
  for (const node of dag.nodes) {
    dfsForOrder(node.nodeKey);
  }
  for (const dummyId of dummyIds) {
    dfsForOrder(dummyId);
  }

  // Dynamic ySpacing based on column density AND edge corridor density
  const xSpacing = 280;
  let maxNodesInRank = 0;
  for (const [, items] of rankGroups) {
    maxNodesInRank = Math.max(maxNodesInRank, items.length);
  }
  // Count edges crossing each rank-to-rank corridor (including long-span edges)
  let maxEdgesInCorridor = 0;
  const corridorCounts = new Map<number, number>();
  for (const edge of dag.edges) {
    const fromRank = ranks.get(edge.fromNodeKey) ?? 0;
    const toRank = ranks.get(edge.toNodeKey) ?? 0;
    for (let r = fromRank; r < toRank; r++) {
      const count = (corridorCounts.get(r) ?? 0) + 1;
      corridorCounts.set(r, count);
      maxEdgesInCorridor = Math.max(maxEdgesInCorridor, count);
    }
  }
  const ySpacing = Math.max(130, maxNodesInRank * 20 + 70, maxEdgesInCorridor * 25 + 50);

  // Initial Y positions: order within each rank by DFS discovery order
  for (const [rank, items] of rankGroups) {
    items.sort((a, b) => (dfsOrder.get(a.nodeKey) ?? 0) - (dfsOrder.get(b.nodeKey) ?? 0));
    for (let i = 0; i < items.length; i++) {
      const x = rank * xSpacing;
      const y = (i - (items.length - 1) / 2) * ySpacing;
      positions.set(items[i].nodeKey, { x, y });
    }
  }

  // Bidirectional barycentric passes: refine Y using both inputs and outputs
  const maxRank = Math.max(...Array.from(ranks.values()));

  function reorderRank(rank: number, getNeighbors: (nodeKey: string) => string[]): boolean {
    const items = rankGroups.get(rank);
    if (!items || items.length < 2) return false;

    // Snapshot order before sort
    const orderBefore = items.map(item => item.nodeKey);

    const barycenters: { item: LayoutItem; y: number }[] = [];
    for (const item of items) {
      const neighbors = getNeighbors(item.nodeKey);
      if (neighbors.length > 0) {
        let sumY = 0;
        for (const nId of neighbors) {
          sumY += positions.get(nId)?.y ?? 0;
        }
        barycenters.push({ item, y: sumY / neighbors.length });
      } else {
        barycenters.push({ item, y: positions.get(item.nodeKey)?.y ?? 0 });
      }
    }

    barycenters.sort((a, b) => a.y - b.y);
    const centerOffset = (barycenters.length - 1) / 2;
    for (let i = 0; i < barycenters.length; i++) {
      positions.set(barycenters[i].item.nodeKey, {
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
      if (items[i].nodeKey !== orderBefore[i]) return true;
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
    for (const [nodeKey, pos] of positions) {
      positions.set(nodeKey, { x: pos.y, y: pos.x });
    }
  }

  return positions;
}
