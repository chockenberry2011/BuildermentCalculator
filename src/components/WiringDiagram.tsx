import { useState } from 'react';
import { computeWiringLayout, getCompressedInfo } from '../core/wiringLayout';
import { gcd } from '../core/math/gcd';
import { BUILDING_COLORS, BuildingIcon } from './BuildingIcon';
import type { BeltDistribution, TargetBuildingDistribution } from '../core/beltDistribution';
import { computeFeedingPattern } from '../core/beltDistribution';
import type { Rational } from '../core/math/rational';
import type { BuildingType } from '../data/buildings';
import { ITEMS } from '../data/items';

function getShortItemLabel(itemId: string): string {
  const item = ITEMS[itemId];
  if (!item) return itemId;
  return item.name.split(/[\s_]+/)[0];
}

interface WiringDiagramSectionProps {
  distribution: BeltDistribution | null;
  targetDistribution: BeltDistribution | null;
  targetBuildingDist: TargetBuildingDistribution | null;
  sourceBuildingType: string | null;
  targetBuildingType: string | null;
  sourceItemId?: string;
  targetItemId?: string;
  buildingShare: Rational | null;
  targetBuildingCount: Rational | null;
  beltsNeeded: number;
  isDark: boolean;
  labelClass: string;
  dividerClass: string;
}

type DiagramSide = 'source' | 'target';

