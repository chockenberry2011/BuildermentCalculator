import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  type Node,
  type Edge,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, type BlueprintOrientation } from '../store/useStore';
import { flattenToDAG, layoutDAG, type FlatDAG } from '../core/GraphFlattener';
import { BlueprintNode, type BlueprintNodeData } from './blueprint/BlueprintNode';
import { BlueprintEdge, type BlueprintEdgeData } from './blueprint/BlueprintEdge';
import { BlueprintSearch } from './blueprint/BlueprintSearch';
import { BlueprintLegend } from './blueprint/BlueprintLegend';
import { getItemColor } from '../data/itemColors';
import { BUILDINGS } from '../data/buildings';
import { classifyBeltStatus, getBeltsNeeded, getBeltUtilization } from '../data/belts';

const nodeTypes = { blueprint: BlueprintNode };
const edgeTypes = { belt: BlueprintEdge };

/** Adjacency maps for the current DAG — used for highlighting and keyboard nav */
interface AdjacencyMaps {
  /** itemId → list of upstream (input) itemIds */
  inputsOf: Map<string, string[]>;
  /** itemId → list of downstream (consumer) itemIds */
  outputsOf: Map<string, string[]>;
  /** rank (x position / xSpacing) → ordered list of itemIds in that rank */
  rankMembers: Map<number, string[]>;
}

