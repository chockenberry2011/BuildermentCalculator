import { useStore } from '../store/useStore';
import { BUILDINGS } from '../data/buildings';
import {
  PracticalOptimum,
  describeFractionQuality,
} from '../core/RatioOptimizer';
import { PracticalCandidate } from '../core/PracticalRateOptimizer';

export function OptimizationPanel() {
  const targetRate = useStore((s) => s.targetRate);
  const setTargetRate = useStore((s) => s.setTargetRate);
  const extractorBudget = useStore((s) => s.extractorBudget);
  const practicalCandidates = useStore((s) => s.practicalCandidates);
  const bestPracticalRates = useStore((s) => s.bestPracticalRates);
  const autoIntegerMode = useStore((s) => s.autoIntegerMode);
  const setAutoIntegerMode = useStore((s) => s.setAutoIntegerMode);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!bestPracticalRates) {
    return null;
  }

  const { bestSimple, bestAllInteger } = bestPracticalRates;

  // If both are the same rate, show only one combined card
  const isSameRate =
    bestSimple &&
    bestAllInteger &&
    Math.abs(bestSimple.rate - bestAllInteger.rate) < 0.001;

  const handleScale = (multiplier: number) => {
    setTargetRate(targetRate * multiplier);
  };

  return (
    <div className={`rounded-lg p-3 sm:p-4 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Optimal Rates
        </h3>
        <label className={`flex items-center gap-1.5 cursor-pointer text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Auto-apply
          <button
            role="switch"
            aria-checked={autoIntegerMode}
            onClick={() => setAutoIntegerMode(!autoIntegerMode)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              autoIntegerMode
                ? 'bg-blue-500'
                : isDark ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                autoIntegerMode ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Two-card layout (or single card if rates match) */}
      {isSameRate ? (
        <RecommendedRateCard
          optimum={bestAllInteger!}
          title="Recommended Rate"
          icon="&#10003;"
          colorScheme="green"
          isActive={Math.abs(targetRate - bestAllInteger!.rate) < 0.001}
          onApply={() => setTargetRate(bestAllInteger!.rate)}
          onApplyDoubling={(rate) => setTargetRate(rate)}
          isDark={isDark}
          showCombinedBadges
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {bestSimple && (
            <RecommendedRateCard
              optimum={bestSimple}
              title="Simplest Rate"
              icon="&#9733;"
              colorScheme="amber"
              isActive={Math.abs(targetRate - bestSimple.rate) < 0.001}
              onApply={() => setTargetRate(bestSimple.rate)}
              onApplyDoubling={(rate) => setTargetRate(rate)}
              isDark={isDark}
            />
          )}
          {bestAllInteger && (
            <RecommendedRateCard
              optimum={bestAllInteger}
              title="All-Integer Rate"
              icon="&#10003;"
              colorScheme="green"
              isActive={Math.abs(targetRate - bestAllInteger.rate) < 0.001}
              onApply={() => setTargetRate(bestAllInteger.rate)}
              onApplyDoubling={(rate) => setTargetRate(rate)}
              isDark={isDark}
            />
          )}
        </div>
      )}

      {/* Practical Rates Section (budget-constrained, existing feature) */}
      {extractorBudget != null && practicalCandidates.length > 0 && (
        <PracticalRatesSection
          candidates={practicalCandidates.slice(0, 5)}
          budget={extractorBudget}
          currentRate={targetRate}
          onApply={setTargetRate}
          isDark={isDark}
        />
      )}

      {/* Quick Scale Buttons */}
      <div className={`mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        <span className="text-sm mr-2">Quick Scale:</span>
        <div className="inline-flex gap-1">
          {[2, 3, 4, 5].map((multiplier) => (
            <button
              key={multiplier}
              onClick={() => handleScale(multiplier)}
              className={`px-2 py-1 text-sm rounded transition font-medium ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              x{multiplier}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatRate(rate: number): string {
  if (Number.isInteger(rate)) {
    return rate.toString();
  }
  // Show up to 2 decimal places, removing trailing zeros
  return rate.toFixed(2).replace(/\.?0+$/, '');
}

// ============================================================================
// Recommended Rate Card — used for both Simplest Rate and All-Integer Rate
// ============================================================================

type ColorScheme = 'green' | 'amber';

const colorStyles = {
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

interface RecommendedRateCardProps {
  optimum: PracticalOptimum;
  title: string;
  icon: string;
  colorScheme: ColorScheme;
  isActive: boolean;
  onApply: () => void;
  onApplyDoubling: (rate: number) => void;
  isDark: boolean;
  showCombinedBadges?: boolean;
}

function RecommendedRateCard({
  optimum,
  title,
  icon,
  colorScheme,
  isActive,
  onApply,
  onApplyDoubling,
  isDark,
  showCombinedBadges,
}: RecommendedRateCardProps) {
  const colors = colorStyles[colorScheme];
  const mode = isDark ? 'dark' : 'light';

  // Format building counts
  const buildingSummary = Array.from(optimum.buildingCounts.entries())
    .map(([type, count]) => ({
      name: BUILDINGS[type]?.name ?? type,
      count: Math.round(count * 100) / 100,
    }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const buildingText = buildingSummary
    .map((b) => `${formatRate(b.count)} ${b.name}`)
    .join(', ');

  const fractionLabel = describeFractionQuality(optimum.rationalBuildingCounts);
  const extractorWarning = optimum.extractorCost.total > 200;

  return (
    <div
      className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg border-2 ${
        isActive ? colors.active[mode] : colors.inactive[mode]
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`${colors.icon} text-lg`} dangerouslySetInnerHTML={{ __html: icon }} />
        <span className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}: {formatRate(optimum.rate)}/min
        </span>
        {isActive && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${colors.badge[mode]}`}>
            current
          </span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
        }`}>
          {optimum.extractorCost.total} extractors
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${colors.badge[mode]}`}>
          {fractionLabel}
        </span>
        {optimum.candidate.allBeltsClean && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isDark ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
          }`}>
            clean belts
          </span>
        )}
        {showCombinedBadges && optimum.allInteger && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isDark ? 'bg-green-800 text-green-300' : 'bg-green-100 text-green-700'
          }`}>
            ALL INTEGER
          </span>
        )}
      </div>

      {/* Extractor warning */}
      {extractorWarning && (
        <div className={`text-xs mb-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          Requires many extractors — check resource availability
        </div>
      )}

      {/* Building summary */}
      <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {buildingText}
      </div>

      {/* Doubling chips */}
      {optimum.doublings.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Also at:</span>
          {optimum.doublings.map((d) => (
            <button
              key={d.rate}
              onClick={() => onApplyDoubling(d.rate)}
              className={`text-xs px-1.5 py-0.5 rounded transition ${colors.chip[mode]}`}
            >
              {formatRate(d.rate)}/min ({d.extractorCost.total} ext)
            </button>
          ))}
        </div>
      )}

      {/* Apply button */}
      {!isActive && (
        <button
          onClick={onApply}
          className={`w-full text-sm py-1.5 px-3 rounded transition font-medium ${colors.button[mode]}`}
        >
          Apply
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Practical Rates Section - Budget-constrained rate suggestions (existing)
// ============================================================================

interface PracticalRatesSectionProps {
  candidates: PracticalCandidate[];
  budget: number;
  currentRate: number;
  onApply: (rate: number) => void;
  isDark: boolean;
}

function PracticalRatesSection({ candidates, budget, currentRate, onApply, isDark }: PracticalRatesSectionProps) {
  return (
    <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg border ${
      isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50/50 border-blue-300'
    }`}>
      <div className={`text-sm font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
        Practical Rates (budget: {budget} extractors)
      </div>
      <div className="space-y-1">
        {candidates.map((candidate, i) => {
          const isActive = Math.abs(currentRate - candidate.rate) < 0.001;
          return (
            <button
              key={i}
              onClick={() => onApply(candidate.rate)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition flex items-center gap-2 ${
                isActive
                  ? isDark
                    ? 'bg-blue-800/60 text-white'
                    : 'bg-blue-100 text-blue-900'
                  : isDark
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="font-medium min-w-[70px]">
                {formatRate(candidate.rate)}/min
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {candidate.totalExtractors} ext
              </span>
              <span className={`text-xs px-1 py-0.5 rounded ${
                candidate.allInteger
                  ? isDark ? 'bg-green-800 text-green-300' : 'bg-green-100 text-green-700'
                  : isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {candidate.allInteger
                  ? 'ALL INT'
                  : `${Math.round(candidate.integerRatio * candidate.buildingCounts.size)}/${candidate.buildingCounts.size} INT`
                }
              </span>
              {candidate.allBeltsClean && (
                <span className={`text-xs px-1 py-0.5 rounded ${
                  isDark ? 'bg-cyan-900 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  BELT
                </span>
              )}
              {isActive && (
                <span className={`text-xs px-1 py-0.5 rounded ${
                  isDark ? 'bg-blue-700 text-blue-200' : 'bg-blue-200 text-blue-700'
                }`}>
                  current
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
