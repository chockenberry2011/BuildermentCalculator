import { Rational } from '../core/math/rational';
import { getSplitInfo } from '../core/splitInfo';
import { fractionSimplicityScore } from '../core/RatioOptimizer';
import { getQualityLabel, getCountColor } from '../core/countColor';
import { BadgePopover } from './BadgePopover';

interface SplitIconProps {
  size?: number;
  color?: string;
}

function SplitIcon({ size = 12, color = 'currentColor' }: SplitIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className="inline-block flex-shrink-0"
      role="img"
      aria-label="splitter"
    >
      <title>splitter</title>
      {/* Trunk */}
      <line x1="2" y1="8" x2="9" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Upper fork */}
      <line x1="9" y1="8" x2="14" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Lower fork */}
      <line x1="9" y1="8" x2="14" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface SplitBadgeProps {
  count: Rational;
  variant?: 'pill' | 'line';
  isDark?: boolean;
  outputQuantity?: number;
}

export function SplitBadge({ count, variant = 'pill', isDark = false, outputQuantity }: SplitBadgeProps) {
  const info = getSplitInfo(count, outputQuantity);
  if (!info) return null;

  const score = fractionSimplicityScore(count);

  // Good (≥0.60): green Apply button style
  // Decent (≥0.40): green chip style (dark green bg, green text)
  // Bad (<0.40): battery red bg, white text
  const tier = score >= 0.60 ? 'good' : score >= 0.40 ? 'decent' : 'bad';

  const pillStyles = {
    good:   'bg-green-600 text-white',
    decent: 'bg-green-900/40 text-green-300',
    bad:    'text-white',
  };
  const pillBg = tier === 'bad' ? '#DC2626' : undefined;
  const iconColors = { good: 'white', decent: 'rgb(134,239,172)', bad: 'white' };
  const lineStyles = { good: 'text-green-400', decent: 'text-green-300', bad: 'text-red-400' };
  const lineIconColors = { good: 'rgb(74,222,128)', decent: 'rgb(134,239,172)', bad: 'rgb(248,113,113)' };

  // Shared popover content for both variants
  const qualityLabel = getQualityLabel(score);
  const qualityColor = getCountColor(score, isDark);
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';

  const batchSuffix = outputQuantity && outputQuantity > 1 ? ` (batch of ${outputQuantity})` : '';
  const tooltipText = `Build ${info.actualBuildings}: ${info.fullBuildings} full + 1 splits ${info.splitNumerator}/${info.splitDenominator}${batchSuffix}`;

  const popoverDetail = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">Split Details</div>
      <div className="flex justify-between">
        <span className={labelClass}>Actual buildings</span>
        <span className="font-medium">{info.actualBuildings}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Full output</span>
        <span className="font-medium">{info.fullBuildings}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Split ratio</span>
        <span className="font-medium">{info.splitNumerator}/{info.splitDenominator}</span>
      </div>
      {outputQuantity && outputQuantity > 1 && (
        <div className="flex justify-between">
          <span className={labelClass}>Batch size</span>
          <span className="font-medium">{outputQuantity} per craft</span>
        </div>
      )}
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className="flex justify-between items-center">
        <span className={labelClass}>Simplicity</span>
        <span className="font-medium" style={{ color: qualityColor }}>{qualityLabel}</span>
      </div>
    </div>
  );

  // Line variant — compact inline with popover
  if (variant === 'line') {
    const lineContent = (
      <div
        className={`text-[10px] flex items-center gap-0.5 mt-0.5 ${lineStyles[tier]}`}
      >
        <SplitIcon size={10} color={lineIconColors[tier]} />
        {info.shortLabel}
      </div>
    );

    return (
      <BadgePopover
        isDark={isDark}
        tooltipContent={tooltipText}
        popoverContent={popoverDetail}
      >
        {lineContent}
      </BadgePopover>
    );
  }

  // Pill variant — compact with popover
  const compactLabel = info.shortLabel;

  const pill = (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded mt-1 ${pillStyles[tier]}`}
      style={pillBg ? { backgroundColor: pillBg } : undefined}
    >
      <SplitIcon size={12} color={iconColors[tier]} />
      {compactLabel}
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
}