function buildReactFlowData(
  dag: FlatDAG,
  positions: Map<string, { x: number; y: number }>,
  beltSpeed: number,
  isDark: boolean,
  rootItemId: string,
  orientation: BlueprintOrientation,
  rootItemIds?: Set<string>,
  blueprintProgress?: Map<string, boolean>,
  toggleBlueprintProgress?: (itemId: string) => void,
): { rfNodes: Node[]; rfEdges: Edge[]; adjacency: AdjacencyMaps } {
  const inputsOf = new Map<string, string[]>();
  const outputsOf = new Map<string, string[]>();
  for (const edge of dag.edges) {
    const existingInputs = inputsOf.get(edge.toItemId) ?? [];
    existingInputs.push(edge.fromItemId);
    inputsOf.set(edge.toItemId, existingInputs);

    const existingOutputs = outputsOf.get(edge.fromItemId) ?? [];
    existingOutputs.push(edge.toItemId);
    outputsOf.set(edge.fromItemId, existingOutputs);
  }

  // Build rank members from positions
  // In horizontal mode, ranks are along x-axis; in vertical mode, along y-axis
  const xSpacing = 280;
  const rankMembers = new Map<number, string[]>();
  for (const node of dag.nodes) {
    const pos = positions.get(node.itemId);
    if (!pos) continue;
    const rankAxis = orientation === 'vertical' ? pos.y : pos.x;
    const rank = Math.round(rankAxis / xSpacing);
    if (!rankMembers.has(rank)) rankMembers.set(rank, []);
    rankMembers.get(rank)!.push(node.itemId);
  }
  // Sort each rank by the cross-axis position
  for (const [, members] of rankMembers) {
    members.sort((a, b) => {
      const posA = positions.get(a);
      const posB = positions.get(b);
      const crossA = orientation === 'vertical' ? (posA?.x ?? 0) : (posA?.y ?? 0);
      const crossB = orientation === 'vertical' ? (posB?.x ?? 0) : (posB?.y ?? 0);
      return crossA - crossB;
    });
  }

  const maxRate = dag.edges.reduce(
    (max, e) => Math.max(max, e.rate.toNumber()),
    1,
  );

  const rfNodes: Node[] = dag.nodes.map((flatNode) => {
    const pos = positions.get(flatNode.itemId) ?? { x: 0, y: 0 };
    const nodeInputs = inputsOf.get(flatNode.itemId) ?? [];
    const nodeOutputs = outputsOf.get(flatNode.itemId) ?? [];

    const itemId = flatNode.itemId;
    return {
      id: itemId,
      type: 'blueprint',
      position: pos,
      data: {
        flatNode,
        inputItemIds: nodeInputs,
        outputItemIds: nodeOutputs,
        isDark,
        isRoot: rootItemIds ? rootItemIds.has(itemId) : itemId === rootItemId,
        orientation,
        isCompleted: blueprintProgress?.get(itemId) ?? false,
        onToggleCompleted: toggleBlueprintProgress ? () => toggleBlueprintProgress(itemId) : undefined,
      } satisfies BlueprintNodeData,
    };
  });

  // Build a lookup for source node info (for belt distribution and building share)
  const nodeInfoMap = new Map<string, typeof dag.nodes[0]>();
  for (const node of dag.nodes) {
    nodeInfoMap.set(node.itemId, node);
  }

  // Detect edges whose smooth-step paths would visually overlap.
  // Two edges overlap when they share the same rank-to-rank corridor (overlapping
  // X range) and their midpoint Y values are close. For overlapping groups, spread
  // the stepPosition (where the path bends, 0–1) so each edge bends at a different
  // X, naturally separating both the dashed lines and the rate labels.
  const OVERLAP_THRESHOLD = 40; // px — how close midpointY must be to count as overlap

  const edgeInfos = dag.edges.map((edge) => {
    const srcPos = positions.get(edge.fromItemId) ?? { x: 0, y: 0 };
    const tgtPos = positions.get(edge.toItemId) ?? { x: 0, y: 0 };
    return {
      edge,
      midY: (srcPos.y + tgtPos.y) / 2,
      minX: Math.min(srcPos.x, tgtPos.x),
      maxX: Math.max(srcPos.x, tgtPos.x),
    };
  });

  edgeInfos.sort((a, b) => a.midY - b.midY);

  const stepPositions = new Map<string, number>();
  const assigned = new Set<number>();

  for (let i = 0; i < edgeInfos.length; i++) {
    if (assigned.has(i)) continue;
    const group = [i];
    assigned.add(i);

    for (let j = i + 1; j < edgeInfos.length; j++) {
      if (assigned.has(j)) continue;
      const withinThreshold = group.some(
        (gi) => Math.abs(edgeInfos[j].midY - edgeInfos[gi].midY) <= OVERLAP_THRESHOLD,
      );
      if (!withinThreshold) break;

      const candidate = edgeInfos[j];
      const overlaps = group.some((gi) => {
        const member = edgeInfos[gi];
        return member.minX < candidate.maxX && candidate.minX < member.maxX;
      });
      if (overlaps) {
        group.push(j);
        assigned.add(j);
      }
    }

    if (group.length > 1) {
      // Spread stepPosition evenly from 0.3 to 0.7 across the group
      for (let g = 0; g < group.length; g++) {
        const t = group.length === 1 ? 0.5 : 0.3 + (g / (group.length - 1)) * 0.4;
        const key = `${edgeInfos[group[g]].edge.fromItemId}->${edgeInfos[group[g]].edge.toItemId}`;
        stepPositions.set(key, t);
      }
    }
  }

  const rfEdges: Edge[] = dag.edges.map((flatEdge) => {
    const rate = flatEdge.rate.toNumber();
    const beltStatus = classifyBeltStatus(rate, beltSpeed);
    const beltsNeeded = getBeltsNeeded(rate, beltSpeed);
    const utilization = getBeltUtilization(rate, beltSpeed);

    const key = `${flatEdge.fromItemId}->${flatEdge.toItemId}`;
    const sourceNode = nodeInfoMap.get(flatEdge.fromItemId);
    const srcBuilding = sourceNode?.building ?? null;

    return {
      id: key,
      source: flatEdge.fromItemId,
      target: flatEdge.toItemId,
      sourceHandle: `out-${flatEdge.toItemId}`,
      targetHandle: flatEdge.fromItemId,
      type: 'belt',
      data: {
        flatEdge,
        beltStatus,
        beltsNeeded,
        utilization,
        maxRate,
        isDark,
        sourceBuildingCount: srcBuilding?.count ?? null,
        sourceTotalRate: sourceNode?.totalRate ?? null,
        sourceBuildingType: srcBuilding?.buildingType ?? null,
        sourceBuildingName: srcBuilding ? (BUILDINGS[srcBuilding.buildingType]?.name ?? null) : null,
        sourceIsRaw: sourceNode?.isRaw ?? false,
        stepPosition: stepPositions.get(key) ?? 0.5,
      } satisfies BlueprintEdgeData,
    };
  });

  return { rfNodes, rfEdges, adjacency: { inputsOf, outputsOf, rankMembers } };
}

