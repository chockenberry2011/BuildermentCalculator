import { memo } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { FlatEdge } from '../../core/GraphFlattener';
import { Rational } from '../../core/math/rational';
import { BeltStatus } from '../../data/belts';
import { type TargetBuildingDistribution, type PhysicalBeltInfo } from '../../core/beltDistribution';
import { getItemColor } from '../../data/itemColors';
import { BeltIcon } from '../BeltIcon';
import { BadgePopover } from '../BadgePopover';
import { useZoomLevel } from '../../hooks/useZoomLevel';
import type { SplitterTreeInfo } from '../../core/splitterTree';
import { EdgePopoverContent } from './EdgePopoverContent';

export interface BlueprintEdgeData {
  flatEdge: FlatEdge;
  beltStatus: BeltStatus;
  beltsNeeded: number;
  utilization: number;
  maxRate: number;
  isDark: boolean;
  isDimmed?: boolean;
  sourceBuildingCount: Rational | null;
  /** Total rate produced by the source node (for computing per-edge building share) */
  sourceTotalRate: Rational | null;
  /** Building type of the source node (e.g. 'extractor') */
  sourceBuildingType: string | null;
  /** Building name of the source node (e.g. 'Extractor') */
  sourceBuildingName: string | null;
  /** Whether the source node is a raw resource */
  sourceIsRaw: boolean;
  /** Building count of the target node */
  targetBuildingCount: Rational | null;
  /** Building type of the target node (e.g. 'workshop') */
  targetBuildingType: string | null;
  /** Building name of the target node (e.g. 'Workshop') */
  targetBuildingName: string | null;
  /** Where along the edge (0–1) the bend occurs; 0.5 = centered (default) */
  stepPosition: number;
  /** Splitter tree info for edges from multi-consumer source nodes */
  splitterTree: SplitterTreeInfo | null;
  /** Pre-computed building share for this edge */
  buildingShare: Rational | null;
  /** Pre-computed target building distribution */
  targetBuildingDist: TargetBuildingDistribution | null;
  /** Pre-computed physical belt info based on wiring groups */
  physicalBeltInfo: PhysicalBeltInfo | null;
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

  const { flatEdge, beltStatus, beltsNeeded, utilization, maxRate, isDark, isDimmed, sourceBuildingCount, sourceBuildingType, sourceBuildingName, sourceIsRaw, targetBuildingCount, targetBuildingType, targetBuildingName, stepPosition, splitterTree, buildingShare, targetBuildingDist, physicalBeltInfo } = data;
  const rate = flatEdge.rate.toNumber();
  const itemColor = getItemColor(flatEdge.fromItemId);
  const statusColor = STATUS_COLORS[beltStatus];

  // Use physical belt count when available, fall back to throughput-based
  const displayBelts = physicalBeltInfo?.displayBelts ?? beltsNeeded;

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
    stepPosition,
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
  const showBeltIndicator = beltStatus !== 'ok' || displayBelts > 1;

  const pillBg = isDark ? 'bg-gray-800/90' : 'bg-white/90';
  const pillText = isDark ? 'text-gray-300' : 'text-gray-600';
  const pillBorder = beltStatus !== 'ok' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300');
  const pillBorderStyle = beltStatus !== 'ok' ? statusColor : undefined;

  // Indicator color: use blue for physical multi-belt even when throughput status is 'ok'
  const indicatorColor = displayBelts > 1 && beltStatus === 'ok' ? STATUS_COLORS['multi-belt'] : statusColor;

  const utilizationPct = Math.round(utilization * 100);
  const beltLabel = displayBelts > 1
    ? `\u00D7${displayBelts}`
    : `${utilizationPct}%`;

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

  // Full zoom: complete render with popover on rate pill
  // Format building share for display
  const shareValue = buildingShare ? buildingShare.toNumber() : null;
  const shareText = shareValue !== null
    ? (buildingShare!.isInteger() || Math.abs(shareValue - Math.round(shareValue)) < 0.001
      ? Math.round(shareValue).toString()
      : shareValue.toFixed(2))
    : null;

  const popoverContent = (
    <EdgePopoverContent
      flatEdge={flatEdge}
      beltStatus={beltStatus}
      displayBelts={displayBelts}
      utilization={utilization}
      isDark={isDark}
      sourceBuildingCount={sourceBuildingCount}
      sourceBuildingType={sourceBuildingType}
      sourceBuildingName={sourceBuildingName}
      sourceIsRaw={sourceIsRaw}
      targetBuildingCount={targetBuildingCount}
      targetBuildingType={targetBuildingType}
      targetBuildingName={targetBuildingName}
      splitterTree={splitterTree}
      buildingShare={buildingShare}
      targetBuildingDist={targetBuildingDist}
      physicalBeltInfo={physicalBeltInfo}
    />
  );

  const tooltipParts = [`${displayBelts} belt${displayBelts > 1 ? 's' : ''}`, `${utilizationPct}%`];
  if (shareText && sourceBuildingName) {
    tooltipParts.push(`${shareText} ${sourceIsRaw ? 'extractors' : sourceBuildingName.toLowerCase() + 's'}`);
  }
  const fullTooltipText = tooltipParts.join(' \u00B7 ');

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
          className="absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            opacity: isDimmed ? 0.25 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <BadgePopover
            isDark={isDark}
            tooltipContent={fullTooltipText}
            popoverContent={popoverContent}
          >
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] ${pillBg} ${pillText} border ${pillBorder} rounded px-1.5 py-0.5 leading-tight cursor-pointer`}
              style={pillBorderStyle ? { borderColor: pillBorderStyle } : undefined}
            >
              {rateText}
              {showBeltIndicator && (
                <>
                  <BeltIcon size={10} color={indicatorColor} />
                  <span style={{ color: indicatorColor }}>{beltLabel}</span>
                </>
              )}
            </span>
          </BadgePopover>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
