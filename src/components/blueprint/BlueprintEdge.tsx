import { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { FlatEdge } from '../../core/GraphFlattener';
import { BeltStatus } from '../../data/belts';
import { getItemColor } from '../../data/itemColors';
import { BeltIcon } from '../BeltIcon';

export interface BlueprintEdgeData {
  flatEdge: FlatEdge;
  beltStatus: BeltStatus;
  beltsNeeded: number;
  utilization: number;
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

  const { flatEdge, beltStatus, beltsNeeded, utilization, maxRate, isDark } = data;
  const rate = flatEdge.rate.toNumber();
  const itemColor = getItemColor(flatEdge.fromItemId);
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

  // Build label content
  const rateText = `${formatRate(rate)}/min`;
  const showBeltIndicator = beltStatus !== 'ok';

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
          className={`absolute flex items-center gap-0.5 text-[10px] ${pillBg} ${pillText} border ${pillBorder} rounded px-1.5 py-0.5 pointer-events-none leading-tight`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            ...(pillBorderStyle ? { borderColor: pillBorderStyle } : {}),
          }}
        >
          {rateText}
          {showBeltIndicator && (
            <>
              <BeltIcon size={10} color={statusColor} />
              <span style={{ color: statusColor }}>
                {beltStatus === 'multi-belt'
                  ? `\u00D7${beltsNeeded}`
                  : `${Math.round(utilization * 100)}%`}
              </span>
            </>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