/** BFS in both directions to find the full chain connected to a node */
function computeHighlightedSet(
  nodeId: string,
  inputsOf: Map<string, string[]>,
  outputsOf: Map<string, string[]>,
): Set<string> {
  const highlighted = new Set<string>();
  highlighted.add(nodeId);

  // Upstream (inputs)
  const upQueue = [nodeId];
  while (upQueue.length > 0) {
    const current = upQueue.pop()!;
    for (const input of inputsOf.get(current) ?? []) {
      if (!highlighted.has(input)) {
        highlighted.add(input);
        upQueue.push(input);
      }
    }
  }

  // Downstream (outputs)
  const downQueue = [nodeId];
  while (downQueue.length > 0) {
    const current = downQueue.pop()!;
    for (const output of outputsOf.get(current) ?? []) {
      if (!highlighted.has(output)) {
        highlighted.add(output);
        downQueue.push(output);
      }
    }
  }

  return highlighted;
}

function BlueprintFlowInner({
  initialNodes,
  initialEdges,
  adjacency,
  isDark,
  estimatedHeight,
  isSmallScreen,
  savedViewport,
  onViewportChange,
  orientation,
  onToggleOrientation,
  hasProgress,
  onClearProgress,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  adjacency: AdjacencyMaps;
  isDark: boolean;
  estimatedHeight: number;
  isSmallScreen: boolean;
  savedViewport: Viewport | null;
  onViewportChange: (viewport: Viewport) => void;
  orientation: BlueprintOrientation;
  onToggleOrientation: () => void;
  hasProgress: boolean;
  onClearProgress: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport changes for persistence
  useOnViewportChange({
    onEnd: onViewportChange,
  });

  // Sync when production result changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Apply highlighting when selection changes
  useEffect(() => {
    if (!selectedNodeId) {
      // Clear all dimming
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isDimmed: false, isSelected: false },
        })),
      );
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          data: { ...e.data, isDimmed: false } as BlueprintEdgeData,
        })),
      );
      return;
    }

    const highlighted = computeHighlightedSet(
      selectedNodeId,
      adjacency.inputsOf,
      adjacency.outputsOf,
    );

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isDimmed: !highlighted.has(n.id),
          isSelected: n.id === selectedNodeId,
        },
      })),
    );

    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          isDimmed: !(highlighted.has(e.source) && highlighted.has(e.target)),
        } as BlueprintEdgeData,
      })),
    );
  }, [selectedNodeId, adjacency, setNodes, setEdges]);

  // Node click handler
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [],
  );

  // Pane click clears selection
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Select a node and pan to it (used by search and keyboard nav)
  const selectAndFocus = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setTimeout(() => {
        fitView({ nodes: [{ id: nodeId }], duration: 200, padding: 0.5 });
      }, 0);
    },
    [fitView],
  );

  // Keyboard navigation (orientation-aware)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // In horizontal: Right=downstream, Left=upstream, Up/Down=siblings
    // In vertical: Down=downstream, Up=upstream, Left/Right=siblings
    const isVert = orientation === 'vertical';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        return;
      }

      if (!selectedNodeId) return;

      const { inputsOf, outputsOf, rankMembers } = adjacency;

      const downstreamKey = isVert ? 'ArrowDown' : 'ArrowRight';
      const upstreamKey = isVert ? 'ArrowUp' : 'ArrowLeft';
      const siblingKeys = isVert ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      const siblingForward = isVert ? 'ArrowRight' : 'ArrowDown';

      if (e.key === downstreamKey) {
        e.preventDefault();
        const consumers = outputsOf.get(selectedNodeId) ?? [];
        if (consumers.length > 0) selectAndFocus(consumers[0]);
      } else if (e.key === upstreamKey) {
        e.preventDefault();
        const inputs = inputsOf.get(selectedNodeId) ?? [];
        if (inputs.length > 0) selectAndFocus(inputs[0]);
      } else if (siblingKeys.includes(e.key)) {
        e.preventDefault();
        const xSpacing = 280;
        const nodePos = initialNodes.find((n) => n.id === selectedNodeId)?.position;
        if (!nodePos) return;
        const rankAxis = isVert ? nodePos.y : nodePos.x;
        const rank = Math.round(rankAxis / xSpacing);
        const members = rankMembers.get(rank);
        if (!members || members.length <= 1) return;
        const idx = members.indexOf(selectedNodeId);
        if (idx === -1) return;
        const nextIdx = e.key === siblingForward
          ? (idx + 1) % members.length
          : (idx - 1 + members.length) % members.length;
        selectAndFocus(members[nextIdx]);
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, adjacency, initialNodes, selectAndFocus, orientation]);

  const minimapNodeColor = useCallback(
    (node: Node) => {
      const data = node.data as BlueprintNodeData | undefined;
      return data?.flatNode ? getItemColor(data.flatNode.itemId) : '#6B7280';
    },
    [],
  );

  // Collect item info for search and legend (single pass)
  const { searchItems, legendItems } = useMemo(() => {
    const searchItems: { id: string; name: string }[] = [];
    const legendItems: { id: string; name: string; color: string }[] = [];
    for (const n of initialNodes) {
      const name = (n.data as BlueprintNodeData).flatNode.itemName;
      searchItems.push({ id: n.id, name });
      legendItems.push({ id: n.id, name, color: getItemColor(n.id) });
    }
    return { searchItems, legendItems };
  }, [initialNodes]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg overflow-hidden outline-none`}
      style={{ height: `${estimatedHeight}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={!savedViewport}
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={savedViewport ?? undefined}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={isDark ? '#374151' : '#D1D5DB'} gap={20} />
        <Controls
          className={isDark ? 'bg-gray-800 rounded' : 'bg-white rounded'}
        />
        {!isSmallScreen && (
          <MiniMap
            className={isDark ? 'bg-gray-800 rounded' : 'bg-gray-100 rounded'}
            nodeColor={minimapNodeColor}
          />
        )}
        <BlueprintSearch
          items={searchItems}
          isDark={isDark}
          onSelect={selectAndFocus}
        />
        <BlueprintLegend items={legendItems} isDark={isDark} />
        <Panel position="top-left">
          <div className="flex gap-1.5">
            <button
              onClick={onToggleOrientation}
              className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:text-gray-100' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-900'} border rounded-md p-1.5 shadow-sm`}
              title={`Switch to ${orientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
            >
              {orientation === 'horizontal' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" /><path d="m8 7-4 5 4 5" /><path d="m16 7 4 5-4 5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h18" /><path d="m7 8-5 4 5 4" /><path d="m17 8 5 4-5 4" />
                </svg>
              )}
            </button>
            {hasProgress && (
              <button
                onClick={onClearProgress}
                className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:text-gray-100' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-900'} border rounded-md px-2 py-1.5 shadow-sm text-xs`}
                title="Reset progress"
              >
                Reset progress
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function BlueprintFlowView() {
  const productionResult = useStore((s) => s.productionResult);
  const beltSpeed = useStore((s) => s.beltSpeed);
  const theme = useStore((s) => s.theme);
  const targetItemId = useStore((s) => s.targetItemId);
  const isDark = theme === 'dark';

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsSmallScreen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const targets = useStore((s) => s.targets);
  const orientation = useStore((s) => s.blueprintOrientation);
  const setBlueprintOrientation = useStore((s) => s.setBlueprintOrientation);
  const blueprintProgress = useStore((s) => s.blueprintProgress);
  const toggleBlueprintProgress = useStore((s) => s.toggleBlueprintProgress);
  const clearBlueprintProgress = useStore((s) => s.clearBlueprintProgress);

  const rootItemIds = useMemo(() => {
    if (targets.length > 1) {
      return new Set(targets.map((t) => t.itemId));
    }
    return new Set([targetItemId]);
  }, [targets, targetItemId]);

  // Viewport persistence — session-only (not persisted to localStorage)
  const [savedViewport, setSavedViewport] = useState<Viewport | null>(null);

  // Compute a structural key that changes when graph topology changes
  const prevStructureKeyRef = useRef<string>('');

  const { initialNodes, initialEdges, adjacency } = useMemo(() => {
    if (!productionResult) {
      return {
        initialNodes: [] as Node[],
        initialEdges: [] as Edge[],
        adjacency: {
          inputsOf: new Map<string, string[]>(),
          outputsOf: new Map<string, string[]>(),
          rankMembers: new Map<number, string[]>(),
        } as AdjacencyMaps,
      };
    }
    const dag = flattenToDAG(productionResult);
    dag.nodes = dag.nodes.filter((n) => n.itemId !== '__multi_root__');
    const positions = layoutDAG(dag, orientation);
    const { rfNodes, rfEdges, adjacency } = buildReactFlowData(
      dag,
      positions,
      beltSpeed,
      isDark,
      targetItemId,
      orientation,
      rootItemIds,
      blueprintProgress,
      toggleBlueprintProgress,
    );
    return { initialNodes: rfNodes, initialEdges: rfEdges, adjacency };
  }, [productionResult, beltSpeed, isDark, targetItemId, rootItemIds, orientation, blueprintProgress, toggleBlueprintProgress]);

  // Structural key for detecting graph topology changes
  const structureKey = useMemo(() => {
    const nodeIds = initialNodes.map((n) => n.id).sort().join(',');
    return `${nodeIds}|${initialEdges.length}`;
  }, [initialNodes, initialEdges]);

  // Reset viewport when structure changes
  useEffect(() => {
    if (prevStructureKeyRef.current && structureKey !== prevStructureKeyRef.current) {
      setSavedViewport(null);
    }
    prevStructureKeyRef.current = structureKey;
  }, [structureKey]);

  const handleViewportChange = useCallback((viewport: Viewport) => {
    setSavedViewport(viewport);
  }, []);

  const estimatedHeight = useMemo(() => {
    if (initialNodes.length === 0) return 500;
    const ys = initialNodes.map((n) => n.position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return Math.max(500, maxY - minY + 300);
  }, [initialNodes]);

  const toggleOrientation = useCallback(() => {
    setBlueprintOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal');
    setSavedViewport(null); // reset viewport on layout change
  }, [orientation, setBlueprintOrientation]);

  if (!productionResult) {
    return (
      <div
        className={`h-[60vh] ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}
      >
        <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} italic`}>
          Select an item to see production blueprint
        </span>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <BlueprintFlowInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        adjacency={adjacency}
        isDark={isDark}
        estimatedHeight={estimatedHeight}
        isSmallScreen={isSmallScreen}
        savedViewport={savedViewport}
        onViewportChange={handleViewportChange}
        orientation={orientation}
        onToggleOrientation={toggleOrientation}
        hasProgress={blueprintProgress.size > 0}
        onClearProgress={clearBlueprintProgress}
      />
    </ReactFlowProvider>
  );
}
