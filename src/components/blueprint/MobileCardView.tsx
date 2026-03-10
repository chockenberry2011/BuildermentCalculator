import { useMemo, useState } from 'react';
import { type FlatDAG, type FlatNode, type FlatEdge, computeTopologicalRanks, computeBranchGroups } from '../../core/GraphFlattener';
import type { BlueprintProgressState } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import { BUILDINGS } from '../../data/buildings';
import { getItemColor } from '../../data/itemColors';
import { fractionSimplicityScore } from '../../core/RatioOptimizer';
import { getCountColor } from '../../core/countColor';
import { classifyBeltStatus, getBeltsNeeded, getBeltUtilization } from '../../data/belts';
import { getTargetBuildingDistribution, getPhysicalBeltCount } from '../../core/beltDistribution';
import { buildSplitterTree, ratesToParts, traceSplitterPath, type SplitterTreeInfo, type SplitterTarget } from '../../core/splitterTree';
import { BuildingIcon } from '../BuildingIcon';
import { BeltIcon } from '../BeltIcon';
import { SplitBadge } from '../SplitBadge';
import { LevelBadge } from '../LevelBadge';
import { WiringDiagramSection } from '../WiringDiagram';
import { ProgressCheckbox, getProgressColors } from './ProgressCheckbox';
import { formatCount, formatRate } from './formatUtils';
import type { Rational } from '../../core/math/rational';
import type { BuildingType } from '../../data/buildings';
import { getBeltDistribution, type TargetBuildingDistribution, type PhysicalBeltInfo } from '../../core/beltDistribution';

interface MobileCardViewProps {
  dag: FlatDAG;
  beltSpeed: number;
  isDark: boolean;
  rootItemIds: Set<string>;
  blueprintProgress: Map<string, BlueprintProgressState>;
  toggleBlueprintProgress: (nodeKey: string) => void;
  hasProgress: boolean;
  onClearProgress: () => void;
}

/** Enriched edge info for the mobile detail panel */
interface EdgeDetail {
  edge: FlatEdge;
  rate: number;
  beltsNeeded: number;
  utilization: number;
  utilizationPct: number;
  beltStatus: string;
  sourceBuildingCount: Rational | null;
  sourceTotalRate: Rational | null;
  sourceBuildingType: string | null;
  sourceBuildingName: string | null;
  sourceIsRaw: boolean;
  sourceItemId: string;
  targetBuildingCount: Rational | null;
  targetBuildingType: string | null;
  targetBuildingName: string | null;
  buildingShare: Rational | null;
  targetBuildingDist: TargetBuildingDistribution | null;
  physicalBeltInfo: PhysicalBeltInfo | null;
  splitterTree: SplitterTreeInfo | null;
  sourceBuildingLevel: number | null;
}

