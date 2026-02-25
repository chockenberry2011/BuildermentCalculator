import { BeltConnection } from '../core/BeltCalculator';
import { Rational } from '../core/math/rational';
import { getBeltDistribution } from '../core/beltDistribution';
import { BeltIcon } from './BeltIcon';
import { BadgePopover } from './BadgePopover';

interface BeltBadgeProps {
  beltConnection: BeltConnection;
  buildingCount?: Rational;
  isDark: boolean;
}

export function BeltBadge({ beltConnection, buildingCount, isDark }: BeltBadgeProps) {
  const { status, beltsNeeded, utilization, throughputPerMinute } = beltConnection;

  // Only render for multi-belt or near-capacity (not 'ok')
  if (status === 'ok') return null;

  const isMultiBelt = status === 'multi-belt';

  const distribution =
    isMultiBelt && buildingCount
      ? getBeltDistribution(buildingCount, beltsNeeded)
      : null;

  const pillClass = isMultiBelt
    ? isDark
      ? 'bg-blue-900 text-blue-300'
      : 'bg-blue-100 text-blue-700'
    : isDark
      ? 'bg-yellow-900 text-yellow-300'
      : 'bg-yellow-100 text-yellow-700';

  const iconColor = isMultiBelt
    ? isDark ? '#93C5FD' : '#1D4ED8'
    : isDark ? '#FDE68A' : '#A16207';

  const utilizationPct = Math.round(utilization * 100);

  // Compact label
  const label = isMultiBelt ? `\u00D7${beltsNeeded}` : `${utilizationPct}%`;

  // Tooltip
  const tooltipText = `${beltsNeeded} belt${beltsNeeded > 1 ? 's' : ''} \u00B7 ${utilizationPct}%`;

  // Popover detail rows
  const throughputStr = `${throughputPerMinute.toNumber().toFixed(1)}/min`;

  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';

  const popoverContent = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">Belt Details</div>
      <div className="flex justify-between">
        <span className={labelClass}>Belts needed</span>
        <span className="font-medium">{beltsNeeded}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Utilization</span>
        <span className="font-medium">{utilizationPct}%</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Throughput</span>
        <span className="font-medium">{throughputStr}</span>
      </div>
      {distribution && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`${labelClass} mb-1`}>Distribution per belt</div>
          <div className="font-medium">{distribution.shortLabel}</div>
          {distribution.splitInfo && (
            <div className={`${labelClass} text-[11px]`}>
              {distribution.splitInfo.fullBuildings} full + {distribution.splitInfo.splitNumerator}/{distribution.splitInfo.splitDenominator} split
            </div>
          )}
        </>
      )}
    </div>
  );

  const pill = (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 text-xs px-1.5 py-0.5 rounded ml-1.5 ${pillClass}`}
    >
      <BeltIcon size={12} color={iconColor} />
      {label}
    </span>
  );

  return (
    <BadgePopover
      isDark={isDark}
      tooltipContent={tooltipText}
      popoverContent={popoverContent}
    >
      {pill}
    </BadgePopover>
  );
}
