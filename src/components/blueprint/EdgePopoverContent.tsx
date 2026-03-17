import { FlatEdge } from '../../core/GraphFlattener';
import { Rational } from '../../core/math/rational';
import { BeltStatus } from '../../data/belts';
import { getBeltDistribution, type TargetBuildingDistribution, type PhysicalBeltInfo } from '../../core/beltDistribution';
import { BuildingIcon } from '../BuildingIcon';
import type { BuildingType } from '../../data/buildings';
import { traceSplitterPath, type SplitterTreeInfo, type SplitterTarget } from '../../core/splitterTree';
import { WiringDiagramSection } from '../WiringDiagram';

function formatRate(rate: number): string {
  if (Math.abs(rate - Math.round(rate)) < 0.01) {
    return Math.round(rate).toString();
  }
  return rate.toFixed(1);
}

function formatTarget(target: SplitterTarget): string {
  return target.type === 'splitter' ? `S${target.index}` : target.label;
}

const STATUS_COLORS: Record<BeltStatus, string> = {
  'multi-belt': '#60A5FA',   // blue-400
  'near-capacity': '#FBBF24', // amber-400
  'ok': '#9CA3AF',           // gray-400
};

export interface EdgePopoverContentProps {
  flatEdge: FlatEdge;
  beltStatus: BeltStatus;
  displayBelts: number;
  utilization: number;
  isDark: boolean;
  sourceBuildingCount: Rational | null;
  sourceBuildingType: string | null;
  sourceBuildingName: string | null;
  sourceIsRaw: boolean;
  targetBuildingCount: Rational | null;
  targetBuildingType: string | null;
  targetBuildingName: string | null;
  splitterTree: SplitterTreeInfo | null;
  buildingShare: Rational | null;
  targetBuildingDist: TargetBuildingDistribution | null;
  physicalBeltInfo: PhysicalBeltInfo | null;
}

export function EdgePopoverContent({
  flatEdge,
  beltStatus,
  displayBelts,
  utilization,
  isDark,
  sourceBuildingCount,
  sourceBuildingType,
  sourceBuildingName,
  sourceIsRaw,
  targetBuildingCount,
  targetBuildingType,
  targetBuildingName,
  splitterTree,
  buildingShare,
  targetBuildingDist,
  physicalBeltInfo,
}: EdgePopoverContentProps) {
  const rate = flatEdge.rate.toNumber();
  const statusColor = STATUS_COLORS[beltStatus];
  const utilizationPct = Math.round(utilization * 100);
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';

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

  // Multi-belt distributions
  const distribution =
    displayBelts > 1 && buildingShare
      ? getBeltDistribution(buildingShare, displayBelts)
      : null;

  const targetDistribution =
    displayBelts > 1 && targetBuildingCount
      ? getBeltDistribution(targetBuildingCount, displayBelts)
      : null;

  return (
    <div className="space-y-1">
      {/* Header + rate */}
      <div>
        <div className="font-semibold text-sm">{flatEdge.itemName}</div>
        <div className="font-medium mt-1">{formatRate(rate)}/min · {utilizationPct}%</div>
      </div>

      {/* Source info */}
      {shareText && sourceBuildingName && (
        <div>
          <div className={`${labelClass} text-[10px] font-semibold uppercase tracking-wider mb-0.5`}>Source</div>
          <div className="font-medium flex items-center gap-1">
            {sourceBuildingType && (
              <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={flatEdge.fromItemId} size="sm" />
            )}
            {shareText} of {totalBuildingText} {sourceIsRaw ? 'extractors' : sourceBuildingName.toLowerCase() + 's'}
          </div>
          <div className="mt-0.5">
            <span className={labelClass}>→</span> <span className="font-medium">{flatEdge.toItemName}</span>
          </div>
        </div>
      )}

      {/* Belts */}
      <div>
        <div className={`${labelClass} text-[10px] font-semibold uppercase tracking-wider mb-0.5`}>Belts</div>
        <div className="font-medium">
          ×{displayBelts}
          {beltStatus !== 'ok'
            ? <> · <span style={{ color: statusColor }}>{beltStatus === 'multi-belt' ? 'multi-belt' : 'near capacity'}</span></>
            : <> · {utilizationPct}%</>
          }
        </div>
        {perBeltRate !== null && (
          <div className="mt-0.5">{formatRate(perBeltRate)}/min per belt</div>
        )}
        {physicalBeltInfo && physicalBeltInfo.physicalBelts > physicalBeltInfo.throughputBelts && (
          <div className="mt-0.5">{physicalBeltInfo.throughputBelts} throughput</div>
        )}
      </div>
      {targetBuildingDist && (
        <>
          <div className={`border-t my-1 ${dividerClass}`} />
          <div className={`${labelClass} mb-0.5`}>Distribution per {targetBuildingName?.toLowerCase() ?? 'target'}</div>
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
              <div className="text-[11px] ml-1 mt-0 space-y-0.5">
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
          <div className={`border-t my-1 ${dividerClass}`} />
          <div className={`${labelClass} mb-0.5`}>Collection per belt</div>
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
          <div className={`border-t my-1 ${dividerClass}`} />
          <div className={`${labelClass} mb-0.5`}>Distribution per belt</div>
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
            <div className={`border-t my-1 ${dividerClass}`} />
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
}