function computeEdgeDetails(dag: FlatDAG, beltSpeed: number): Map<string, EdgeDetail[]> {
  const nodeMap = new Map<string, FlatNode>();
  for (const node of dag.nodes) {
    nodeMap.set(node.nodeKey, node);
  }

  // Group edges by source for splitter trees
  const edgesBySource = new Map<string, FlatEdge[]>();
  for (const edge of dag.edges) {
    const list = edgesBySource.get(edge.fromNodeKey) ?? [];
    list.push(edge);
    edgesBySource.set(edge.fromNodeKey, list);
  }

  const splitterTrees = new Map<string, SplitterTreeInfo>();
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

  const result = new Map<string, EdgeDetail[]>();

  for (const edge of dag.edges) {
    const rate = edge.rate.toNumber();
    const sourceNode = nodeMap.get(edge.fromNodeKey);
    const targetNode = nodeMap.get(edge.toNodeKey);
    const srcBuilding = sourceNode?.building ?? null;
    const tgtBuilding = targetNode?.building ?? null;

    const sourceBuildingCount = srcBuilding?.count ?? null;
    const sourceTotalRate = sourceNode?.totalRate ?? null;
    const targetBuildingCount = tgtBuilding?.count ?? null;
    const targetBuildingName = tgtBuilding ? (BUILDINGS[tgtBuilding.buildingType]?.name ?? null) : null;

    const buildingShare = sourceBuildingCount && sourceTotalRate && !sourceTotalRate.isZero()
      ? sourceBuildingCount.multiply(edge.rate).divide(sourceTotalRate)
      : null;

    const targetBuildingDist = buildingShare && targetBuildingCount && targetBuildingName
      ? getTargetBuildingDistribution(buildingShare, targetBuildingCount, targetBuildingName)
      : null;

    const physicalBeltInfo = getPhysicalBeltCount(targetBuildingDist, rate, beltSpeed);
    const displayBelts = physicalBeltInfo?.displayBelts ?? getBeltsNeeded(rate, beltSpeed);

    const detail: EdgeDetail = {
      edge,
      rate,
      beltsNeeded: displayBelts,
      utilization: getBeltUtilization(rate, beltSpeed),
      utilizationPct: Math.round(getBeltUtilization(rate, beltSpeed) * 100),
      beltStatus: classifyBeltStatus(rate, beltSpeed),
      sourceBuildingCount,
      sourceTotalRate,
      sourceBuildingType: srcBuilding?.buildingType ?? null,
      sourceBuildingName: srcBuilding ? (BUILDINGS[srcBuilding.buildingType]?.name ?? null) : null,
      sourceIsRaw: sourceNode?.isRaw ?? false,
      sourceItemId: edge.fromItemId,
      targetBuildingCount,
      targetBuildingType: tgtBuilding?.buildingType ?? null,
      targetBuildingName,
      buildingShare,
      targetBuildingDist,
      physicalBeltInfo,
      splitterTree: splitterTrees.get(edge.fromNodeKey) ?? null,
      sourceBuildingLevel: srcBuilding?.level ?? null,
    };

    const list = result.get(edge.toNodeKey) ?? [];
    list.push(detail);
    result.set(edge.toNodeKey, list);
  }

  return result;
}

function formatRateNum(rate: number): string {
  if (Math.abs(rate - Math.round(rate)) < 0.01) {
    return Math.round(rate).toString();
  }
  return rate.toFixed(1);
}

function formatSplitterTarget(target: SplitterTarget): string {
  return target.type === 'splitter' ? `S${target.index}` : target.label;
}

