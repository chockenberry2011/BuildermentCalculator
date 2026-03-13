import { useState } from 'react';
import { computeWiringLayout, getCompressedInfo } from '../core/wiringLayout';
import { gcd } from '../core/math/gcd';
import { BUILDING_COLORS, BuildingIcon, BuildingIconSvg } from './BuildingIcon';
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
          <div className={`border-t my-1 ${dividerClass}`} />
          <button
            type="button"
            className={`${labelClass} text-[11px] hover:underline flex items-center gap-1`}
            onClick={() => setFeedingShown(prev => !prev)}
          >
            <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${feedingShown ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
              <path d="M2 1l4 3-4 3z" />
            </svg>
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
              isDark={isDark}
              beltsNeeded={beltsNeeded}
            />
          )}
        </>
      )}
      {showBeltWiring && (
        <>
          <div className={`border-t my-1 ${dividerClass}`} />
          <div className="flex items-center gap-2">
            {hasBoth ? (
              <>
                <button
                  type="button"
                  className={`${labelClass} text-[11px] hover:underline flex items-center gap-1`}
                  onClick={() => toggle('source')}
                >
                  <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${shown === 'source' ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
                    <path d="M2 1l4 3-4 3z" />
                  </svg>
                  Source wiring
                </button>
                <span className={labelClass}>·</span>
                <button
                  type="button"
                  className={`${labelClass} text-[11px] hover:underline flex items-center gap-1`}
                  onClick={() => toggle('target')}
                >
                  <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${shown === 'target' ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
                    <path d="M2 1l4 3-4 3z" />
                  </svg>
                  Target wiring
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${labelClass} text-[11px] hover:underline flex items-center gap-1`}
                onClick={() => toggle(singleSide)}
              >
                <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${shown === singleSide ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 8 8">
                  <path d="M2 1l4 3-4 3z" />
                </svg>
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
  isDark: boolean;
  beltsNeeded: number;
}

function FeedingPatternSection({
  pattern,
  isFractionalRatio,
  sourceBuildingType,
  targetBuildingType,
  sourceItemId,
  targetItemId,
  labelClass,
  isDark,
  beltsNeeded,
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

  // When groups align with belts, show simplified belt-level routing
  const beltAligned = beltsNeeded > 1 && groupCount === beltsNeeded && remainingTargets === 0 && !hasPartial;

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

  const connectorColor = isDark ? 'border-gray-600' : 'border-gray-300';
  const arrowColor = isDark ? 'text-blue-400' : 'text-blue-500';

  // Simplified belt-level rendering when groups align with belts
  if (beltAligned) {
    const targetsPerBelt = targetPerGroup;
    const beltSplitterLabel = targetsPerBelt > 1
      ? `1:${targetsPerBelt} splitter`
      : null;

    return (
      <div className="mt-1 text-[11px]">
        <div className="flex items-center gap-1.5 mb-0.5">
          {srcIcon}
          <span className={labelClass}>Per belt</span>
          <span className={arrowColor}>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M0 4h10M8 1.5L10.5 4 8 6.5" /></svg>
          </span>
          {beltSplitterLabel && (
            <span className={labelClass}>{beltSplitterLabel}</span>
          )}
        </div>
        <div className="relative ml-2">
          {Array.from({ length: beltsNeeded }, (_, beltIdx) => {
            const start = beltIdx * targetsPerBelt;
            const beltTargets = targetLabels.slice(start, start + targetsPerBelt);
            const isLastBelt = beltIdx === beltsNeeded - 1;
            return (
              <div key={beltIdx} className="relative flex items-start">
                {!isLastBelt && (
                  <div
                    className={`absolute left-1 top-0 bottom-0 border-l-2 ${connectorColor}`}
                    style={{ width: 0 }}
                  />
                )}
                {isLastBelt && (
                  <div
                    className={`absolute left-1 top-0 border-l-2 ${connectorColor}`}
                    style={{ width: 0, height: '12px' }}
                  />
                )}
                <div
                  className={`absolute left-1 top-2.5 border-t-2 ${connectorColor}`}
                  style={{ width: '10px' }}
                />
                <div className="pl-4 py-px">
                  <div className="flex items-center gap-1">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Belt {beltIdx + 1}</span>
                    <span className={arrowColor}>
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M0 3h8M6 1l2 2-2 2" /></svg>
                    </span>
                    <span className="font-medium">{beltTargets.join(', ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 text-[11px]">
      {/* Root: source icon with arrow */}
      <div className="flex items-center gap-1.5">
        {srcIcon}
        {sourceBuildingType === targetBuildingType && sourceItemId && (
          <span className={labelClass}>{getShortItemLabel(sourceItemId)}</span>
        )}
        <span className={arrowColor}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M0 4h10M8 1.5L10.5 4 8 6.5" /></svg>
        </span>
        {targetPerGroup > 1 && (
          <span className={labelClass}>{splitterRatio(1, targetPerGroup)}</span>
        )}
      </div>

      {/* Tree branches with CSS connectors */}
      <div className="relative ml-2">
        {lines.map((line, i) => (
          <div key={i} className="relative flex items-start">
            {/* Vertical connector line */}
            {!line.isLast && (
              <div
                className={`absolute left-1 top-0 bottom-0 border-l-2 ${connectorColor}`}
                style={{ width: 0 }}
              />
            )}
            {/* Partial vertical for last item */}
            {line.isLast && (
              <div
                className={`absolute left-1 top-0 border-l-2 ${connectorColor}`}
                style={{ width: 0, height: '12px' }}
              />
            )}
            {/* Horizontal stub */}
            <div
              className={`absolute left-1 top-2.5 border-t-2 ${connectorColor}`}
              style={{ width: '10px' }}
            />
            <div className="pl-4 py-px">
              <div className="flex items-center gap-1">
                {line.fraction && <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{line.fraction}</span>}
                <span className={arrowColor}>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M0 3h8M6 1l2 2-2 2" /></svg>
                </span>
                <span className="font-medium">{line.label}</span>
              </div>
              {line.note && (
                <div className={`${labelClass} italic text-[10px] ml-0.5`}>{line.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
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

const BUILDING_SIZE = 24;

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

  // Gradient ID for belt flow direction
  const gradientId = `belt-grad-${buildingType}-${beltsNeeded}`;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={Math.min(layout.width, 340)}
      height={Math.min(layout.height, 340 * (layout.height / layout.width))}
      className="mt-1.5"
      role="img"
      aria-label="Belt wiring diagram"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={beltLineColor} stopOpacity="0.4" />
          <stop offset="50%" stopColor={beltLineColor} stopOpacity="1" />
          <stop offset="100%" stopColor={beltLineColor} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width={layout.width} height={layout.height} fill={bgColor} rx="6" />

      {/* Belt rows */}
      {layout.belts.map((belt) => (
        <g key={belt.beltIndex}>
          {/* Belt label */}
          <text
            x={6}
            y={belt.y + 4}
            fill={labelColor}
            fontSize="11"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="500"
          >
            B{belt.beltIndex + 1}
          </text>

          {/* Belt line before buildings */}
          <line
            x1={30}
            y1={belt.y}
            x2={belt.buildings.length > 0 ? belt.buildings[0].x - 3 : belt.endX}
            y2={belt.y}
            stroke={`url(#${gradientId})`}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Arrow tip at start */}
          <polygon
            points={`${33},${belt.y - 3.5} ${38},${belt.y} ${33},${belt.y + 3.5}`}
            fill={beltLineColor}
          />

          {/* Buildings — use BuildingIconSvg for actual shapes */}
          {belt.buildings.map((building, i) => (
            <g key={i}>
              <rect
                x={building.x}
                y={building.y}
                width={BUILDING_SIZE}
                height={BUILDING_SIZE}
                rx="4"
                fill={buildingColor}
                opacity={0.9}
              />
              {buildingType && (
                <BuildingIconSvg
                  buildingType={buildingType as BuildingType}
                  x={building.x + 4}
                  y={building.y + 4}
                  size={BUILDING_SIZE - 8}
                />
              )}
            </g>
          ))}

          {/* Compressed row ellipsis */}
          {compressed && (
            <text
              x={compressed.ellipsisX}
              y={belt.y + 4}
              fill={labelColor}
              fontSize="12"
              fontFamily="Inter, system-ui, sans-serif"
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
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <>
              {/* End arrow */}
              <line
                x1={belt.endX - BUILDING_SIZE / 2}
                y1={belt.y}
                x2={belt.endX + 10}
                y2={belt.y}
                stroke={beltLineColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polygon
                points={`${belt.endX + 6},${belt.y - 3.5} ${belt.endX + 10},${belt.y} ${belt.endX + 6},${belt.y + 3.5}`}
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
          y={layout.height - 3}
          fill={labelColor}
          fontSize="10"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
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
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Horizontal line from bracket to shared buildings */}
          <line
            x1={layout.mergeZone.x}
            y1={layout.height / 2}
            x2={layout.mergeZone.buildings[0].x - 3}
            y2={layout.height / 2}
            stroke={mergeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Shared buildings — solid fill at reduced opacity with glow */}
          {layout.mergeZone.buildings.map((building, i) => (
            <g key={i}>
              <rect
                x={building.x - 1}
                y={building.y - 1}
                width={BUILDING_SIZE + 2}
                height={BUILDING_SIZE + 2}
                rx="5"
                fill={mergeColor}
                opacity={0.15}
              />
              <rect
                x={building.x}
                y={building.y}
                width={BUILDING_SIZE}
                height={BUILDING_SIZE}
                rx="4"
                fill={buildingColor}
                opacity={0.55}
              />
              {buildingType && (
                <BuildingIconSvg
                  buildingType={buildingType as BuildingType}
                  x={building.x + 4}
                  y={building.y + 4}
                  size={BUILDING_SIZE - 8}
                />
              )}
            </g>
          ))}

          {/* Merge icon instead of "(shared)" text */}
          <g transform={`translate(${layout.mergeZone.buildings[0].x + BUILDING_SIZE / 2 - 6}, ${layout.mergeZone.buildings[layout.mergeZone.buildings.length - 1].y + BUILDING_SIZE + 6})`}>
            <path
              d="M0 6 L6 0 L12 6 M6 0 L6 10"
              fill="none"
              stroke={mergeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
