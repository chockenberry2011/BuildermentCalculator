import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FlatNode } from '../../core/GraphFlattener';
import type { BlueprintOrientation } from '../../store/useStore';
import { BUILDINGS } from '../../data/buildings';
import { Rational } from '../../core/math/rational';
import { BuildingIcon } from '../BuildingIcon';
import { getItemColor } from '../../data/itemColors';
import { fractionSimplicityScore } from '../../core/RatioOptimizer';
import { getCountColor } from '../../core/countColor';
import { SplitBadge } from '../SplitBadge';
import { BadgePopover } from '../BadgePopover';
import { useZoomLevel, type ZoomLevel } from '../../hooks/useZoomLevel';

export interface BlueprintNodeData {
  flatNode: FlatNode;
  inputItemIds: string[];
  outputItemIds: string[];
  isDark: boolean;
  isRoot: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
  orientation?: BlueprintOrientation;
  [key: string]: unknown;
}

function formatCount(count: Rational): { text: string; isInteger: boolean } {
  const value = count.toNumber();
  const isInteger = count.isInteger() || Math.abs(value - Math.round(value)) < 0.001;
  if (isInteger) {
    return { text: Math.round(value).toString(), isInteger: true };
  }
  return { text: value.toFixed(2), isInteger: false };
}

