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
import { useStore, type BlueprintOrientation, type BlueprintMergeMode, type BlueprintProgressState } from '../store/useStore';
import { flattenToDAG, layoutDAG, type FlatDAG } from '../core/GraphFlattener';
import { BlueprintNode, type BlueprintNodeData, type NodeInputInfo } from './blueprint/BlueprintNode';
import { BlueprintEdge, type BlueprintEdgeData } from './blueprint/BlueprintEdge';
import { BlueprintSearch } from './blueprint/BlueprintSearch';
import { useZoomLevel } from '../hooks/useZoomLevel';
import { getItemColor } from '../data/itemColors';
import { BUILDINGS, getExtractorRates } from '../data/buildings';
import { classifyBeltStatus, getBeltsNeeded, getBeltUtilization } from '../data/belts';
import { buildSplitterTree, ratesToParts, type SplitterTreeInfo } from '../core/splitterTree';

const nodeTypes = { blueprint: BlueprintNode };
const edgeTypes = { belt: BlueprintEdge };

/** Adjacency maps for the current DAG — used for highlighting and keyboard nav */
interface AdjacencyMaps {
  /** nodeKey → list of upstream (input) nodeKeys */
  inputsOf: Map<string, string[]>;
  /** nodeKey → list of downstream (consumer) nodeKeys */
  outputsOf: Map<string, string[]>;
  /** rank (x position / xSpacing) → ordered list of nodeKeys in that rank */
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
  blueprintProgress?: Map<string, BlueprintProgressState>,
  toggleBlueprintProgress?: (itemId: string) => void,
): { rfNodes: Node[]; rfEdges: Edge[]; adjacency: AdjacencyMaps } {
  const inputsOf = new Map<string, string[]>();
  const outputsOf = new Map<string, string[]>();
  const incomingEdgesOf = new Map<string, typeof dag.edges>();
  for (const edge of dag.edges) {
    const existingInputs = inputsOf.get(edge.toNodeKey) ?? [];
    existingInputs.push(edge.fromNodeKey);
    inputsOf.set(edge.toNodeKey, existingInputs);

    const existingOutputs = outputsOf.get(edge.fromNodeKey) ?? [];
    existingOutputs.push(edge.toNodeKey);
    outputsOf.set(edge.fromNodeKey, existingOutputs);

    const incoming = incomingEdgesOf.get(edge.toNodeKey) ?? [];
    incoming.push(edge);
    incomingEdgesOf.set(edge.toNodeKey, incoming);
  }

  // Build rank members from positions
  // In horizontal mode, ranks are along x-axis; in vertical mode, along y-axis
  const xSpacing = 280;
  const rankMembers = new Map<number, string[]>();
  for (const node of dag.nodes) {
    const pos = positions.get(node.nodeKey);
    if (!pos) continue;
    const rankAxis = orientation === 'vertical' ? pos.y : pos.x;
    const rank = Math.round(rankAxis / xSpacing);
    if (!rankMembers.has(rank)) rankMembers.set(rank, []);
    rankMembers.get(rank)!.push(node.nodeKey);
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
    const pos = positions.get(flatNode.nodeKey) ?? { x: 0, y: 0 };
    const nodeInputs = inputsOf.get(flatNode.nodeKey) ?? [];
    const nodeOutputs = outputsOf.get(flatNode.nodeKey) ?? [];

    const inEdges = incomingEdgesOf.get(flatNode.nodeKey) ?? [];
    const inputIngredients: NodeInputInfo[] = inEdges.map((edge) => ({
      itemId: edge.fromItemId,
      itemName: edge.itemName,
      rate: edge.rate,
    }));

    return {
      id: flatNode.nodeKey,
      type: 'blueprint',
      position: pos,
      data: {
        flatNode,
        inputItemIds: nodeInputs,
        outputItemIds: nodeOutputs,
        inputIngredients,
        isDark,
        isRoot: rootItemIds ? rootItemIds.has(flatNode.itemId) : flatNode.itemId === rootItemId,
        orientation,
        progressState: blueprintProgress?.get(flatNode.nodeKey) ?? false,
        onToggleProgress: toggleBlueprintProgress ? () => toggleBlueprintProgress(flatNode.nodeKey) : undefined,
      } satisfies BlueprintNodeData,
    };
  });

  // Build a lookup for source node info (for belt distribution and building share)
  const nodeInfoMap = new Map<string, typeof dag.nodes[0]>();
  for (const node of dag.nodes) {
    nodeInfoMap.set(node.nodeKey, node);
  }

  // Pre-pass: compute splitter tree info for multi-consumer source nodes
  const splitterTrees = new Map<string, SplitterTreeInfo>();
  const edgesBySource = new Map<string, typeof dag.edges>();
  for (const edge of dag.edges) {
    const list = edgesBySource.get(edge.fromNodeKey) ?? [];
    list.push(edge);
    edgesBySource.set(edge.fromNodeKey, list);
  }
  for (const [fromNodeKey, outEdges] of edgesBySource) {
    if (outEdges.length < 2) continue;
    const rates = outEdges.map((e) => e.rate.toNumber());
    const parts = ratesToParts(rates);
    const consumers = outEdges.map((e, i) => ({
      label: e.toItemName,
      parts: parts[i],
    }));
    splitterTrees.set(fromNodeKey, buildSplitterTree(consumers));
  }

  // Detect edges whose smooth-step paths would visually overlap.
  // Two edges overlap when they share the same rank-to-rank corridor (overlapping
  // X range) and their midpoint Y values are close. For overlapping groups, spread
  // the stepPosition (where the path bends, 0–1) so each edge bends at a different
  // X, naturally separating both the dashed lines and the rate labels.
  const OVERLAP_THRESHOLD = 40; // px — how close midpointY must be to count as overlap

  const edgeInfos = dag.edges.map((edge) => {
    const srcPos = positions.get(edge.fromNodeKey) ?? { x: 0, y: 0 };
    const tgtPos = positions.get(edge.toNodeKey) ?? { x: 0, y: 0 };
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
        const key = `${edgeInfos[group[g]].edge.fromNodeKey}->${edgeInfos[group[g]].edge.toNodeKey}`;
        stepPositions.set(key, t);
      }
    }
  }

  const rfEdges: Edge[] = dag.edges.map((flatEdge) => {
    const rate = flatEdge.rate.toNumber();
    const beltStatus = classifyBeltStatus(rate, beltSpeed);
    const beltsNeeded = getBeltsNeeded(rate, beltSpeed);
    const utilization = getBeltUtilization(rate, beltSpeed);

    const key = `${flatEdge.fromNodeKey}->${flatEdge.toNodeKey}`;
    const sourceNode = nodeInfoMap.get(flatEdge.fromNodeKey);
    const srcBuilding = sourceNode?.building ?? null;
    const targetNode = nodeInfoMap.get(flatEdge.toNodeKey);
    const tgtBuilding = targetNode?.building ?? null;

    return {
      id: key,
      source: flatEdge.fromNodeKey,
      target: flatEdge.toNodeKey,
      sourceHandle: `out-${flatEdge.toNodeKey}`,
      targetHandle: flatEdge.fromNodeKey,
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
        targetBuildingCount: tgtBuilding?.count ?? null,
        targetBuildingType: tgtBuilding?.buildingType ?? null,
        targetBuildingName: tgtBuilding ? (BUILDINGS[tgtBuilding.buildingType]?.name ?? null) : null,
        stepPosition: stepPositions.get(key) ?? 0.5,
        splitterTree: splitterTrees.get(flatEdge.fromNodeKey) ?? null,
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

function BlueprintToolbar({
  isDark,
  orientation,
  onToggleOrientation,
  mergeMode,
  onToggleMergeMode,
  hasProgress,
  onClearProgress,
  legendItems,
}: {
  isDark: boolean;
  orientation: BlueprintOrientation;
  onToggleOrientation: () => void;
  mergeMode: BlueprintMergeMode;
  onToggleMergeMode: () => void;
  hasProgress: boolean;
  onClearProgress: () => void;
  legendItems: { id: string; name: string; color: string }[];
}) {
  const zoomLevel = useZoomLevel();
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const showLegend = zoomLevel === 'mini' && legendItems.length > 0;

  const bg = isDark ? 'bg-gray-800/95' : 'bg-white/95';
  const border = isDark ? 'border-gray-600' : 'border-gray-300';
  const text = isDark ? 'text-gray-300' : 'text-gray-500';
  const textHover = isDark ? 'hover:text-gray-100 hover:bg-gray-700/60' : 'hover:text-gray-900 hover:bg-gray-100';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const legendText = isDark ? 'text-gray-100' : 'text-gray-900';

  return (
    <Panel position="top-left">
      <div className={`${bg} border ${border} rounded-lg shadow-lg backdrop-blur-sm`}>
        {/* Toolbar row */}
        <div className="flex gap-0.5 p-1">
          <button
            onClick={onToggleOrientation}
            className={`${text} ${textHover} rounded-md p-1.5 transition-colors`}
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
          <button
            onClick={onToggleMergeMode}
            className={`${text} ${textHover} rounded-md px-2 py-1.5 text-xs transition-colors ${mergeMode === 'dedicated' ? (isDark ? 'ring-1 ring-blue-400' : 'ring-1 ring-blue-500') : mergeMode === 'hybrid' ? (isDark ? 'ring-1 ring-amber-400' : 'ring-1 ring-amber-500') : ''}`}
            title={mergeMode === 'merged' ? 'Merged: all shared nodes stay combined' : mergeMode === 'hybrid' ? 'Hybrid: split only complex ratios, keep simple splits merged' : 'Dedicated: split all non-power-of-2 ratios'}
          >
            {mergeMode === 'merged' ? 'Merged' : mergeMode === 'hybrid' ? 'Hybrid' : 'Dedicated'}
          </button>
          {hasProgress && (
            <button
              onClick={onClearProgress}
              className={`${text} ${textHover} rounded-md px-2 py-1.5 text-xs transition-colors`}
              title="Reset all progress"
            >
              Reset &#x2713;
            </button>
          )}
        </div>
        {/* Legend section — only at mini zoom */}
        {showLegend && (
          <>
            <div className={`border-t ${border}`} />
            <button
              onClick={() => setLegendCollapsed((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 w-full text-left text-xs font-medium ${legendText}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={subtext}
                style={{ transform: legendCollapsed ? 'rotate(-90deg)' : undefined, transition: 'transform 0.15s' }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              Legend
              <span className={`${subtext} font-normal`}>({legendItems.length})</span>
            </button>
            {!legendCollapsed && (
              <div className={`px-2.5 pb-2 max-h-48 overflow-y-auto border-t ${border}`}>
                <div className="grid gap-0.5 pt-1.5">
                  {legendItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span
                        className="shrink-0 rounded-full"
                        style={{ width: 10, height: 10, backgroundColor: item.color }}
                      />
                      <span className={`text-[11px] ${legendText} truncate`}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
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
  mergeMode,
  onToggleMergeMode,
  hasProgress,
  onClearProgress,
  onNodePositionChange,
  isFullscreen,
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
  mergeMode: BlueprintMergeMode;
  onToggleMergeMode: () => void;
  hasProgress: boolean;
  onClearProgress: () => void;
  onNodePositionChange: (nodeKey: string, position: { x: number; y: number }) => void;
  isFullscreen?: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView, getViewport, setViewport, getNodes } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport changes for persistence
  useOnViewportChange({
    onEnd: onViewportChange,
  });

  // Sync when production result changes, then fit to view if no saved viewport
  const shouldFitRef = useRef(!savedViewport);
  useEffect(() => {
    if (!savedViewport) {
      shouldFitRef.current = true;
    }
  }, [savedViewport]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    if (shouldFitRef.current) {
      shouldFitRef.current = false;
      // Allow React Flow to measure the new nodes before fitting
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 0 }).then(() => {
          // Shift viewport so the graph is top-aligned instead of vertically centered
          const viewport = getViewport();
          const rfNodes = getNodes();
          if (rfNodes.length === 0) return;
          const containerHeight = containerRef.current?.clientHeight ?? 0;
          // Find the bounding box of all nodes
          let minY = Infinity, maxY = -Infinity;
          for (const n of rfNodes) {
            const h = n.measured?.height ?? n.height ?? 100;
            if (n.position.y < minY) minY = n.position.y;
            if (n.position.y + h > maxY) maxY = n.position.y + h;
          }
          const contentHeight = (maxY - minY) * viewport.zoom;
          const padding = containerHeight * 0.05; // 5% top padding
          // Only adjust if content doesn't fill the viewport (otherwise fitView is fine as-is)
          if (contentHeight < containerHeight) {
            const topY = -minY * viewport.zoom + padding;
            setViewport({ x: viewport.x, y: topY, zoom: viewport.zoom }, { duration: 200 });
          }
        });
      });
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView, getViewport, setViewport, getNodes]);

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

  // Persist node position after drag
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodePositionChange(node.id, node.position);
    },
    [onNodePositionChange],
  );

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
        if (selectedNodeId) {
          e.stopPropagation();
        }
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

  // Collect item info for search and legend (single pass, deduplicate by itemId for legend)
  const { searchItems, legendItems } = useMemo(() => {
    const searchItems: { id: string; name: string }[] = [];
    const legendItems: { id: string; name: string; color: string }[] = [];
    const seenItemIds = new Set<string>();
    for (const n of initialNodes) {
      const data = n.data as BlueprintNodeData;
      const name = data.flatNode.itemName;
      searchItems.push({ id: n.id, name });
      // Deduplicate legend by itemId (split nodes share the same item)
      if (!seenItemIds.has(data.flatNode.itemId)) {
        seenItemIds.add(data.flatNode.itemId);
        legendItems.push({ id: n.id, name, color: getItemColor(data.flatNode.itemId) });
      }
    }
    return { searchItems, legendItems };
  }, [initialNodes]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg overflow-hidden outline-none ${isFullscreen ? 'flex-1' : ''}`}
      style={isFullscreen ? { height: '100%' } : { height: `${estimatedHeight}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
        <BlueprintToolbar
          isDark={isDark}
          orientation={orientation}
          onToggleOrientation={onToggleOrientation}
          mergeMode={mergeMode}
          onToggleMergeMode={onToggleMergeMode}
          hasProgress={hasProgress}
          onClearProgress={onClearProgress}
          legendItems={legendItems}
        />
      </ReactFlow>
    </div>
  );
}

export function BlueprintFlowView({ isFullscreen }: { isFullscreen?: boolean } = {}) {
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
  const blueprintMergeMode = useStore((s) => s.blueprintMergeMode);
  const worldGen2 = useStore((s) => s.worldGen2);
  const extractorRates = getExtractorRates(worldGen2);
  const setBlueprintMergeMode = useStore((s) => s.setBlueprintMergeMode);
  const blueprintProgress = useStore((s) => s.blueprintProgress);
  const toggleBlueprintProgress = useStore((s) => s.toggleBlueprintProgress);
  const clearBlueprintProgress = useStore((s) => s.clearBlueprintProgress);
  const blueprintPositions = useStore((s) => s.blueprintPositions);
  const setBlueprintPosition = useStore((s) => s.setBlueprintPosition);
  const clearBlueprintPositions = useStore((s) => s.clearBlueprintPositions);

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
    const dag = flattenToDAG(productionResult, blueprintMergeMode, extractorRates);
    dag.nodes = dag.nodes.filter((n) => n.nodeKey !== '__multi_root__');
    const computedPositions = layoutDAG(dag, orientation);
    // Overlay user-saved position overrides on top of algorithmically computed positions
    const positions = new Map(computedPositions);
    for (const [key, pos] of blueprintPositions) {
      if (positions.has(key)) {
        positions.set(key, pos);
      }
    }
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
  }, [productionResult, beltSpeed, isDark, targetItemId, rootItemIds, orientation, blueprintMergeMode, blueprintProgress, toggleBlueprintProgress, blueprintPositions, extractorRates]);

  // Structural key for detecting graph topology changes
  const structureKey = useMemo(() => {
    const nodeIds = initialNodes.map((n) => n.id).sort().join(',');
    return `${nodeIds}|${initialEdges.length}`;
  }, [initialNodes, initialEdges]);

  // Reset viewport and saved positions when structure changes
  useEffect(() => {
    if (prevStructureKeyRef.current && structureKey !== prevStructureKeyRef.current) {
      setSavedViewport(null);
      clearBlueprintPositions();
    }
    prevStructureKeyRef.current = structureKey;
  }, [structureKey, clearBlueprintPositions]);

  const handleViewportChange = useCallback((viewport: Viewport) => {
    setSavedViewport(viewport);
  }, []);

  const handleNodePositionChange = useCallback((nodeKey: string, position: { x: number; y: number }) => {
    setBlueprintPosition(nodeKey, position);
  }, [setBlueprintPosition]);

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

  const toggleMergeMode = useCallback(() => {
    const next = blueprintMergeMode === 'merged' ? 'hybrid'
      : blueprintMergeMode === 'hybrid' ? 'dedicated'
      : 'merged';
    setBlueprintMergeMode(next);
    setSavedViewport(null); // reset viewport on mode change
  }, [blueprintMergeMode, setBlueprintMergeMode]);

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
        mergeMode={blueprintMergeMode}
        onToggleMergeMode={toggleMergeMode}
        hasProgress={blueprintProgress.size > 0}
        onClearProgress={clearBlueprintProgress}
        onNodePositionChange={handleNodePositionChange}
        isFullscreen={isFullscreen}
      />
    </ReactFlowProvider>
  );
}