function InputDetailPanel({ detail, isDark }: { detail: EdgeDetail; isDark: boolean }) {
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';
  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const panelBg = isDark ? 'bg-gray-800/60' : 'bg-gray-50';

  const { beltsNeeded, utilizationPct, beltStatus, buildingShare, sourceBuildingName, sourceBuildingType, sourceIsRaw, targetBuildingCount, targetBuildingType, targetBuildingName, targetBuildingDist, physicalBeltInfo, splitterTree, edge } = detail;

  const shareValue = buildingShare ? buildingShare.toNumber() : null;
  const shareText = shareValue !== null
    ? (buildingShare!.isInteger() || Math.abs(shareValue - Math.round(shareValue)) < 0.001
      ? Math.round(shareValue).toString()
      : shareValue.toFixed(2))
    : null;

  const distribution =
    beltsNeeded > 1 && buildingShare
      ? getBeltDistribution(buildingShare, beltsNeeded)
      : null;

  const targetDistribution =
    beltsNeeded > 1 && targetBuildingCount
      ? getBeltDistribution(targetBuildingCount, beltsNeeded)
      : null;

  const perBeltRate = beltsNeeded > 1 ? detail.rate / beltsNeeded : null;

  const statusColors: Record<string, string> = {
    'multi-belt': '#60A5FA',
    'near-capacity': '#FBBF24',
    'ok': '#9CA3AF',
  };
  const statusColor = statusColors[beltStatus] ?? '#9CA3AF';

  return (
    <div className={`${panelBg} rounded-md px-2.5 py-2 mt-1 space-y-1.5 text-xs ${textClass}`}>
      {/* Belt info */}
      <div className="flex justify-between">
        <span className={labelClass}>Throughput</span>
        <span className="font-medium">{formatRateNum(detail.rate)}/min</span>
      </div>

      {shareText && sourceBuildingName && (
        <>
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className={`${labelClass} text-[11px]`}>Source</div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>{sourceIsRaw ? 'Extractors' : sourceBuildingName + 's'}</span>
            <span className="font-medium flex items-center gap-1">
              {sourceBuildingType && (
                <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={detail.sourceItemId} size="sm" />
              )}
              {shareText} of {detail.sourceBuildingCount
                ? (detail.sourceBuildingCount.isInteger() ? Math.round(detail.sourceBuildingCount.toNumber()).toString() : detail.sourceBuildingCount.toNumber().toFixed(2))
                : '?'}
              {sourceIsRaw && detail.sourceBuildingLevel !== null && detail.sourceBuildingLevel > 1 && (
                <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  Lv{detail.sourceBuildingLevel}
                </span>
              )}
            </span>
          </div>
        </>
      )}

      <div className={`border-t my-1.5 ${dividerClass}`} />
      <div className="flex justify-between">
        <span className={labelClass}>Belts needed</span>
        <span className="font-medium flex items-center gap-1">
          <BeltIcon size={12} color={statusColor} />
          {beltsNeeded}
        </span>
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
          <span className="font-medium">{formatRateNum(perBeltRate)}/min</span>
        </div>
      )}
      {beltStatus !== 'ok' && (
        <div className="flex justify-between">
          <span className={labelClass}>Status</span>
          <span className="font-medium" style={{ color: statusColor }}>
            {beltStatus === 'multi-belt' ? 'Multi-belt' : 'Near capacity'}
          </span>
        </div>
      )}

      {/* Distribution */}
      {targetBuildingDist && (
        <>
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className={`${labelClass} text-[11px]`}>Distribution per {targetBuildingName?.toLowerCase() ?? 'target'}</div>
          <div className="font-medium flex items-center gap-1">
            {sourceBuildingType && (
              <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={detail.sourceItemId} size="sm" />
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
              <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={detail.sourceItemId} size="sm" />
            ) : null;
            const tgtIcon = targetBuildingType ? (
              <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={edge.toItemId} size="sm" />
            ) : null;
            const sameType = sourceBuildingType === targetBuildingType;
            const srcItemLabel = sameType ? edge.itemName : null;
            const tgtItemLabel = sameType ? edge.toItemName : null;
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
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className={`${labelClass} text-[11px]`}>Collection per belt</div>
          <div className="font-medium flex items-center gap-1">
            {targetBuildingType && (
              <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={edge.toItemId} size="sm" />
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
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className={`${labelClass} text-[11px]`}>Distribution per belt</div>
          {distribution && (
            <div className="font-medium flex items-center gap-1">
              {sourceBuildingType && (
                <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={detail.sourceItemId} size="sm" />
              )}
              Source: {distribution.shortLabel}
            </div>
          )}
          {targetDistribution && (
            <div className="font-medium flex items-center gap-1">
              {targetBuildingType && (
                <BuildingIcon buildingType={targetBuildingType as BuildingType} itemId={edge.toItemId} size="sm" />
              )}
              Target: {targetDistribution.shortLabel}
            </div>
          )}
        </>
      )}

      {/* Wiring diagram */}
      <WiringDiagramSection
        distribution={distribution}
        targetDistribution={targetDistribution}
        targetBuildingDist={targetBuildingDist}
        sourceBuildingType={sourceBuildingType}
        targetBuildingType={targetBuildingType}
        sourceItemId={edge.fromItemId}
        targetItemId={edge.toItemId}
        buildingShare={buildingShare}
        targetBuildingCount={targetBuildingCount}
        beltsNeeded={beltsNeeded}
        isDark={isDark}
        labelClass={labelClass}
        dividerClass={dividerClass}
      />

      {/* Splitter guide */}
      {splitterTree && splitterTree.ratioParts.length >= 2 && (() => {
        const targetLabel = edge.toItemName;
        const path = splitterTree.isSplitterFriendly
          ? traceSplitterPath(splitterTree, targetLabel)
          : null;
        const onPathSteps = path
          ? new Set(path.hops.map((h) => h.stepIndex))
          : null;
        const hopSideMap = path
          ? new Map(path.hops.map((h) => [h.stepIndex, h.side]))
          : null;

        const highlightClass = isDark ? 'text-blue-400' : 'text-blue-600';
        const onPathClass = isDark ? 'text-blue-400' : 'text-blue-500';

        return (
          <>
            <div className={`border-t my-1.5 ${dividerClass}`} />
            {splitterTree.isSplitterFriendly && splitterTree.steps.length > 0 ? (
              <>
                <div className={`${labelClass} text-[11px]`}>Splitter Guide</div>
                <div className="text-[11px] font-mono">
                  {splitterTree.ratioParts.map((rp, i) => (
                    <span key={rp.label}>
                      {i > 0 && <span className={labelClass}>{' : '}</span>}
                      <span className={rp.label === targetLabel ? `font-bold ${highlightClass}` : labelClass}>
                        {rp.parts}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="space-y-0.5 mt-1">
                  {[...splitterTree.steps].reverse().map((step) => {
                    const isOnPath = onPathSteps?.has(step.index) ?? false;
                    const stepSide = hopSideMap?.get(step.index);

                    const getTargetClass = (target: SplitterTarget, side: 'left' | 'right') => {
                      if (target.type === 'output' && target.label === targetLabel) return `font-bold ${highlightClass}`;
                      if (isOnPath && stepSide === side) return onPathClass;
                      return labelClass;
                    };

                    return (
                      <div key={step.index} className="flex items-center gap-1 text-[11px] font-mono">
                        <span className={isOnPath ? onPathClass : labelClass}>S{step.index}</span>
                        <span className={labelClass}>L:</span>
                        <span className={getTargetClass(step.left, 'left')}>{formatSplitterTarget(step.left)}</span>
                        <span className={labelClass}>R:</span>
                        <span className={getTargetClass(step.right, 'right')}>{formatSplitterTarget(step.right)}</span>
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
                  <div className="text-[11px] text-amber-500">Not achievable with even splitters</div>
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}

function InputRow({
  detail,
  isDark,
}: {
  detail: EdgeDetail;
  isDark: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const itemColor = getItemColor(detail.edge.fromItemId);

  // Determine if this edge has any interesting detail worth expanding
  const hasDetail = detail.beltStatus !== 'ok'
    || detail.beltsNeeded > 1
    || detail.targetBuildingDist !== null
    || (detail.splitterTree !== null && detail.splitterTree.ratioParts.length >= 2)
    || (detail.buildingShare !== null && detail.sourceBuildingName !== null);

  const statusColors: Record<string, string> = {
    'multi-belt': '#60A5FA',
    'near-capacity': '#FBBF24',
  };
  const indicatorColor = detail.beltsNeeded > 1 && detail.beltStatus === 'ok'
    ? '#60A5FA'
    : statusColors[detail.beltStatus];

  return (
    <div>
      <button
        className={`flex items-center gap-2 text-xs leading-6 w-full text-left ${hasDetail ? 'active:opacity-70' : ''}`}
        onClick={hasDetail ? () => setExpanded(!expanded) : undefined}
        disabled={!hasDetail}
      >
        <span
          className="shrink-0 rounded-full"
          style={{ width: 8, height: 8, backgroundColor: itemColor }}
        />
        <span className={`${textColor} truncate flex-1 min-w-0`}>{detail.edge.itemName}</span>
        {/* Belt indicator inline */}
        {(detail.beltStatus !== 'ok' || detail.beltsNeeded > 1) && indicatorColor && (
          <span className="flex items-center gap-0.5 shrink-0">
            <BeltIcon size={10} color={indicatorColor} />
            <span className="text-[10px] font-medium" style={{ color: indicatorColor }}>
              {detail.beltsNeeded > 1 ? `\u00D7${detail.beltsNeeded}` : `${detail.utilizationPct}%`}
            </span>
          </span>
        )}
        <span className={`${subtextColor} shrink-0 tabular-nums`}>
          {formatRate(detail.edge.rate)}/min
        </span>
        {hasDetail && (
          <svg
            className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${subtextColor}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>
      {expanded && <InputDetailPanel detail={detail} isDark={isDark} />}
    </div>
  );
}

function MobileCard({
  node,
  edgeDetails,
  isDark,
  isRoot,
  progressState,
  onToggleProgress,
}: {
  node: FlatNode;
  edgeDetails: EdgeDetail[];
  isDark: boolean;
  isRoot: boolean;
  progressState: BlueprintProgressState | false;
  onToggleProgress: () => void;
}) {
  const accentColor = getItemColor(node.itemId);
  const building = node.building;
  const buildingType = building?.buildingType ?? 'workshop';
  const buildingName = building ? (BUILDINGS[building.buildingType]?.name ?? '') : '';
  const count = building ? formatCount(building.count) : null;
  const { bgClass, borderColor } = getProgressColors(progressState, isDark);
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div
      className={`rounded-lg shadow-sm ${bgClass} overflow-hidden ${isRoot ? 'ring-2 ring-blue-500' : ''}`}
      style={{ borderLeft: `4px solid ${accentColor}`, border: `1px solid ${borderColor}`, borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <div className="px-3 py-2.5">
        {/* Header: name + rate + checkbox */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-sm ${textColor} truncate`}>
              {node.itemName}
            </div>
            {node.consumerItemName && (
              <div className={`text-xs ${subtextColor} truncate`}>
                {'\u2192'} {node.consumerItemName}
              </div>
            )}
          </div>
          <span className={`text-sm font-semibold ${textColor} shrink-0 tabular-nums`}>
            {formatRate(node.totalRate)}/min
          </span>
          <button
            className="shrink-0"
            onClick={onToggleProgress}
            title={progressState === 'completed' ? 'Reset progress' : progressState === 'in_progress' ? 'Mark as built' : 'Mark as in progress'}
          >
            <ProgressCheckbox progressState={progressState} isDark={isDark} size={20} />
          </button>
        </div>

        {/* Building info */}
        {count && (
          <div className={`mt-2 pt-2 flex items-center gap-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <BuildingIcon buildingType={buildingType} itemId={node.itemId} size="md" />
            <span
              className="text-sm font-semibold"
              style={{ color: getCountColor(fractionSimplicityScore(building!.count), isDark) }}
            >
              {count.text}x
            </span>
            <span className={`text-xs ${subtextColor}`}>
              {buildingName}
            </span>
            {building && building.level > 1 && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                Lv{building.level}
              </span>
            )}
            <div className="flex-1" />
            {!count.isInteger && (
              <SplitBadge count={building!.count} isDark={isDark} />
            )}
            {building && building.level < building.configuredLevel && (
              <LevelBadge building={building} isDark={isDark} />
            )}
          </div>
        )}

        {/* Raw resource indicator */}
        {node.isRaw && !count && (
          <div className={`mt-1 text-xs ${subtextColor} italic`}>Raw resource</div>
        )}

        {/* Inputs with expandable details */}
        {edgeDetails.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${subtextColor} mb-1`}>
              Inputs
            </div>
            {edgeDetails.map((detail) => (
              <InputRow
                key={`${detail.edge.fromNodeKey}-${detail.edge.toNodeKey}`}
                detail={detail}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileCardView({
  dag,
  beltSpeed,
  isDark,
  rootItemIds,
  blueprintProgress,
  toggleBlueprintProgress,
  hasProgress,
  onClearProgress,
}: MobileCardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const groupMode = useStore(s => s.blueprintGroupMode);
  const setBlueprintGroupMode = useStore(s => s.setBlueprintGroupMode);

  const ranks = useMemo(() => computeTopologicalRanks(dag), [dag]);

  const maxRank = useMemo(() => {
    let max = 0;
    for (const r of ranks.values()) {
      if (r > max) max = r;
    }
    return max;
  }, [ranks]);

  // Compute enriched edge details
  const edgeDetailsOf = useMemo(() => computeEdgeDetails(dag, beltSpeed), [dag, beltSpeed]);

  // Group nodes by rank (descending: final products first)
  const groupedNodes = useMemo(() => {
    const groups: { rank: number; label: string; nodes: FlatNode[]; accentColor?: string }[] = [];
    const byRank = new Map<number, FlatNode[]>();
    for (const node of dag.nodes) {
      const rank = ranks.get(node.nodeKey) ?? 0;
      const list = byRank.get(rank) ?? [];
      list.push(node);
      byRank.set(rank, list);
    }

    for (let r = maxRank; r >= 0; r--) {
      const nodes = byRank.get(r);
      if (!nodes || nodes.length === 0) continue;
      const label = r === maxRank ? 'Final Product' : r === 0 ? 'Raw Resources' : `Step ${r}`;
      groups.push({ rank: r, label, nodes });
    }
    return groups;
  }, [dag.nodes, ranks, maxRank]);

  // Branch-based grouping
  const branchGroups = useMemo(() => {
    if (groupMode !== 'branches') return null;
    return computeBranchGroups(dag, rootItemIds, ranks);
  }, [dag, rootItemIds, ranks, groupMode]);

  // Unified group type for rendering
  type RenderGroup = { key: string; label: string; nodes: FlatNode[]; accentColor?: string };

  const renderGroups: RenderGroup[] = useMemo(() => {
    if (groupMode === 'branches' && branchGroups) {
      return branchGroups.map((bg) => ({
        key: bg.id,
        label: bg.name,
        nodes: bg.nodes,
        accentColor: bg.isShared || bg.isRaw || bg.isRoot ? undefined : bg.accentColor,
      }));
    }
    return groupedNodes.map((g) => ({
      key: String(g.rank),
      label: g.label,
      nodes: g.nodes,
    }));
  }, [groupMode, branchGroups, groupedNodes]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return renderGroups;
    const q = searchQuery.toLowerCase();
    return renderGroups
      .map((group) => ({
        ...group,
        nodes: group.nodes.filter((n) => n.itemName.toLowerCase().includes(q)),
      }))
      .filter((group) => group.nodes.length > 0);
  }, [renderGroups, searchQuery]);

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const labelColor = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${bg} rounded-lg w-full max-w-full overflow-x-hidden`}>
      {/* Sticky search bar + group toggle */}
      <div className={`sticky top-0 z-10 ${bg} px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2 items-center min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={`min-w-0 flex-1 max-w-[120px] text-sm rounded-md border px-2.5 py-1.5 ${inputBg} outline-none focus:ring-1 focus:ring-blue-500`}
          />
          {/* Steps / Branches toggle */}
          <div className={`flex rounded-md border text-xs font-medium shrink-0 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
            <button
              onClick={() => setBlueprintGroupMode('steps')}
              className={`px-2 py-1.5 rounded-l-md transition-colors ${
                groupMode === 'steps'
                  ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
              }`}
            >
              Steps
            </button>
            <button
              onClick={() => setBlueprintGroupMode('branches')}
              className={`px-2 py-1.5 rounded-r-md transition-colors ${
                groupMode === 'branches'
                  ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
              }`}
            >
              Branches
            </button>
          </div>
          {hasProgress && (
            <button
              onClick={onClearProgress}
              className={`text-xs px-2 py-1.5 rounded-md ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="px-3 py-2 space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              {group.accentColor && (
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 10, height: 10, backgroundColor: group.accentColor }}
                />
              )}
              <div className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
                {group.label}
              </div>
            </div>
            <div
              className="space-y-2"
              style={group.accentColor ? { borderLeft: `3px solid ${group.accentColor}`, paddingLeft: 8 } : undefined}
            >
              {group.nodes.map((node) => (
                <MobileCard
                  key={`${group.key}:${node.nodeKey}`}
                  node={node}
                  edgeDetails={edgeDetailsOf.get(node.nodeKey) ?? []}
                  isDark={isDark}
                  isRoot={rootItemIds.has(node.itemId)}
                  progressState={blueprintProgress.get(node.nodeKey) ?? false}
                  onToggleProgress={() => toggleBlueprintProgress(node.nodeKey)}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div className={`text-center py-8 ${labelColor} italic text-sm`}>
            No items match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
