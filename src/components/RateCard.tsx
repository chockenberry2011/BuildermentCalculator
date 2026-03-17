import { useEffect, useState } from 'react';
import {
  PracticalOptimum,
  describeFractionQuality,
} from '../core/RatioOptimizer';

function formatRate(rate: number): string {
  if (Number.isInteger(rate)) {
    return rate.toString();
  }
  return rate.toFixed(2).replace(/\.?0+$/, '');
}

export type ColorScheme = 'green' | 'amber';

export const colorStyles = {
  green: {
    active: { dark: 'bg-green-900/40 border-green-500', light: 'bg-green-50 border-green-500' },
    inactive: { dark: 'bg-green-900/20 border-green-600', light: 'bg-green-50/50 border-green-300' },
    icon: 'text-green-400',
    badge: { dark: 'bg-green-800 text-green-300', light: 'bg-green-100 text-green-700' },
    button: { dark: 'bg-green-600 hover:bg-green-500 text-white', light: 'bg-green-500 hover:bg-green-600 text-white' },
    chip: { dark: 'bg-green-900/40 text-green-300 hover:bg-green-800/60', light: 'bg-green-100 text-green-700 hover:bg-green-200' },
  },
  amber: {
    active: { dark: 'bg-amber-900/40 border-amber-500', light: 'bg-amber-50 border-amber-500' },
    inactive: { dark: 'bg-amber-900/20 border-amber-600', light: 'bg-amber-50/50 border-amber-300' },
    icon: 'text-amber-400',
    badge: { dark: 'bg-amber-800 text-amber-300', light: 'bg-amber-100 text-amber-700' },
    button: { dark: 'bg-amber-600 hover:bg-amber-500 text-white', light: 'bg-amber-500 hover:bg-amber-600 text-white' },
    chip: { dark: 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/60', light: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  },
};

export interface RateCardProps {
  optimum: PracticalOptimum;
  title: string;
  icon: string;
  colorScheme: ColorScheme;
  isActive: boolean;
  onApply: () => void;
  onApplyDoubling: (rate: number) => void;
  isDark: boolean;
  showCombinedBadges?: boolean;
  currentRate?: number;
  currentExtractorCount?: number;
}

function DeltaBadge({ value, unit, isDark }: { value: number; unit: string; isDark: boolean }) {
  if (Math.abs(value) < 0.01) return null;
  const isPositive = value > 0;
  const formatted = (isPositive ? '+' : '') + (Number.isInteger(value) ? value.toString() : value.toFixed(1));
  return (
    <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded font-medium ${
      isPositive
        ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
        : isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
    }`}>
      {formatted} {unit}
    </span>
  );
}

export function RateCard({
  optimum,
  title,
  icon,
  colorScheme,
  isActive,
  onApply,
  onApplyDoubling,
  isDark,
  showCombinedBadges,
  currentRate,
  currentExtractorCount,
}: RateCardProps) {
  const [selectedDoubling, setSelectedDoubling] = useState<PracticalOptimum | null>(null);

  // Detect if currentRate matches a doubling → promote it to primary
  const activeDoubling = optimum.doublings.find(
    (d) => currentRate !== undefined && Math.abs(currentRate - d.rate) < 0.001
  );
  const isCardActive = isActive || !!activeDoubling;

  // The effective primary: active doubling (if current rate matches one) or the base optimum
  const effective = activeDoubling ?? optimum;

  // Build "scales to" list: swap out the active doubling, include base if a doubling is active
  const scalesTo = activeDoubling
    ? [optimum, ...optimum.doublings.filter((d) => d !== activeDoubling)]
    : optimum.doublings;

  // Clear selection when card becomes active or optimum changes
  useEffect(() => {
    setSelectedDoubling(null);
  }, [isCardActive, optimum]);

  const colors = colorStyles[colorScheme];
  const mode = isDark ? 'dark' : 'light';

  // When a chip is selected, the card previews its values; otherwise show effective
  const display = selectedDoubling ?? effective;
  const fractionLabel = describeFractionQuality(display.rationalBuildingCounts);

  // Compute deltas vs current state
  const rateDelta = currentRate !== undefined ? display.rate - currentRate : 0;
  const extDelta = currentExtractorCount !== undefined ? display.extractorCost.total - currentExtractorCount : 0;

  return (
    <div
      className={`p-2 sm:p-2.5 rounded-lg border transition-all ${
        isCardActive ? colors.active[mode] : colors.inactive[mode]
      }`}
      style={{
        backgroundImage: isCardActive
          ? `linear-gradient(135deg, ${colorScheme === 'green' ? 'rgba(34,197,94,0.05)' : 'rgba(245,158,11,0.05)'}, transparent)`
          : undefined,
      }}
    >
      {/* Mobile: compact stacked layout | Desktop: horizontal layout */}

      {/* Title row */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <span className={`${colors.icon} text-sm flex-shrink-0`}>{icon}</span>
        <span className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </span>
        {/* Desktop: rate inline with title */}
        <span className={`hidden sm:inline font-mono text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {formatRate(display.rate)}/min
        </span>
        {/* Desktop: action inline */}
        <span className="hidden sm:flex flex-1" />
        {isCardActive && !selectedDoubling ? (
          <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded flex-shrink-0 ${colors.badge[mode]}`}>
            current
          </span>
        ) : (
          <button
            onClick={() => {
              if (selectedDoubling) {
                onApplyDoubling(selectedDoubling.rate);
                setSelectedDoubling(null);
              } else {
                onApply();
              }
            }}
            className={`hidden sm:inline text-xs px-3 py-1 rounded transition font-medium flex-shrink-0 hover:scale-[1.02] ${colors.button[mode]}`}
          >
            Apply{selectedDoubling ? ` ${formatRate(selectedDoubling.rate)}/min` : ''}
          </button>
        )}
      </div>

      {/* Mobile: rate on its own line */}
      <div className={`sm:hidden font-mono text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {formatRate(display.rate)}/min
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1 mt-1 sm:mt-1.5">
        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
        }`}>
          {display.extractorCost.total} ext
        </span>
        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${colors.badge[mode]}`}>
          {fractionLabel}
        </span>
        {display.candidate.allBeltsClean && (
          <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
            isDark ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
          }`}>
            <span className="sm:hidden">belts</span>
            <span className="hidden sm:inline">clean belts</span>
          </span>
        )}
        {showCombinedBadges && display.allInteger && (
          <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
            isDark ? 'bg-green-800 text-green-300' : 'bg-green-100 text-green-700'
          }`}>
            <span className="sm:hidden">perfect</span>
            <span className="hidden sm:inline">perfect ratio</span>
          </span>
        )}
        {!isCardActive && <DeltaBadge value={rateDelta} unit="/min" isDark={isDark} />}
        {!isCardActive && <DeltaBadge value={extDelta} unit="ext" isDark={isDark} />}
      </div>

      {/* Mobile: action button/badge below badges */}
      <div className="sm:hidden mt-1.5">
        {isCardActive && !selectedDoubling ? (
          <span className={`text-xs px-2 py-0.5 rounded ${colors.badge[mode]}`}>
            current
          </span>
        ) : (
          <button
            onClick={() => {
              if (selectedDoubling) {
                onApplyDoubling(selectedDoubling.rate);
                setSelectedDoubling(null);
              } else {
                onApply();
              }
            }}
            className={`text-xs px-3 py-1 rounded transition font-medium w-full hover:scale-[1.02] ${colors.button[mode]}`}
          >
            Apply{selectedDoubling ? ` ${formatRate(selectedDoubling.rate)}/min` : ''}
          </button>
        )}
      </div>

      {/* Doublings */}
      {scalesTo.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <span className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Scales to</span>
            {scalesTo.map((d) => {
              const isSelected = selectedDoubling?.rate === d.rate;
              return (
                <button
                  key={d.rate}
                  onClick={() => setSelectedDoubling(isSelected ? null : d)}
                  className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded transition ${
                    isSelected
                      ? `ring-1 ${colorScheme === 'green'
                          ? isDark ? 'ring-green-400 bg-green-800/60 text-green-200' : 'ring-green-500 bg-green-200 text-green-800'
                          : isDark ? 'ring-amber-400 bg-amber-800/60 text-amber-200' : 'ring-amber-500 bg-amber-200 text-amber-800'
                        }`
                      : colors.chip[mode]
                  }`}
                >
                  {formatRate(d.rate)}<span className="hidden sm:inline">/min</span>
                </button>
              );
            })}
          </div>

          {/* Comparison panel when previewing a doubling */}
          {selectedDoubling && (
            <ComparisonPanel
              current={effective}
              preview={selectedDoubling}
              isDark={isDark}
              onDismiss={() => setSelectedDoubling(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function ComparisonPanel({
  current,
  preview,
  isDark,
  onDismiss,
}: {
  current: PracticalOptimum;
  preview: PracticalOptimum;
  isDark: boolean;
  onDismiss: () => void;
}) {
  const currentSplits = describeFractionQuality(current.rationalBuildingCounts);
  const previewSplits = describeFractionQuality(preview.rationalBuildingCounts);
  const splitsChanged = currentSplits !== previewSplits;

  const currentBelts = current.candidate.allBeltsClean;
  const previewBelts = preview.candidate.allBeltsClean;
  const beltsChanged = currentBelts !== previewBelts;

  const arrowColor = isDark ? 'text-gray-500' : 'text-gray-400';
  const labelColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const valueColor = isDark ? 'text-gray-200' : 'text-gray-700';

  return (
    <div className={`mt-1.5 p-2 rounded-md border ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 text-[11px] sm:text-xs flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-16 sm:w-20 ${labelColor}`}>Rate</span>
            <span className={`font-mono ${valueColor}`}>{formatRate(current.rate)}/min</span>
            <span className={arrowColor}>&rarr;</span>
            <span className={`font-mono font-medium ${valueColor}`}>{formatRate(preview.rate)}/min</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-16 sm:w-20 ${labelColor}`}>Extractors</span>
            <span className={`font-mono ${valueColor}`}>{current.extractorCost.total} ext</span>
            <span className={arrowColor}>&rarr;</span>
            <span className={`font-mono font-medium ${valueColor}`}>{preview.extractorCost.total} ext</span>
          </div>
          {splitsChanged && (
            <div className="flex items-center gap-2">
              <span className={`w-16 sm:w-20 ${labelColor}`}>Splits</span>
              <span className={valueColor}>{currentSplits}</span>
              <span className={arrowColor}>&rarr;</span>
              <span className={`font-medium ${valueColor}`}>{previewSplits}</span>
            </div>
          )}
          {beltsChanged && (
            <div className="flex items-center gap-2">
              <span className={`w-16 sm:w-20 ${labelColor}`}>Belts</span>
              <span className={valueColor}>{currentBelts ? 'clean' : '\u2014'}</span>
              <span className={arrowColor}>&rarr;</span>
              <span className={`font-medium ${valueColor}`}>{previewBelts ? 'clean' : '\u2014'}</span>
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className={`ml-2 p-0.5 rounded transition flex-shrink-0 ${
            isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Dismiss preview"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
