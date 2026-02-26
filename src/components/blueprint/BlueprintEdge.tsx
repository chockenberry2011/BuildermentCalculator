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
import { BadgePopover } from '../BadgePopover';
import { useZoomLevel } from '../../hooks/useZoomLevel';

export interface BlueprintEdgeData {
  flatEdge: FlatEdge;
  beltStatus: BeltStatus;
  beltsNeeded: number;
  utilization: number;
  maxRate: number;
  isDark: boolean;
  isDimmed?: boolean;
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
  const zoomLevel = useZoomLevel();

  if (!data) return null;

  const { flatEdge, beltStatus, beltsNeeded, utilization, maxRate, isDark, isDimmed } = data;
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

  const edgeOpacity = isDimmed ? 0.15 : 0.85;

  // Mini zoom: path only, no labels
  if (zoomLevel === 'mini') {
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: itemColor,
          strokeWidth: clamp(2, relativeWidth * 5, 6),
          fill: 'none',
          opacity: edgeOpacity,
          transition: 'opacity 0.2s',
        }}
      />
    );
  }

  // Build label content
  const rateText = `${formatRate(rate)}/min`;
  const showBeltIndicator = beltStatus !== 'ok';

  const pillBg = isDark ? 'bg-gray-800/90' : 'bg-white/90';
  const pillText = isDark ? 'text-gray-300' : 'text-gray-600';
  const pillBorder = beltStatus !== 'ok' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300');
  const pillBorderStyle = beltStatus !== 'ok' ? statusColor : undefined;

  const utilizationPct = Math.round(utilization * 100);
  const beltLabel = beltStatus === 'multi-belt'
    ? `\u00D7${beltsNeeded}`
    : `${utilizationPct}%`;

  const tooltipText = `${beltsNeeded} belt${beltsNeeded > 1 ? 's' : ''} \u00B7 ${utilizationPct}%`;

  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';

  // Compact zoom: rate label only, no belt popover
  if (zoomLevel === 'compact') {
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
            opacity: edgeOpacity,
            transition: 'opacity 0.2s',
          }}
        />
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
            className={`absolute text-[10px] ${pillBg} ${pillText} border ${pillBorder} rounded px-1 py-0.5 leading-tight pointer-events-none`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              ...(pillBorderStyle ? { borderColor: pillBorderStyle } : {}),
              opacity: isDimmed ? 0.25 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {rateText}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }

  // Full zoom: complete render with belt popover
  const popoverContent = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">Belt Details</div>
      <div className="flex justify-between">
        <span className={labelClass}>Belts needed</span>
        <span className="font-medium">{beltsNeeded}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Utilization</span>
        <span className="font-medium">{utilizationPct}%</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Throughput</span>
        <span className="font-medium">{formatRate(rate)}/min</span>
      </div>
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className="flex justify-between">
        <span className={labelClass}>Status</span>
        <span className="font-medium" style={{ color: statusColor }}>
          {beltStatus === 'multi-belt' ? 'Multi-belt' : 'Near capacity'}
        </span>
      </div>
    </div>
  );

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
          opacity: edgeOpacity,
          transition: 'opacity 0.2s',
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
          className={`absolute flex items-center gap-0.5 text-[10px] ${pillBg} ${pillText} border ${pillBorder} rounded px-1.5 py-0.5 leading-tight ${showBeltIndicator ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            ...(pillBorderStyle ? { borderColor: pillBorderStyle } : {}),
            opacity: isDimmed ? 0.25 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {rateText}
          {showBeltIndicator && (
            <BadgePopover
              isDark={isDark}
              tooltipContent={tooltipText}
              popoverContent={popoverContent}
            >
              <span className="inline-flex items-center gap-0.5 cursor-pointer">
                <BeltIcon size={10} color={statusColor} />
                <span style={{ color: statusColor }}>{beltLabel}</span>
              </span>
            </BadgePopover>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
