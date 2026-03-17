import { memo } from 'react';
import { Rational } from '../core/math/rational';
import { getSplitInfo } from '../core/splitInfo';
import { fractionSimplicityScore } from '../core/RatioOptimizer';
import { isPowerOf2 } from '../core/math/gcd';
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
  autoRegulated?: boolean;
}

export const SplitBadge = memo(function SplitBadge({ count, variant = 'pill', isDark = false, autoRegulated = false }: SplitBadgeProps) {
  const info = getSplitInfo(count);
  if (!info) return null;

  const score = fractionSimplicityScore(count);

  // Good (≥0.60): green Apply button style
  // Decent (≥0.40): green chip style (dark green bg, green text)
  // Bad (<0.40): battery red bg, white text
  const tier = score >= 0.60 ? 'good' : score >= 0.40 ? 'decent' : 'bad';

  const pillStyles = autoRegulated
    ? {
        good:   'border border-green-600 text-green-400 bg-transparent',
        decent: 'border border-green-700 text-green-500 bg-transparent',
        bad:    'border border-red-500 text-red-400 bg-transparent',
      }
    : {
        good:   'bg-green-600 text-white',
        decent: 'bg-green-900/40 text-green-300',
        bad:    'text-white',
      };
  const pillBg = !autoRegulated && tier === 'bad' ? '#DC2626' : undefined;
  const iconColors = autoRegulated
    ? { good: 'rgb(74,222,128)', decent: 'rgb(34,197,94)', bad: 'rgb(248,113,113)' }
    : { good: 'white', decent: 'rgb(134,239,172)', bad: 'white' };
  const lineStyles = autoRegulated
    ? { good: 'text-green-600', decent: 'text-green-700', bad: 'text-red-600' }
    : { good: 'text-green-400', decent: 'text-green-300', bad: 'text-red-400' };
  const lineIconColors = autoRegulated
    ? { good: 'rgb(22,163,74)', decent: 'rgb(21,128,61)', bad: 'rgb(220,38,38)' }
    : { good: 'rgb(74,222,128)', decent: 'rgb(134,239,172)', bad: 'rgb(248,113,113)' };

  // Shared popover content for both variants
  const qualityLabel = getQualityLabel(score);
  const qualityColor = getCountColor(score, isDark);
  const dividerClass = isDark ? 'border-gray-600' : 'border-gray-200';
  const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';

  const tooltipText = `Build ${info.actualBuildings}: ${info.fullBuildings} at full rate, 1 at ${info.splitNumerator}/${info.splitDenominator} input`;

  const popoverDetail = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2">
        Split Details{autoRegulated ? ' (auto)' : ''}
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Actual buildings</span>
        <span className="font-medium">{info.actualBuildings}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Full rate</span>
        <span className="font-medium">{info.fullBuildings}</span>
      </div>
      <div className="flex justify-between">
        <span className={labelClass}>Partial input</span>
        <span className="font-medium">{info.splitNumerator}/{info.splitDenominator} feed</span>
      </div>
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className="flex justify-between items-center">
        <span className={labelClass}>Simplicity</span>
        <span className="font-medium" style={{ color: qualityColor }}>{qualityLabel}</span>
      </div>
      <div className={`border-t my-2 ${dividerClass}`} />
      <div className={`rounded-md px-2 py-1.5 ${isDark ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-center gap-1.5">
          <SplitIcon size={12} color={isDark ? '#60A5FA' : '#3B82F6'} />
          <span className={`font-semibold text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            Use a 1:{info.splitDenominator} splitter
          </span>
        </div>
        {info.splitNumerator > 1 && (
          <div className={`text-xs mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Route {info.splitNumerator} of {info.splitDenominator} outputs to partial building
          </div>
        )}
        {isPowerOf2(info.splitDenominator) && info.splitDenominator > 2 && (
          <div className={`text-xs mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Cascade {Math.log2(info.splitDenominator)} stages of 1:2 splitters
          </div>
        )}
      </div>
      {autoRegulated && (
        <>
          <div className={`border-t my-2 ${dividerClass}`} />
          <div className={`text-xs ${labelClass} italic`}>
            Input regulated by upstream — may not need a dedicated input splitter
          </div>
        </>
      )}
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
});
