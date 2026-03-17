import { memo } from 'react';
import { BuildingRequirement } from '../core/ProductionCalculator';
import { BUILDINGS } from '../data/buildings';
import { BadgePopover } from './BadgePopover';

function DownArrowIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className="inline-block flex-shrink-0"
      role="img"
      aria-label="lower level"
    >
      <title>lower level</title>
      <path
        d="M8 3v8M4 8l4 4 4-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LevelBadgeProps {
  building: BuildingRequirement;
  isDark?: boolean;
}

export const LevelBadge = memo(function LevelBadge({ building, isDark = false }: LevelBadgeProps) {
  if (building.level >= building.configuredLevel) return null;

  const buildingName = BUILDINGS[building.buildingType]?.name ?? building.buildingType;
  const optimizedCount = building.count.toNumber();
  const optimizedCountRounded = Math.round(optimizedCount);

  // Calculate what the count would be at the configured level
  const info = BUILDINGS[building.buildingType];
  const configuredMultiplier = info.speedMultipliers[Math.min(building.configuredLevel, info.maxLevel) - 1];
  const optimizedMultiplier = info.speedMultipliers[Math.min(building.level, info.maxLevel) - 1];
  const configuredCount = optimizedCount * (optimizedMultiplier / configuredMultiplier);

  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';

  const tooltipText = `Auto-optimized: Lv${building.level} (${optimizedCountRounded} building${optimizedCountRounded !== 1 ? 's' : ''})`;

  const popoverDetail = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">Auto-Optimized Level</div>
      <div className="flex justify-between">
        <span className={labelClass}>Configured</span>
        <span className="font-medium">Lv{building.configuredLevel} ({configuredCount.toFixed(2)}x buildings)</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Optimized</span>
        <span className="font-medium text-indigo-400">Lv{building.level} ({optimizedCountRounded}x building{optimizedCountRounded !== 1 ? 's' : ''})</span>
      </div>
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className={`text-xs ${labelClass}`}>
        Auto-optimized to Lv{building.level} {buildingName} for whole building count.
      </div>
    </div>
  );

  const pill = (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-indigo-500 text-white mt-1">
      <DownArrowIcon size={12} color="white" />
      Lv{building.level}
    </span>
  );

  return (
    <BadgePopover
      isDark={isDark}
      tooltipContent={tooltipText}
      popoverContent={popoverDetail}
    >
      {pill}
    </BadgePopover>
  );
});