function formatRate(rate: Rational): string {
  const value = rate.toNumber();
  if (Math.abs(value - Math.round(value)) < 0.01) {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
}

/** Compute handle positions based on orientation */
function getHandlePositions(orientation: BlueprintOrientation): {
  inputPos: Position;
  outputPos: Position;
  /** CSS property to distribute handles along (top for Left/Right, left for Top/Bottom) */
  spreadProp: 'top' | 'left';
} {
  if (orientation === 'vertical') {
    return { inputPos: Position.Top, outputPos: Position.Bottom, spreadProp: 'left' };
  }
  return { inputPos: Position.Left, outputPos: Position.Right, spreadProp: 'top' };
}

function NodeHandles({
  inputItemIds,
  outputItemIds,
  accentColor,
  isDark,
  size,
  borderWidth,
  orientation,
}: {
  inputItemIds: string[];
  outputItemIds: string[];
  accentColor: string;
  isDark: boolean;
  size: number;
  borderWidth: number;
  orientation: BlueprintOrientation;
}) {
  const { inputPos, outputPos, spreadProp } = getHandlePositions(orientation);
  const borderColor = borderWidth > 0 ? (isDark ? '#1F2937' : '#F3F4F6') : undefined;
  const border = borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none';

  return (
    <>
      {inputItemIds.map((inputId, i) => (
        <Handle
          key={`target-${inputId}`}
          type="target"
          position={inputPos}
          id={inputId}
          style={{
            [spreadProp]: `${((i + 1) / (inputItemIds.length + 1)) * 100}%`,
            background: accentColor,
            width: size,
            height: size,
            border,
          }}
        />
      ))}
      {outputItemIds.map((consumerId, i) => (
        <Handle
          key={`source-${consumerId}`}
          type="source"
          position={outputPos}
          id={`out-${consumerId}`}
          style={{
            [spreadProp]: `${((i + 1) / (outputItemIds.length + 1)) * 100}%`,
            background: accentColor,
            width: size,
            height: size,
            border,
          }}
        />
      ))}
    </>
  );
}

function MiniNodePopoverContent({
  flatNode,
  isDark,
}: {
  flatNode: FlatNode;
  isDark: boolean;
}) {
  const building = flatNode.building;
  const buildingType = building?.buildingType ?? 'workshop';
  const buildingName = building ? (BUILDINGS[building.buildingType]?.name ?? '') : '';
  const count = building ? formatCount(building.count) : null;

  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';

  return (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-1">{flatNode.itemName}</div>
      <div className="flex justify-between">
        <span className={labelClass}>Rate</span>
        <span className="font-medium">{formatRate(flatNode.totalRate)}/min</span>
      </div>
      {count && (
        <>
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className="flex justify-between items-center">
            <span className={labelClass}>Building</span>
            <span className="font-medium flex items-center gap-1">
              <BuildingIcon buildingType={buildingType} size="sm" />
              {buildingName}
              {building && building.level > 1 ? ` Lv${building.level}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={labelClass}>Count</span>
            <span
              className="font-medium"
              style={{ color: getCountColor(fractionSimplicityScore(building!.count), isDark) }}
            >
              {count.text}x
            </span>
          </div>
        </>
      )}
      {flatNode.isRaw && (
        <>
          <div className={`border-t my-1.5 ${dividerClass}`} />
          <div className={`text-xs ${labelClass} italic`}>Raw resource</div>
        </>
      )}
    </div>
  );
}

function MiniNode({
  flatNode,
  accentColor,
  inputItemIds,
  outputItemIds,
  isDark,
  orientation,
}: {
  flatNode: FlatNode;
  accentColor: string;
  inputItemIds: string[];
  outputItemIds: string[];
  isDark: boolean;
  orientation: BlueprintOrientation;
}) {
  return (
    <BadgePopover
      isDark={isDark}
      tooltipContent={flatNode.itemName}
      popoverContent={<MiniNodePopoverContent flatNode={flatNode} isDark={isDark} />}
    >
      <div
        className="rounded-full pointer-events-auto"
        style={{
          width: 60,
          height: 24,
          backgroundColor: accentColor,
          opacity: 0.9,
        }}
      >
        <NodeHandles
          inputItemIds={inputItemIds}
          outputItemIds={outputItemIds}
          accentColor={accentColor}
          isDark={isDark}
          size={4}
          borderWidth={0}
          orientation={orientation}
        />
      </div>
    </BadgePopover>
  );
}

function CompactNode({
  flatNode,
  accentColor,
  inputItemIds,
  outputItemIds,
  isDark,
  isRoot,
  isSelected,
  orientation,
}: {
  flatNode: FlatNode;
  accentColor: string;
  inputItemIds: string[];
  outputItemIds: string[];
  isDark: boolean;
  isRoot: boolean;
  isSelected: boolean;
  orientation: BlueprintOrientation;
}) {
  const building = flatNode.building;
  const count = building ? formatCount(building.count) : null;
  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const borderClass = isSelected
    ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent'
    : isRoot
      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent'
      : '';

  return (
    <div
      className={`rounded-md shadow-md ${bgColor} ${borderClass} overflow-hidden`}
      style={{
        width: 140,
        height: 40,
        border: `1px solid ${isDark ? '#374151' : '#D1D5DB'}`,
      }}
    >
      <div className="h-0.5" style={{ backgroundColor: accentColor }} />
      <div className="px-2 py-1 flex items-center gap-1.5">
        <span className={`font-bold text-xs ${textColor} truncate flex-1`}>
          {flatNode.itemName}
        </span>
        {count && (
          <span
            className="text-xs font-semibold shrink-0"
            style={{ color: getCountColor(fractionSimplicityScore(building!.count), isDark) }}
          >
            {count.text}x
          </span>
        )}
      </div>
      <NodeHandles
        inputItemIds={inputItemIds}
        outputItemIds={outputItemIds}
        accentColor={accentColor}
        isDark={isDark}
        size={6}
        borderWidth={1}
        orientation={orientation}
      />
    </div>
  );
}

function FullNode({
  flatNode,
  accentColor,
  inputItemIds,
  outputItemIds,
  isDark,
  isRoot,
  isSelected,
  orientation,
}: {
  flatNode: FlatNode;
  accentColor: string;
  inputItemIds: string[];
  outputItemIds: string[];
  isDark: boolean;
  isRoot: boolean;
  isSelected: boolean;
  orientation: BlueprintOrientation;
}) {
  const building = flatNode.building;
  const buildingType = building?.buildingType ?? 'workshop';
  const buildingName = building ? (BUILDINGS[building.buildingType]?.name ?? '') : '';
  const count = building ? formatCount(building.count) : null;

  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isSelected
    ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent'
    : isRoot
      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent'
      : '';

  return (
    <div
      className={`rounded-lg shadow-lg ${bgColor} ${borderClass} min-w-[170px] max-w-[200px] overflow-hidden`}
      style={{ border: `1px solid ${isDark ? '#374151' : '#D1D5DB'}` }}
    >
      {/* Accent bar */}
      <div className="h-1" style={{ backgroundColor: accentColor }} />

      <div className="px-3 py-2">
        {/* Item name */}
        <div className={`font-bold text-sm ${textColor} truncate`}>
          {flatNode.itemName}
        </div>

        {/* Rate */}
        <div className={`text-xs ${subtextColor}`}>
          {formatRate(flatNode.totalRate)}/min
        </div>

        {/* Building info */}
        {count && (
          <div className={`mt-1.5 pt-1 flex items-center gap-1.5 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <BuildingIcon buildingType={buildingType} size="md" />
            <span
              className="text-sm font-semibold"
              style={{ color: getCountColor(fractionSimplicityScore(building!.count), isDark) }}
            >
              {count.text}x
            </span>
            <span className={`text-xs ${subtextColor}`}>
              {buildingName}
              {building && building.level > 1 ? ` Lv${building.level}` : ''}
            </span>
          </div>
        )}
        {count && !count.isInteger && (
          <SplitBadge count={building!.count} variant="line" isDark={isDark} />
        )}
      </div>

      <NodeHandles
        inputItemIds={inputItemIds}
        outputItemIds={outputItemIds}
        accentColor={accentColor}
        isDark={isDark}
        size={8}
        borderWidth={2}
        orientation={orientation}
      />
    </div>
  );
}

export const BlueprintNode = memo(function BlueprintNode({ data }: NodeProps) {
  const { flatNode, inputItemIds, outputItemIds, isDark, isRoot, isDimmed, isSelected, orientation } = data as BlueprintNodeData;
  const accentColor = getItemColor(flatNode.itemId);
  const zoomLevel: ZoomLevel = useZoomLevel();
  const orient = orientation ?? 'horizontal';

  const dimStyle = isDimmed ? { opacity: 0.25, transition: 'opacity 0.2s' } : { transition: 'opacity 0.2s' };

  if (zoomLevel === 'mini') {
    return (
      <div style={dimStyle}>
        <MiniNode
          flatNode={flatNode}
          accentColor={accentColor}
          inputItemIds={inputItemIds}
          outputItemIds={outputItemIds}
          isDark={isDark}
          orientation={orient}
        />
      </div>
    );
  }

  if (zoomLevel === 'compact') {
    return (
      <div style={dimStyle}>
        <CompactNode
          flatNode={flatNode}
          accentColor={accentColor}
          inputItemIds={inputItemIds}
          outputItemIds={outputItemIds}
          isDark={isDark}
          isRoot={isRoot}
          isSelected={isSelected ?? false}
          orientation={orient}
        />
      </div>
    );
  }

  return (
    <div style={dimStyle}>
      <FullNode
        flatNode={flatNode}
        accentColor={accentColor}
        inputItemIds={inputItemIds}
        outputItemIds={outputItemIds}
        isDark={isDark}
        isRoot={isRoot}
        isSelected={isSelected ?? false}
        orientation={orient}
      />
    </div>
  );
});
