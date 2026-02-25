import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FlatNode } from '../../core/GraphFlattener';
import { BUILDINGS } from '../../data/buildings';
import { Rational } from '../../core/math/rational';
import { BuildingIcon } from '../BuildingIcon';
import { getItemColor } from '../../data/itemColors';
import { fractionSimplicityScore } from '../../core/RatioOptimizer';
import { getCountColor } from '../../core/countColor';
import { SplitBadge } from '../SplitBadge';

export interface BlueprintNodeData {
  flatNode: FlatNode;
  inputItemIds: string[];
  isDark: boolean;
  isRoot: boolean;
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

export const BlueprintNode = memo(function BlueprintNode({ data }: NodeProps) {
  const { flatNode, inputItemIds, isDark, isRoot } = data as BlueprintNodeData;
  const building = flatNode.building;
  const buildingType = building?.buildingType ?? 'workshop';
  const accentColor = getItemColor(flatNode.itemId);
  const buildingName = building ? (BUILDINGS[building.buildingType]?.name ?? '') : '';
  const count = building ? formatCount(building.count) : null;

  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isRoot
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
          <SplitBadge count={building!.count} variant="line" />
        )}
      </div>

      {/* Input handles (left side) */}
      {inputItemIds.map((inputId, i) => (
        <Handle
          key={`target-${inputId}`}
          type="target"
          position={Position.Left}
          id={inputId}
          style={{
            top: `${((i + 1) / (inputItemIds.length + 1)) * 100}%`,
            background: accentColor,
            width: 8,
            height: 8,
            border: `2px solid ${isDark ? '#1F2937' : '#F3F4F6'}`,
          }}
        />
      ))}

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id={flatNode.itemId}
        style={{
          top: '50%',
          background: accentColor,
          width: 8,
          height: 8,
          border: `2px solid ${isDark ? '#1F2937' : '#F3F4F6'}`,
        }}
      />
    </div>
  );
});
