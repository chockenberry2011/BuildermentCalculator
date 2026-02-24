import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ITEMS } from '../data/items';
import { EXTRACTOR_RATES } from '../data/buildings';
import { getRequiredResources } from '../core/ReverseCalculator';

// Raw resources that can have extractors
const RAW_RESOURCES = Object.values(ITEMS)
  .filter(item => item.category === 'raw')
  .sort((a, b) => a.name.localeCompare(b.name));

export function ResourceInput() {
  const targetItemId = useStore((s) => s.targetItemId);
  const targetRate = useStore((s) => s.targetRate);
  const resourceConstraints = useStore((s) => s.resourceConstraints);
  const setResourceConstraints = useStore((s) => s.setResourceConstraints);
  const setRateFromExtractorCount = useStore((s) => s.setRateFromExtractorCount);
  const reverseResult = useStore((s) => s.reverseResult);
  const constraintSource = useStore((s) => s.constraintSource);
  const recipeSelections = useStore((s) => s.recipeSelections);
  const buildingLevels = useStore((s) => s.buildingLevels);
  const extractorBudget = useStore((s) => s.extractorBudget);
  const setExtractorBudget = useStore((s) => s.setExtractorBudget);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const extractorLevel = buildingLevels.get('extractor') ?? 1;
  const ratePerExtractor = EXTRACTOR_RATES[extractorLevel - 1];

  // Get required resources for the target item
  const requiredResources = useMemo(() => {
    if (!targetItemId) return [];
    return getRequiredResources(targetItemId, recipeSelections, buildingLevels);
  }, [targetItemId, recipeSelections, buildingLevels]);

  const addResource = (resourceId: string) => {
    if (resourceConstraints.some(c => c.resourceId === resourceId)) return;
    setResourceConstraints([
      ...resourceConstraints,
      { resourceId, extractorCount: 1 }
    ]);
  };

  const removeResource = (resourceId: string) => {
    setResourceConstraints(
      resourceConstraints.filter(c => c.resourceId !== resourceId)
    );
  };

  const updateExtractorCount = (resourceId: string, count: number) => {
    if (count > 0) {
      setRateFromExtractorCount(resourceId, count);
    } else {
      // For count=0, just update the constraint directly
      setResourceConstraints(
        resourceConstraints.map(c =>
          c.resourceId === resourceId
            ? { ...c, extractorCount: 0 }
            : c
        )
      );
    }
  };

  // Filter available resources to show
  const availableResources = RAW_RESOURCES.filter(
    r => !resourceConstraints.some(c => c.resourceId === r.id)
  );

  // Highlight required resources that haven't been added
  const missingRequired = requiredResources.filter(
    id => !resourceConstraints.some(c => c.resourceId === id)
  );

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Total Extractor Budget */}
      <div className={`p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="flex items-center gap-2">
          <label className={`flex-1 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Total Extractor Budget
          </label>
          <input
            type="number"
            min={1}
            value={extractorBudget ?? ''}
            placeholder="No limit"
            onChange={(e) => {
              const val = e.target.value;
              setExtractorBudget(val === '' ? null : Math.max(1, parseInt(val) || 1));
            }}
            className={`w-24 px-2 py-1 rounded text-center ${
              isDark
                ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } border`}
          />
          {extractorBudget != null && (
            <button
              onClick={() => setExtractorBudget(null)}
              className={`px-2 py-1 rounded text-xs ${
                isDark
                  ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Clear
            </button>
          )}
        </div>
        <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Set a total extractor limit to find practical rates
        </div>
      </div>

      {/* Current constraints */}
      <div className="space-y-2">
        {resourceConstraints.map((constraint) => {
          const item = ITEMS[constraint.resourceId];
          const utilization = reverseResult?.resourceUtilization.get(constraint.resourceId);
          const isBottleneck = reverseResult?.bottleneck?.resourceId === constraint.resourceId;
          const isConstraint = constraintSource.type === 'extractor' && constraintSource.resourceId === constraint.resourceId;

          return (
            <div
              key={constraint.resourceId}
              className={`p-2 rounded ${
                isBottleneck
                  ? isDark ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                  : isDark ? 'bg-gray-700' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item?.name ?? constraint.resourceId}
                  {isConstraint && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600 text-blue-100 ml-2" title="This extractor is driving the calculation">
                      CONSTRAINT
                    </span>
                  )}
                  {isBottleneck && (
                    <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                      isDark ? 'bg-orange-800 text-orange-300' : 'bg-orange-200 text-orange-700'
                    }`}>
                      BOTTLENECK
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  min={0}
                  value={constraint.extractorCount}
                  onChange={(e) => updateExtractorCount(
                    constraint.resourceId,
                    parseInt(e.target.value) || 0
                  )}
                  className={`w-20 px-2 py-1 rounded text-center ${
                    isDark
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
                <button
                  onClick={() => removeResource(constraint.resourceId)}
                  className={`px-2 py-1 rounded ${
                    isDark
                      ? 'bg-red-900/50 text-red-400 hover:bg-red-900'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  X
                </button>
              </div>
              {utilization && (
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Using {utilization.used.toFixed(1)}/{utilization.available.toFixed(1)}/min
                  ({Math.round((utilization.used / utilization.available) * 100)}%)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing required resources warning */}
      {missingRequired.length > 0 && (
        <div className={`text-sm p-2 rounded ${
          isDark ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
        }`}>
          <div className="font-medium mb-1">Required resources not added:</div>
          <div className="flex flex-wrap gap-1">
            {missingRequired.map(id => (
              <button
                key={id}
                onClick={() => addResource(id)}
                className={`px-2 py-0.5 rounded text-xs ${
                  isDark
                    ? 'bg-yellow-800 hover:bg-yellow-700 text-yellow-200'
                    : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-800'
                }`}
              >
                + {ITEMS[id]?.name ?? id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add resource dropdown */}
      {availableResources.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              addResource(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className={`w-full px-3 py-2 rounded-lg ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-300 text-gray-900'
          } border`}
        >
          <option value="">+ Add resource...</option>
          {availableResources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
            </option>
          ))}
        </select>
      )}

      {/* Extractor rate info */}
      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Level {extractorLevel} extractors produce {ratePerExtractor}/min each
      </div>

      {/* Extractor Capacity summary */}
      {reverseResult && reverseResult.maxOutputRate > 0 && (
        <div className={`mt-2 sm:mt-4 p-2 sm:p-3 rounded ${
          targetRate > reverseResult.maxOutputRate
            ? isDark ? 'bg-orange-900/30 border border-orange-800' : 'bg-orange-50 border border-orange-200'
            : isDark ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`font-semibold ${
            targetRate > reverseResult.maxOutputRate
              ? isDark ? 'text-orange-300' : 'text-orange-700'
              : isDark ? 'text-blue-300' : 'text-blue-700'
          }`}>
            Extractor Capacity: {reverseResult.maxOutputRate.toFixed(2)}/min
          </div>
          {targetRate > reverseResult.maxOutputRate && (
            <div className={`text-xs mt-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              Current rate exceeds extractor capacity
            </div>
          )}
          <div className="flex gap-2 mt-1">
            {reverseResult.allBuildingsInteger && (
              <span className="text-xs px-1 py-0.5 rounded bg-green-800 text-green-300">INT</span>
            )}
            {reverseResult.allBeltsClean && (
              <span className="text-xs px-1 py-0.5 rounded bg-cyan-800 text-cyan-300">BELT</span>
            )}
          </div>
          {reverseResult.bottleneck && (
            <div className={`text-xs mt-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              {reverseResult.bottleneck.suggestion}
            </div>
          )}
        </div>
      )}

      {reverseResult && reverseResult.maxOutputRate === 0 && resourceConstraints.length > 0 && (
        <div className={`mt-2 sm:mt-4 p-2 sm:p-3 rounded ${
          isDark ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          Cannot produce - missing required resources
        </div>
      )}
    </div>
  );
}
