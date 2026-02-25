import { Rational } from '../core/math/rational';
import { getSplitInfo } from '../core/splitInfo';
import { fractionSimplicityScore } from '../core/RatioOptimizer';

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
}

export function SplitBadge({ count, variant = 'pill' }: SplitBadgeProps) {
  const info = getSplitInfo(count);
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

  if (variant === 'line') {
    return (
      <div
        className={`text-[10px] flex items-center gap-0.5 mt-0.5 ${lineStyles[tier]}`}
        title={info.tooltip}
      >
        <SplitIcon size={10} color={lineIconColors[tier]} />
        {info.shortLabel}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 text-xs px-1.5 py-0.5 rounded ml-1.5 ${pillStyles[tier]}`}
      style={pillBg ? { backgroundColor: pillBg } : undefined}
      title={info.tooltip}
    >
      <SplitIcon size={12} color={iconColors[tier]} />
      {info.shortLabel}
    </span>
  );
}
