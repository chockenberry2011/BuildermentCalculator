import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../store/useStore';
import { flattenToDAG, layoutDAG, FlatDAG } from '../core/GraphFlattener';
import { BlueprintNode, type BlueprintNodeData } from './blueprint/BlueprintNode';
import { BlueprintEdge, type BlueprintEdgeData } from './blueprint/BlueprintEdge';
import { getItemColor } from '../data/itemColors';
import { classifyBeltStatus, getBeltsNeeded, getBeltUtilization } from '../data/belts';

const nodeTypes = { blueprint: BlueprintNode };
const edgeTypes = { belt: BlueprintEdge };

function buildReactFlowData(
  dag: FlatDAG,
  positions: Map<string, { x: number; y: number }>,
  beltSpeed: number,
  isDark: boolean,
  rootItemId: string,
  rootItemIds?: Set<string>,
): { rfNodes: Node[]; rfEdges: Edge[] } {
  // Build maps of which items are inputs/outputs to which nodes (for handle placement)
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

  // Find max edge rate for relative width scaling
  const maxRate = dag.edges.reduce(
    (max, e) => Math.max(max, e.rate.toNumber()),
    1,
  );

  const rfNodes: Node[] = dag.nodes.map((flatNode) => {
    const pos = positions.get(flatNode.itemId) ?? { x: 0, y: 0 };
    const nodeInputs = inputsOf.get(flatNode.itemId) ?? [];
    const nodeOutputs = outputsOf.get(flatNode.itemId) ?? [];

    return {
      id: flatNode.itemId,
      type: 'blueprint',
      position: pos,
      data: {
        flatNode,
        inputItemIds: nodeInputs,
        outputItemIds: nodeOutputs,
        isDark,
        isRoot: rootItemIds ? rootItemIds.has(flatNode.itemId) : flatNode.itemId === rootItemId,
      } satisfies BlueprintNodeData,
    };
  });

  const rfEdges: Edge[] = dag.edges.map((flatEdge) => {
    const rate = flatEdge.rate.toNumber();
    const beltStatus = classifyBeltStatus(rate, beltSpeed);
    const beltsNeeded = getBeltsNeeded(rate, beltSpeed);
    const utilization = getBeltUtilization(rate, beltSpeed);

    return {
      id: `${flatEdge.fromItemId}->${flatEdge.toItemId}`,
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
      } satisfies BlueprintEdgeData,
    };
  });

  return { rfNodes, rfEdges };
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

  const rootItemIds = useMemo(() => {
    if (targets.length > 1) {
      return new Set(targets.map((t) => t.itemId));
    }
    return new Set([targetItemId]);
  }, [targets, targetItemId]);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!productionResult) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[] };
    }
    const dag = flattenToDAG(productionResult);
    // Filter out the synthetic __multi_root__ node
    dag.nodes = dag.nodes.filter((n) => n.itemId !== '__multi_root__');
    const positions = layoutDAG(dag);
    const { rfNodes, rfEdges } = buildReactFlowData(
      dag,
      positions,
      beltSpeed,
      isDark,
      targetItemId,
      rootItemIds,
    );
    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [productionResult, beltSpeed, isDark, targetItemId, rootItemIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when production result changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const minimapNodeColor = useCallback(
    (node: Node) => {
      const data = node.data as BlueprintNodeData | undefined;
      return data?.flatNode ? getItemColor(data.flatNode.itemId) : '#6B7280';
    },
    [],
  );

  // Derive height from actual layout positions
  const estimatedHeight = useMemo(() => {
    if (initialNodes.length === 0) return 500;
    const ys = initialNodes.map((n) => n.position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return Math.max(500, maxY - minY + 300);
  }, [initialNodes]);

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
    <div
      className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg overflow-hidden`}
      style={{ height: `${estimatedHeight}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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
      </ReactFlow>
    </div>
  );
}
