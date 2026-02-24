import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FlatNode } from '../../core/GraphFlattener';
import { BUILDINGS, BuildingType } from '../../data/buildings';
import { Rational } from '../../core/math/rational';

export interface BlueprintNodeData {
  flatNode: FlatNode;
  inputItemIds: string[];
  isDark: boolean;
  isRoot: boolean;
  [key: string]: unknown;
}

const BUILDING_COLORS: Record<BuildingType, string> = {
  extractor: '#3B82F6',        // blue
  workshop: '#6B7280',         // gray
  furnace: '#F97316',          // orange
  machine_shop: '#64748B',     // slate
  industrial_factory: '#A855F7', // purple
  manufacturer: '#6366F1',     // indigo
  forge: '#EF4444',            // red
  earth_teleporter: '#14B8A6', // teal
};

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
  const accentColor = BUILDING_COLORS[buildingType] ?? '#6B7280';
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
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className={`text-sm font-semibold ${count.isInteger ? 'text-green-400' : 'text-yellow-400'}`}>
              {count.text}x
            </span>
            <span className={`text-xs ${subtextColor}`}>
              {buildingName}
              {building && building.level > 1 ? ` Lv${building.level}` : ''}
            </span>
          </div>
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
