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
import { getBeltDistribution, type TargetBuildingDistribution, type PhysicalBeltInfo } from '../../core/beltDistribution';
import { getItemColor } from '../../data/itemColors';
import { BeltIcon } from '../BeltIcon';
import { BuildingIcon } from '../BuildingIcon';
import { BadgePopover } from '../BadgePopover';
import { useZoomLevel } from '../../hooks/useZoomLevel';
import type { BuildingType } from '../../data/buildings';
import { traceSplitterPath, type SplitterTreeInfo, type SplitterTarget } from '../../core/splitterTree';
import { WiringDiagramSection } from '../WiringDiagram';

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

function formatTarget(target: SplitterTarget): string {
  return target.type === 'splitter' ? `S${target.index}` : target.label;
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

  // Full zoom: complete render with popover on rate pill
  const distribution =
    displayBelts > 1 && buildingShare
      ? getBeltDistribution(buildingShare, displayBelts)
      : null;

  // Target-side distribution: how many target buildings each belt serves
  const targetDistribution =
    displayBelts > 1 && targetBuildingCount
      ? getBeltDistribution(targetBuildingCount, displayBelts)
      : null;

  // Per-belt throughput
  const perBeltRate = displayBelts > 1 ? rate / displayBelts : null;

  // Format building share for display
  const shareValue = buildingShare ? buildingShare.toNumber() : null;
  const shareText = shareValue !== null
    ? (buildingShare!.isInteger() || Math.abs(shareValue - Math.round(shareValue)) < 0.001
      ? Math.round(shareValue).toString()
      : shareValue.toFixed(2))
    : null;
  const totalBuildingText = sourceBuildingCount
    ? (sourceBuildingCount.isInteger() || Math.abs(sourceBuildingCount.toNumber() - Math.round(sourceBuildingCount.toNumber())) < 0.001
      ? Math.round(sourceBuildingCount.toNumber()).toString()
      : sourceBuildingCount.toNumber().toFixed(2))
    : null;

  const popoverContent = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">{flatEdge.itemName}</div>
      <div className="flex justify-between">
        <span className={labelClass}>Throughput</span>
        <span className="font-medium">{formatRate(rate)}/min</span>
      </div>
      {shareText && sourceBuildingName && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`${labelClass} text-[11px] mb-1`}>Source</div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>
              {sourceIsRaw ? 'Extractors' : sourceBuildingName + 's'}
            </span>
            <span className="font-medium flex items-center gap-1">
              {sourceBuildingType && (
                <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={flatEdge.fromItemId} size="sm" />
              )}
              {shareText} of {totalBuildingText}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={labelClass}>Feeds</span>
            <span className="font-medium">{flatEdge.toItemName}</span>
          </div>
        </>
      )}
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className="flex justify-between">
        <span className={labelClass}>Belts needed</span>
        <span className="font-medium">{displayBelts}</span>
      </div>
      {physicalBeltInfo && physicalBeltInfo.physicalBelts > physicalBeltInfo.throughputBelts && (
        <div className="flex justify-between">
          <span className={labelClass}>Belt capacity</span>
          <span className="font-medium">{physicalBeltInfo.throughputBelts} (throughput)</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className={labelClass}>Utilization</span>
        <span className="font-medium">{utilizationPct}%</span>
      </div>
      {perBeltRate !== null && (
        <div className="flex justify-between">
          <span className={labelClass}>Per belt</span>
          <span className="font-medium">{formatRate(perBeltRate)}/min</span>
        </div>
      )}
      {beltStatus !== 'ok' && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className="flex justify-between">
            <span className={labelClass}>Status</span>
            <span className="font-medium" style={{ color: statusColor }}>
              {beltStatus === 'multi-belt' ? 'Multi-belt' : 'Near capacity'}
            </span>
          </div>
        </>
      )}
      {targetBuildingDist && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`${labelClass} mb-1`}>Distribution per {targetBuildingName?.toLowerCase() ?? 'target'}</div>
          <div className="font-medium flex items-center gap-1">
            {sourceBuildingType && (
              <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={flatEdge.fromItemId} size="sm" />
            )}
            {targetBuildingDist.shortLabel}
          </div>
          {targetBuildingDist.partialTargetFraction && targetBuildingDist.partialTargetSourceCount && (() => {
            const fullSrc = targetBuildingDist.fullTargetSourceCount.isInteger()
              ? targetBuildingDist.fullTargetSourceCount.toNumber()
              : targetBuildingDist.fullTargetSourceCount.toDecimalString();
            const partialSrc = targetBuildingDist.partialTargetSourceCount!.isInteger()
              ? targetBuildingDist.partialTargetSourceCount!.toNumber()
              : targetBuildingDist.partialTargetSourceCount!.toDecimalString();
            const partialFrac = `${String(targetBuildingDist.partialTargetFraction!.numerator)}/${String(targetBuildingDist.partialTargetFraction!.denominator)}`;
            const srcIcon = sourceBuildingType ? (
              <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={flatEdge.fromItemId} size="sm" />
            ) : null;
            const tgtIcon = targetBuildingType ? (
              <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={flatEdge.toItemId} size="sm" />
            ) : null;
            const sameType = sourceBuildingType === targetBuildingType;
            const srcItemLabel = sameType ? flatEdge.itemName : null;
            const tgtItemLabel = sameType ? flatEdge.toItemName : null;
            return (
              <div className="text-[11px] ml-2 mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className={labelClass}>×{targetBuildingDist.fullTargetBuildings}</span>
                  {tgtIcon}
                  {tgtItemLabel && <span className={labelClass}>{tgtItemLabel}</span>}
                  <span className={labelClass}>← {fullSrc}</span>
                  {srcIcon}
                  {srcItemLabel && <span className={labelClass}>{srcItemLabel}</span>}
                  <span className={labelClass}>each</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={labelClass}>×1</span>
                  {tgtIcon}
                  {tgtItemLabel && <span className={labelClass}>{tgtItemLabel}</span>}
                  <span className={labelClass}>← {partialSrc}</span>
                  {srcIcon}
                  {srcItemLabel && <span className={labelClass}>{srcItemLabel}</span>}
                  <span className={`${labelClass} italic`}>({partialFrac} capacity)</span>
                </div>
              </div>
            );
          })()}
        </>
      )}
      {targetBuildingDist && targetDistribution && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`${labelClass} mb-1`}>Collection per belt</div>
          <div className="font-medium flex items-center gap-1">
            {targetBuildingType && (
              <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={flatEdge.toItemId} size="sm" />
            )}
            {targetDistribution.shortLabel}
          </div>
          {targetDistribution.splitInfo && (
            <div className={`${labelClass} text-[11px] ml-5`}>
              {targetDistribution.splitInfo.fullBuildings} full + {targetDistribution.splitInfo.splitNumerator}/{targetDistribution.splitInfo.splitDenominator} split
            </div>
          )}
        </>
      )}
      {!targetBuildingDist && (distribution || targetDistribution) && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`${labelClass} mb-1`}>Distribution per belt</div>
          {distribution && (
            <>
              <div className="font-medium flex items-center gap-1">
                {sourceBuildingType && (
                  <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={flatEdge.fromItemId} size="sm" />
                )}
                Source: {distribution.shortLabel}
              </div>
              {distribution.splitInfo && (
                <div className={`${labelClass} text-[11px] ml-5`}>
                  {distribution.splitInfo.fullBuildings} full + {distribution.splitInfo.splitNumerator}/{distribution.splitInfo.splitDenominator} split
                </div>
              )}
            </>
          )}
          {targetDistribution && (
            <div className="font-medium flex items-center gap-1">
              {targetBuildingType && (
                <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={flatEdge.toItemId} size="sm" />
              )}
              Target: {targetDistribution.shortLabel}
            </div>
          )}
        </>
      )}
      <WiringDiagramSection
        distribution={distribution}
        targetDistribution={targetDistribution}
        targetBuildingDist={targetBuildingDist}
        sourceBuildingType={sourceBuildingType}
        targetBuildingType={targetBuildingType}
        sourceItemId={flatEdge.fromItemId}
        targetItemId={flatEdge.toItemId}
        buildingShare={buildingShare}
        targetBuildingCount={targetBuildingCount}
        beltsNeeded={displayBelts}
        isDark={isDark}
        labelClass={labelClass}
        dividerClass={dividerClass}
      />
      {splitterTree && splitterTree.ratioParts.length >= 2 && (() => {
        const targetLabel = flatEdge.toItemName;
        const path = splitterTree.isSplitterFriendly
          ? traceSplitterPath(splitterTree, targetLabel)
          : null;
        const onPathSteps = path
          ? new Set(path.hops.map((h) => h.stepIndex))
          : null;
        // Map step index → side taken toward target
        const hopSideMap = path
          ? new Map(path.hops.map((h) => [h.stepIndex, h.side]))
          : null;

        const highlightClass = isDark ? 'text-blue-400' : 'text-blue-600';
        const onPathClass = isDark ? 'text-blue-400' : 'text-blue-500';

        return (
          <>
            <div className={`border-t my-2 ${dividerClass}`} />
            {splitterTree.isSplitterFriendly && splitterTree.steps.length > 0 ? (
              <>
                <div className={`${labelClass} text-[11px] mb-1`}>Splitter Guide</div>
                <div className="text-[11px] font-mono mb-1">
                  {splitterTree.ratioParts.map((rp, i) => (
                    <span key={rp.label}>
                      {i > 0 && <span className={labelClass}>{' : '}</span>}
                      <span
                        className={rp.label === targetLabel ? `font-bold ${highlightClass}` : labelClass}
                        title={rp.label}
                      >
                        {rp.parts}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="space-y-0.5">
                  {[...splitterTree.steps].reverse().map((step) => {
                    const isOnPath = onPathSteps?.has(step.index) ?? false;
                    const stepSide = hopSideMap?.get(step.index);

                    const getTargetClass = (target: SplitterTarget, side: 'left' | 'right') => {
                      if (target.type === 'output' && target.label === targetLabel) {
                        return `font-bold ${highlightClass}`;
                      }
                      if (isOnPath && stepSide === side) return onPathClass;
                      return labelClass;
                    };

                    return (
                      <div key={step.index} className="flex items-center gap-1 text-[11px] font-mono">
                        <span className={isOnPath ? onPathClass : labelClass}>S{step.index}</span>
                        <span className={labelClass}>L:</span>
                        <span className={getTargetClass(step.left, 'left')}>{formatTarget(step.left)}</span>
                        <span className={labelClass}>R:</span>
                        <span className={getTargetClass(step.right, 'right')}>{formatTarget(step.right)}</span>
                      </div>
                    );
                  })}
                </div>
                {path && (
                  <div className={`${labelClass} text-[10px] mt-1`}>
                    {path.depth} splitter{path.depth > 1 ? 's' : ''} from source
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className={labelClass}>Split Ratio</span>
                  <span className="font-medium">{splitterTree.ratioLabel}</span>
                </div>
                {!splitterTree.isSplitterFriendly && (
                  <div className="text-[11px] text-amber-500">
                    Not achievable with even splitters
                  </div>
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
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
