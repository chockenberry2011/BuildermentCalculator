import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { computeExtractorCost } from '../core/RatioOptimizer';
import { useDark } from '../hooks/useDark';
import { RateCard } from './RateCard';

export function OptimizationPanel() {
  const targetRate = useStore((s) => s.targetRate);
  const setTargetRate = useStore((s) => s.setTargetRate);
  const bestPracticalRates = useStore((s) => s.bestPracticalRates);
  const autoIntegerMode = useStore((s) => s.autoIntegerMode);
  const setAutoIntegerMode = useStore((s) => s.setAutoIntegerMode);
  const referenceResult = useStore((s) => s.referenceResult);
  const buildingLevels = useStore((s) => s.buildingLevels);
  const isDark = useDark();

  // Compute current extractor cost for delta comparison
  const currentExtractorCount = useMemo(() => {
    if (!referenceResult) return 0;
    const extractorLevel = buildingLevels.get('extractor') ?? 1;
    const cost = computeExtractorCost(referenceResult, targetRate, extractorLevel);
    return cost.total;
  }, [referenceResult, targetRate, buildingLevels]);

  if (!bestPracticalRates) {
    return null;
  }

  const { bestSimple, bestAllInteger } = bestPracticalRates;

  const isSameRate =
    bestSimple &&
    bestAllInteger &&
    Math.abs(bestSimple.rate - bestAllInteger.rate) < 0.001;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
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

      {isSameRate ? (
        <RateCard
          optimum={bestAllInteger!}
          title="Recommended"
          icon={"\u2713"}
          colorScheme="green"
          isActive={Math.abs(targetRate - bestAllInteger!.rate) < 0.001}
          onApply={() => setTargetRate(bestAllInteger!.rate)}
          onApplyDoubling={(rate) => setTargetRate(rate)}
          isDark={isDark}
          showCombinedBadges
          currentRate={targetRate}
          currentExtractorCount={currentExtractorCount}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bestSimple && (
            <RateCard
              optimum={bestSimple}
              title="Simplest"
              icon={"\u2605"}
              colorScheme="amber"
              isActive={Math.abs(targetRate - bestSimple.rate) < 0.001}
              onApply={() => setTargetRate(bestSimple.rate)}
              onApplyDoubling={(rate) => setTargetRate(rate)}
              isDark={isDark}
              currentRate={targetRate}
              currentExtractorCount={currentExtractorCount}
            />
          )}
          {bestAllInteger && (
            <RateCard
              optimum={bestAllInteger}
              title="Perfect Ratio"
              icon={"\u2713"}
              colorScheme="green"
              isActive={Math.abs(targetRate - bestAllInteger.rate) < 0.001}
              onApply={() => setTargetRate(bestAllInteger.rate)}
              onApplyDoubling={(rate) => setTargetRate(rate)}
              isDark={isDark}
              currentRate={targetRate}
              currentExtractorCount={currentExtractorCount}
            />
          )}
        </div>
      )}
    </div>
  );
}
