import { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { FlatEdge } from '../../core/GraphFlattener';
import { BeltStatus } from '../../data/belts';

export interface BlueprintEdgeData {
  flatEdge: FlatEdge;
  beltStatus: BeltStatus;
  beltsNeeded: number;
  maxRate: number;
  isDark: boolean;
  [key: string]: unknown;
}

export type BlueprintEdgeType = Edge<BlueprintEdgeData, 'belt'>;

const STATUS_COLORS: Record<BeltStatus, string> = {
  'multi-belt': '#60A5FA',   // blue-400
  'near-capacity': '#FBBF24', // amber-400
  'ok': '#9CA3AF',           // gray-400
};

const ITEM_EDGE_COLORS = [
  '#F87171', // red-400
  '#FB923C', // orange-400
  '#FBBF24', // amber-400
  '#A3E635', // lime-400
  '#34D399', // emerald-400
  '#22D3EE', // cyan-400
  '#60A5FA', // blue-400
  '#818CF8', // indigo-400
  '#A78BFA', // violet-400
  '#E879F9', // fuchsia-400
  '#FB7185', // rose-400
  '#2DD4BF', // teal-400
];

function itemColorIndex(itemId: string): number {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = ((hash << 5) - hash + itemId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ITEM_EDGE_COLORS.length;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatRate(rate: number): string {
  if (Math.abs(rate - Math.round(rate)) < 0.01) {
    return Math.round(rate).toString();
  }
  return rate.toFixed(1);
}

export const BlueprintEdge = memo(function BlueprintEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<BlueprintEdgeType>) {
  if (!data) return null;

  const { flatEdge, beltStatus, beltsNeeded, maxRate, isDark } = data;
  const rate = flatEdge.rate.toNumber();
  const itemColor = ITEM_EDGE_COLORS[itemColorIndex(flatEdge.fromItemId)];
  const statusColor = STATUS_COLORS[beltStatus];

  // Throughput-scaled stroke width
  const relativeWidth = maxRate > 0 ? rate / maxRate : 0.5;
  const strokeWidth = clamp(3, relativeWidth * 8, 10);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  // Build label text
  const beltText = beltsNeeded > 1 ? `${beltsNeeded}x belt` : '';
  const rateText = `${formatRate(rate)}/min`;
  const labelContent = beltText ? `${rateText} (${beltText})` : rateText;

  const pillBg = isDark ? 'bg-gray-800/90' : 'bg-white/90';
  const pillText = isDark ? 'text-gray-300' : 'text-gray-600';
  const pillBorder = beltStatus !== 'ok' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300');
  const pillBorderStyle = beltStatus !== 'ok' ? statusColor : undefined;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path blueprint-edge-flow"
        d={edgePath}
        style={{
          stroke: itemColor,
          strokeWidth,
          strokeDasharray: `${strokeWidth * 2} ${strokeWidth * 1.5}`,
          fill: 'none',
          opacity: 0.85,
        }}
      />
      {/* Invisible wider path for easier hover/selection */}
      <path
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: strokeWidth + 10,
          fill: 'none',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`absolute text-[10px] ${pillBg} ${pillText} border ${pillBorder} rounded px-1.5 py-0.5 pointer-events-none leading-tight`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            ...(pillBorderStyle ? { borderColor: pillBorderStyle } : {}),
          }}
        >
          {labelContent}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
