import { useState } from 'react';
import { computeWiringLayout, getCompressedInfo } from '../core/wiringLayout';
import { BUILDING_COLORS } from './BuildingIcon';
import type { BeltDistribution } from '../core/beltDistribution';
import type { Rational } from '../core/math/rational';
import type { BuildingType } from '../data/buildings';

interface WiringDiagramSectionProps {
  distribution: BeltDistribution | null;
  targetDistribution: BeltDistribution | null;
  sourceBuildingType: string | null;
  targetBuildingType: string | null;
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
  sourceBuildingType,
  targetBuildingType,
  buildingShare,
  targetBuildingCount,
  beltsNeeded,
  isDark,
  labelClass,
  dividerClass,
}: WiringDiagramSectionProps) {
  const [shown, setShown] = useState<DiagramSide | null>(null);

  const sourceHasSplit = distribution?.splitInfo != null;
  const targetHasSplit = targetDistribution?.splitInfo != null;

  if (!sourceHasSplit && !targetHasSplit) return null;

  const hasBoth = sourceHasSplit && targetHasSplit;

  const toggle = (side: DiagramSide) => {
    setShown(prev => (prev === side ? null : side));
  };

  // Determine which side to use when there's only one
  const singleSide: DiagramSide = sourceHasSplit ? 'source' : 'target';

  return (
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
            Show wiring
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
  );
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
