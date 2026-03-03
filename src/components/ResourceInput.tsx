import { useStore } from '../store/useStore';
import { ITEMS } from '../data/items';
import { getExtractorRates } from '../data/buildings';
import { StepperButton } from './StepperButton';
import { ResourceIcon } from './ResourceIcon';

export function ResourceInput() {
  const productionResult = useStore((s) => s.productionResult);
  const setRateFromExtractorCount = useStore((s) => s.setRateFromExtractorCount);
  const constraintSource = useStore((s) => s.constraintSource);
  const buildingLevels = useStore((s) => s.buildingLevels);
  const worldGen2 = useStore((s) => s.worldGen2);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const extractorLevel = buildingLevels.get('extractor') ?? 1;
  const ratePerExtractor = getExtractorRates(worldGen2)[extractorLevel - 1];

  if (!productionResult || productionResult.rawResources.size === 0) {
    return (
      <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        No raw resources needed
      </div>
    );
  }

  // Derive extractor list from production result
  const resources = Array.from(productionResult.rawResources.entries())
    .map(([resourceId, rate]) => ({
      resourceId,
      rate: rate.toNumber(),
      extractorCount: rate.toNumber() / ratePerExtractor,
    }))
    .sort((a, b) => {
      const nameA = ITEMS[a.resourceId]?.name ?? a.resourceId;
      const nameB = ITEMS[b.resourceId]?.name ?? b.resourceId;
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="space-y-2">
        {resources.map(({ resourceId, rate, extractorCount }) => {
          const item = ITEMS[resourceId];
          const isConstraint = constraintSource.type === 'extractor' && constraintSource.resourceId === resourceId;

          const step = (delta: number) => {
            const next = Math.max(1, extractorCount + delta);
            setRateFromExtractorCount(resourceId, next);
          };

          return (
            <div
              key={resourceId}
              className={`p-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ResourceIcon resourceId={resourceId} />
                <span className={`flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item?.name ?? resourceId}
                  {isConstraint && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600 text-blue-100 ml-2" title="This extractor is driving the calculation">
                      CONSTRAINT
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-0.5">
                  <StepperButton direction="decrement" onClick={() => step(-1)} isDark={isDark} />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={parseFloat(extractorCount.toFixed(2))}
                    onChange={(e) => {
                      const count = parseFloat(e.target.value);
                      if (count > 0) {
                        setRateFromExtractorCount(resourceId, count);
                      }
                    }}
                    className={`w-20 px-2 py-1 rounded-lg text-center ${
                      isDark
                        ? 'bg-gray-600 border-gray-500 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <StepperButton direction="increment" onClick={() => step(1)} isDark={isDark} />
                </div>
                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {rate.toFixed(2)}/min
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extractor rate info */}
      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Level {extractorLevel} extractors produce {ratePerExtractor}/min each
      </div>
    </div>
  );
}