export function WiringDiagramSection({
  distribution,
  targetDistribution,
  targetBuildingDist,
  sourceBuildingType,
  targetBuildingType,
  sourceItemId,
  targetItemId,
  buildingShare,
  targetBuildingCount,
  beltsNeeded,
  isDark,
  labelClass,
  dividerClass,
}: WiringDiagramSectionProps) {
  const [shown, setShown] = useState<DiagramSide | null>(null);
  const [feedingShown, setFeedingShown] = useState(false);

  // Feeding pattern when we have target building distribution
  const hasFeedingPattern = !!targetBuildingDist;
  const feedingPattern = targetBuildingDist ? computeFeedingPattern(targetBuildingDist) : null;
  const isFractionalRatio = targetBuildingDist ? !targetBuildingDist.buildingsPerTarget.isInteger() : false;
  const showFeeding = hasFeedingPattern && feedingPattern && (isFractionalRatio || feedingPattern.hasPartial);

  // Belt-based wiring diagrams
  const sourceHasSplit = distribution?.splitInfo != null;
  const targetHasSplit = targetDistribution?.splitInfo != null;
  const showBeltWiring = sourceHasSplit || targetHasSplit;

  if (!showFeeding && !showBeltWiring) return null;

  const hasBoth = sourceHasSplit && targetHasSplit;

  const toggle = (side: DiagramSide) => {
    setShown(prev => (prev === side ? null : side));
  };

  const singleSide: DiagramSide = sourceHasSplit ? 'source' : 'target';

  return (
    <>
      {showFeeding && feedingPattern && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <button
            type="button"
            className={`${labelClass} text-[11px] hover:underline flex items-center gap-0.5`}
            onClick={() => setFeedingShown(prev => !prev)}
          >
            <span className="text-[9px]">{feedingShown ? '▼' : '▶'}</span>
            Wiring pattern
          </button>
          {feedingShown && (
            <FeedingPatternSection
              pattern={feedingPattern}
              isFractionalRatio={isFractionalRatio}
              sourceBuildingType={sourceBuildingType}
              targetBuildingType={targetBuildingType}
              sourceItemId={sourceItemId}
              targetItemId={targetItemId}
              labelClass={labelClass}
            />
          )}
        </>
      )}
      {showBeltWiring && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className="flex items-center gap-2">
            {hasBoth ? (
              <>
                <button
                  type="button"
                  className={`${labelClass} text-[11px] hover:underline flex items-center gap-0.5`}
                  onClick={() => toggle('source')}
                >
                  <span className="text-[9px]">{shown === 'source' ? '▼' : '▶'}</span>
                  Source wiring
                </button>
                <span className={labelClass}>·</span>
                <button
                  type="button"
                  className={`${labelClass} text-[11px] hover:underline flex items-center gap-0.5`}
                  onClick={() => toggle('target')}
                >
                  <span className="text-[9px]">{shown === 'target' ? '▼' : '▶'}</span>
                  Target wiring
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${labelClass} text-[11px] hover:underline flex items-center gap-0.5`}
                onClick={() => toggle(singleSide)}
              >
                <span className="text-[9px]">{shown === singleSide ? '▼' : '▶'}</span>
                {showFeeding ? 'Collection wiring' : 'Show wiring'}
              </button>
            )}
          </div>
          {shown === 'source' && sourceHasSplit && buildingShare && (
            <WiringDiagram
              splitInfo={distribution!.splitInfo!}
              totalBuildings={Math.ceil(buildingShare.toNumber())}
              beltsNeeded={beltsNeeded}
              buildingType={sourceBuildingType}
              isDark={isDark}
            />
          )}
          {shown === 'target' && targetHasSplit && targetBuildingCount && (
            <WiringDiagram
              splitInfo={targetDistribution!.splitInfo!}
              totalBuildings={Math.ceil(targetBuildingCount.toNumber())}
              beltsNeeded={beltsNeeded}
              buildingType={targetBuildingType}
              isDark={isDark}
            />
          )}
        </>
      )}
    </>
  );
}

interface FeedingPatternSectionProps {
  pattern: ReturnType<typeof computeFeedingPattern>;
  isFractionalRatio: boolean;
  sourceBuildingType: string | null;
  targetBuildingType: string | null;
  sourceItemId?: string;
  targetItemId?: string;
  labelClass: string;
}

function FeedingPatternSection({
  pattern,
  isFractionalRatio,
  sourceBuildingType,
  targetBuildingType,
  sourceItemId,
  targetItemId,
  labelClass,
}: FeedingPatternSectionProps) {
  const srcIcon = sourceBuildingType ? (
    <BuildingIcon buildingType={sourceBuildingType as BuildingType} itemId={sourceItemId} size="sm" />
  ) : null;
  const { dedicatedPerTarget, sharedSources, targetPerGroup, groupCount, remainingTargets, hasPartial, partialTargetFraction, partialSourceCount } = pattern;

  // Target label prefix from item name
  const targetPrefix = targetItemId
    ? getShortItemLabel(targetItemId)
    : targetBuildingType ? targetBuildingType.charAt(0).toUpperCase() : 'T';

  const totalTargets = groupCount * targetPerGroup + remainingTargets + (hasPartial ? 1 : 0);
  const targetLabels = Array.from({ length: totalTargets }, (_, i) => `${targetPrefix} ${i + 1}`);

  // Splitter ratio text (e.g. "1:4 splitter")
  const splitterRatio = (numer: number, denom: number): string | null => {
    const g = gcd(numer, denom);
    const n = numer / g;
    const d = denom / g;
    if (d <= 1) return null;
    return n > 1 ? `1:${d} splitter — send ${n} of ${d}` : `1:${d} splitter`;
  };

  // Build a flat list of routing lines
  const lines: { label: string; fraction: string | null; note?: string; isLast: boolean; isBranch: boolean }[] = [];

  // Full groups
  for (let g = 0; g < groupCount; g++) {
    const start = g * targetPerGroup;
    const groupLabels = targetLabels.slice(start, start + targetPerGroup);
    for (const label of groupLabels) {
      if (dedicatedPerTarget > 0) {
        lines.push({
          label,
          fraction: dedicatedPerTarget > 1 ? `${dedicatedPerTarget}× dedicated` : 'dedicated',
          isBranch: true,
          isLast: false,
        });
      }
    }
    if (isFractionalRatio && sharedSources > 0) {
      const sharedLabel = groupLabels.length > 1 ? groupLabels.join(', ') : groupLabels[0];
      lines.push({
        label: sharedLabel,
        fraction: `${pattern.splitFraction} each`,
        note: splitterRatio(1, targetPerGroup) ?? undefined,
        isBranch: true,
        isLast: false,
      });
    }
  }

  // Remaining targets
  if (remainingTargets > 0) {
    const remOffset = groupCount * targetPerGroup;
    const remLabels = targetLabels.slice(remOffset, remOffset + remainingTargets);
    const fractionalPerTarget = sharedSources / targetPerGroup;
    for (const label of remLabels) {
      if (dedicatedPerTarget > 0) {
        lines.push({
          label,
          fraction: dedicatedPerTarget > 1 ? `${dedicatedPerTarget}× dedicated` : 'dedicated',
          isBranch: true,
          isLast: false,
        });
      }
      if (fractionalPerTarget > 0) {
        lines.push({
          label,
          fraction: formatFraction(fractionalPerTarget),
          note: splitterRatio(sharedSources, targetPerGroup) ?? undefined,
          isBranch: true,
          isLast: false,
        });
      }
    }
  }

  // Partial target
  if (hasPartial && partialTargetFraction && partialSourceCount) {
    const partialOffset = groupCount * targetPerGroup + remainingTargets;
    const partialLabel = targetLabels[partialOffset] ?? `${targetPrefix} ?`;
    const srcCount = partialSourceCount.isInteger()
      ? String(partialSourceCount.toNumber())
      : partialSourceCount.toDecimalString();
    lines.push({
      label: partialLabel,
      fraction: `${srcCount} (${String(partialTargetFraction.numerator)}/${String(partialTargetFraction.denominator)} capacity)`,
      note: 'remaining output',
      isBranch: true,
      isLast: true,
    });
  }

  // Mark last line
  if (lines.length > 0) {
    lines[lines.length - 1].isLast = true;
  }

  return (
    <div className="mt-1.5 text-[11px] font-mono">
      {/* Root: source icon with arrow */}
      <div className="flex items-center gap-1">
        {srcIcon}
        {sourceBuildingType === targetBuildingType && sourceItemId && (
          <span className={labelClass}>{getShortItemLabel(sourceItemId)}</span>
        )}
        <span className={labelClass}>→</span>
        {targetPerGroup > 1 && (
          <span className={labelClass}>{splitterRatio(1, targetPerGroup)}</span>
        )}
      </div>

      {/* Tree branches */}
      {lines.map((line, i) => (
        <div key={i} className="pl-2">
          <div className="flex items-center gap-1">
            <span className={labelClass}>{line.isLast ? '└─' : '├─'}</span>
            {line.fraction && <span>{line.fraction}</span>}
            <span>→</span>
            <span className="font-medium font-sans">{line.label}</span>
          </div>
          {line.note && (
            <div className={`${labelClass} italic pl-5`}>{line.note}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatFraction(value: number): string {
  // Common fractions for display
  const fractions: [number, string][] = [
    [0.5, '1/2'], [1/3, '1/3'], [2/3, '2/3'], [0.25, '1/4'], [0.75, '3/4'],
    [1/5, '1/5'], [2/5, '2/5'], [3/5, '3/5'], [4/5, '4/5'],
    [1/6, '1/6'], [5/6, '5/6'],
  ];
  for (const [num, str] of fractions) {
    if (Math.abs(value - num) < 1e-9) return str;
  }
  return parseFloat(value.toFixed(2)).toString();
}


interface WiringDiagramProps {
  splitInfo: { fullBuildings: number; splitNumerator: number; splitDenominator: number };
  totalBuildings: number;
  beltsNeeded: number;
  buildingType: string | null;
  isDark: boolean;
}

const BUILDING_SIZE = 16;

function WiringDiagram({ splitInfo, totalBuildings, beltsNeeded, buildingType, isDark }: WiringDiagramProps) {
  const { fullBuildings } = splitInfo;
  const sharedCount = totalBuildings - fullBuildings * beltsNeeded;

  const layout = computeWiringLayout(totalBuildings, beltsNeeded, fullBuildings, Math.max(0, sharedCount));
  const compressed = getCompressedInfo(fullBuildings);

  const buildingColor = buildingType
    ? BUILDING_COLORS[buildingType as BuildingType] ?? '#6B7280'
    : '#6B7280';

  const beltLineColor = isDark ? '#6B7280' : '#9CA3AF';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const mergeColor = isDark ? '#60A5FA' : '#3B82F6';
  const bgColor = isDark ? '#1F2937' : '#F9FAFB';

  // Building initial letter
  const buildingInitial = buildingType
    ? buildingType.charAt(0).toUpperCase()
    : 'B';

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={Math.min(layout.width, 280)}
      height={Math.min(layout.height, 280 * (layout.height / layout.width))}
      className="mt-1"
      role="img"
      aria-label="Belt wiring diagram"
    >
      <rect width={layout.width} height={layout.height} fill={bgColor} rx="4" />

      {/* Belt rows */}
      {layout.belts.map((belt) => (
        <g key={belt.beltIndex}>
          {/* Belt label */}
          <text
            x={4}
            y={belt.y + 4}
            fill={labelColor}
            fontSize="9"
            fontFamily="monospace"
          >
            B{belt.beltIndex + 1}
          </text>

          {/* Belt line before buildings */}
          <line
            x1={24}
            y1={belt.y}
            x2={belt.buildings.length > 0 ? belt.buildings[0].x - 2 : belt.endX}
            y2={belt.y}
            stroke={beltLineColor}
            strokeWidth="1.5"
          />

          {/* Arrow tip at start */}
          <polygon
            points={`${26},${belt.y - 3} ${30},${belt.y} ${26},${belt.y + 3}`}
            fill={beltLineColor}
          />

          {/* Buildings */}
          {belt.buildings.map((building, i) => (
            <g key={i}>
              <rect
                x={building.x}
                y={building.y}
                width={BUILDING_SIZE}
                height={BUILDING_SIZE}
                rx="2"
                fill={buildingColor}
                opacity={0.85}
              />
              <text
                x={building.x + BUILDING_SIZE / 2}
                y={building.y + BUILDING_SIZE / 2 + 3}
                fill="white"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {buildingInitial}
              </text>
            </g>
          ))}

          {/* Compressed row ellipsis */}
          {compressed && (
            <text
              x={compressed.ellipsisX}
              y={belt.y + 4}
              fill={labelColor}
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              ···
            </text>
          )}

          {/* Belt line after buildings to merge zone or end */}
          {layout.mergeZone ? (
            <line
              x1={belt.endX - BUILDING_SIZE / 2}
              y1={belt.y}
              x2={layout.mergeZone.x}
              y2={belt.y}
              stroke={mergeColor}
              strokeWidth="1.5"
            />
          ) : (
            <>
              {/* End arrow */}
              <line
                x1={belt.endX - BUILDING_SIZE / 2}
                y1={belt.y}
                x2={belt.endX + 8}
                y2={belt.y}
                stroke={beltLineColor}
                strokeWidth="1.5"
              />
              <polygon
                points={`${belt.endX + 4},${belt.y - 3} ${belt.endX + 8},${belt.y} ${belt.endX + 4},${belt.y + 3}`}
                fill={beltLineColor}
              />
            </>
          )}
        </g>
      ))}

      {/* Compressed annotation: ×N */}
      {compressed && (
        <text
          x={compressed.ellipsisX}
          y={layout.height - 2}
          fill={labelColor}
          fontSize="8"
          fontFamily="monospace"
          textAnchor="middle"
        >
          ×{compressed.totalCount}
        </text>
      )}

      {/* Merge zone */}
      {layout.mergeZone && (
        <g>
          {/* Vertical bracket connecting belt endpoints */}
          <line
            x1={layout.mergeZone.x}
            y1={layout.belts[0].y}
            x2={layout.mergeZone.x}
            y2={layout.belts[layout.belts.length - 1].y}
            stroke={mergeColor}
            strokeWidth="1.5"
          />

          {/* Horizontal line from bracket to shared buildings */}
          <line
            x1={layout.mergeZone.x}
            y1={layout.height / 2}
            x2={layout.mergeZone.buildings[0].x - 2}
            y2={layout.height / 2}
            stroke={mergeColor}
            strokeWidth="1.5"
          />

          {/* Shared buildings */}
          {layout.mergeZone.buildings.map((building, i) => (
            <g key={i}>
              <rect
                x={building.x}
                y={building.y}
                width={BUILDING_SIZE}
                height={BUILDING_SIZE}
                rx="2"
                fill={buildingColor}
                opacity={0.5}
                stroke={buildingColor}
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <text
                x={building.x + BUILDING_SIZE / 2}
                y={building.y + BUILDING_SIZE / 2 + 3}
                fill={isDark ? '#D1D5DB' : '#374151'}
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {buildingInitial}
              </text>
            </g>
          ))}

          {/* "(shared)" label */}
          <text
            x={layout.mergeZone.buildings[0].x + BUILDING_SIZE / 2}
            y={layout.mergeZone.buildings[layout.mergeZone.buildings.length - 1].y + BUILDING_SIZE + 10}
            fill={labelColor}
            fontSize="7"
            fontFamily="monospace"
            textAnchor="middle"
          >
            (shared)
          </text>
        </g>
      )}
    </svg>
  );
}
