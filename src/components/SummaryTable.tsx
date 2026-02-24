import { useState, useEffect } from 'react';
import { BUILDINGS, BuildingType } from '../data/buildings';
import { ITEMS } from '../data/items';
import { useStore, FractionalProposal } from '../store/useStore';
import { Rational } from '../core/math/rational';

function formatCount(count: Rational): { text: string; isInteger: boolean } {
  const value = count.toNumber();
  const isInteger = count.isInteger() || Math.abs(value - Math.round(value)) < 0.001;

  if (isInteger) {
    return { text: Math.round(value).toString(), isInteger: true };
  }

  return { text: value.toFixed(2), isInteger: false };
}

export function SummaryTable() {
  const productionResult = useStore((s) => s.productionResult);
  const beltResult = useStore((s) => s.beltResult);
  const beltSpeed = useStore((s) => s.beltSpeed);
  const showBeltInfo = useStore((s) => s.showBeltInfo);
  const fractionalProposals = useStore((s) => s.fractionalProposals);
  const setTargetRate = useStore((s) => s.setTargetRate);
  const setRateFromBuildingCount = useStore((s) => s.setRateFromBuildingCount);
  const setRateFromResourceAmount = useStore((s) => s.setRateFromResourceAmount);
  const constraintSource = useStore((s) => s.constraintSource);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [expandedBuilding, setExpandedBuilding] = useState<BuildingType | null>(null);

  if (!productionResult) {
    return null;
  }

  // Building summary
  const buildingSummary = Array.from(productionResult.buildingSummary.entries())
    .map(([buildingType, count]) => ({
      buildingType,
      name: BUILDINGS[buildingType]?.name ?? buildingType,
      count,
      formatted: formatCount(count),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Raw resources
  const rawResources = Array.from(productionResult.rawResources.entries())
    .map(([itemId, rate]) => ({
      itemId,
      name: ITEMS[itemId]?.name ?? itemId,
      rate,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Stats
  const totalBuildings = buildingSummary.reduce(
    (sum, b) => sum + b.count.toNumber(),
    0
  );
  const integerBuildings = buildingSummary.filter((b) => b.formatted.isInteger).length;
  const allInteger = integerBuildings === buildingSummary.length;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Building Summary */}
      <div className={`rounded-lg p-3 sm:p-4 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Buildings Required
          </h3>
          <span
            className={`text-sm px-2 py-0.5 rounded ${
              allInteger
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            }`}
          >
            {integerBuildings}/{buildingSummary.length} integer
          </span>
        </div>
        <div className="space-y-1">
          {buildingSummary.map(({ buildingType, name, count, formatted }) => {
            const proposal = fractionalProposals.find(p => p.buildingType === buildingType);
            const isExpanded = expandedBuilding === buildingType;
            const hasSuggestions = proposal && !formatted.isInteger;
            const isConstraint = constraintSource.type === 'building' && constraintSource.buildingType === buildingType;

            return (
              <div key={buildingType}>
                <div
                  className={`flex items-center gap-2 py-1 border-b last:border-0 ${
                    isDark ? 'border-gray-700' : 'border-gray-100'
                  } ${isConstraint ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
                >
                  <span
                    className={`flex-1 min-w-0 truncate text-sm leading-7 ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-1 cursor-pointer`}
                    onClick={() => hasSuggestions && setExpandedBuilding(isExpanded ? null : buildingType)}
                  >
                    {name}
                    {isConstraint && (
                      <span className="text-xs px-1 py-0.5 rounded bg-blue-600 text-blue-100 ml-1 flex-shrink-0" title="This value is driving the calculation">
                        CONSTRAINT
                      </span>
                    )}
                    {hasSuggestions && !isConstraint && (
                      <span className={`text-xs flex-shrink-0 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`}>
                        {isExpanded ? '[-]' : '[+]'}
                      </span>
                    )}
                  </span>
                  <EditableBuildingCount
                    count={count.toNumber()}
                    isInteger={formatted.isInteger}
                    isConstraint={isConstraint}
                    onSetCount={(newCount) => setRateFromBuildingCount(buildingType, newCount)}
                    isDark={isDark}
                  />
                </div>

                {/* Expandable fix suggestions */}
                {isExpanded && proposal && (
                  <FractionalSuggestions
                    proposal={proposal}
                    onSelectRate={setTargetRate}
                    isDark={isDark}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className={`mt-3 pt-2 border-t flex justify-between ${
          isDark ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</span>
          <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {totalBuildings.toFixed(1)} buildings
          </span>
        </div>
      </div>

      {/* Raw Resources */}
      <div className={`rounded-lg p-3 sm:p-4 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Raw Resources
        </h3>
        <div className="space-y-1">
          {rawResources.map(({ itemId, name, rate }) => {
            const isConstraint = constraintSource.type === 'resource' && constraintSource.resourceId === itemId;
            return (
              <div
                key={itemId}
                className={`flex items-center gap-2 py-1 border-b last:border-0 ${
                  isDark ? 'border-gray-700' : 'border-gray-100'
                } ${isConstraint ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}
              >
                <span className={`flex-1 min-w-0 truncate text-sm leading-7 ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-1`}>
                  {name}
                  {isConstraint && (
                    <span className="text-xs px-1 py-0.5 rounded bg-blue-600 text-blue-100 ml-1 flex-shrink-0" title="This value is driving the calculation">
                      CONSTRAINT
                    </span>
                  )}
                </span>
                <EditableResourceRate
                  rate={rate.toNumber()}
                  isConstraint={isConstraint}
                  onSetRate={(newRate) => setRateFromResourceAmount(itemId, newRate)}
                  isDark={isDark}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Belt Analysis */}
      {showBeltInfo && beltResult && (
        <div className={`rounded-lg p-3 sm:p-4 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Belt Analysis
            </h3>
            {beltResult.hasMultiBelt ? (
              <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {beltResult.multiBeltConnections.length} multi-belt
              </span>
            ) : beltResult.hasNearCapacity ? (
              <span className="text-sm px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                {beltResult.nearCapacityConnections.length} near capacity
              </span>
            ) : (
              <span className="text-sm px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                All clear
              </span>
            )}
          </div>

          {/* Belt speed info */}
          <div className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Belt speed: {beltSpeed}/min
          </div>

          {/* Success state */}
          {!beltResult.hasMultiBelt && !beltResult.hasNearCapacity && (
            <div className={`p-2 rounded text-sm ${
              isDark ? 'bg-green-900/30 border border-green-800 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              All connections fit within a single belt
            </div>
          )}

          {/* Multi-belt list */}
          {beltResult.multiBeltConnections.length > 0 && (
            <div>
              <div className="space-y-1">
                {beltResult.multiBeltConnections.map((conn, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${isDark ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}
                  >
                    <div className={isDark ? 'text-blue-300' : 'text-blue-700'}>
                      {conn.fromItemName} → {conn.toItemName}
                    </div>
                    <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {conn.throughputPerMinute.toNumber().toFixed(1)}/min
                      <span className={`ml-2 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        ({conn.beltsNeeded} belts)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near-capacity list */}
          {beltResult.nearCapacityConnections.length > 0 && (
            <div className={beltResult.hasMultiBelt ? 'mt-3' : ''}>
              <div className="space-y-1">
                {beltResult.nearCapacityConnections.map((conn, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${isDark ? 'bg-yellow-900/20 border border-yellow-800/50' : 'bg-yellow-50 border border-yellow-200'}`}
                  >
                    <div className={isDark ? 'text-yellow-300' : 'text-yellow-700'}>
                      {conn.fromItemName} → {conn.toItemName}
                    </div>
                    <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {conn.throughputPerMinute.toNumber().toFixed(1)}/min
                      <span className={`ml-2 font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        ({Math.round(conn.utilization * 100)}% of belt)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FractionalSuggestionsProps {
  proposal: FractionalProposal;
  onSelectRate: (rate: number) => void;
  isDark: boolean;
}

function FractionalSuggestions({ proposal, onSelectRate, isDark }: FractionalSuggestionsProps) {
  const formatRate = (rate: number) => {
    if (Number.isInteger(rate)) return rate.toString();
    return rate.toFixed(2).replace(/\.?0+$/, '');
  };

  return (
    <div className={`ml-4 mt-1 mb-2 p-2 rounded text-xs space-y-2 ${
      isDark ? 'bg-yellow-900/20 border border-yellow-800/50' : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className={`font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
        Fix suggestions for {proposal.buildingName}:
      </div>

      {/* Scale up suggestion */}
      {proposal.scaleUp && (
        <button
          onClick={() => onSelectRate(proposal.scaleUp!.targetRate)}
          className={`w-full text-left p-2 rounded transition ${
            isDark
              ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-800'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Scale to {formatRate(proposal.scaleUp.targetRate)}/min</span>
            <span className="font-bold">{proposal.scaleUp.targetBuildingCount} {proposal.buildingName}</span>
          </div>
          <div className="flex gap-2 mt-1">
            {proposal.scaleUp.otherBuildingsStillInteger && (
              <span className="px-1 py-0.5 rounded bg-green-800/50 text-green-300">INT</span>
            )}
            {proposal.scaleUp.beltsStillClean && (
              <span className="px-1 py-0.5 rounded bg-cyan-800/50 text-cyan-300">BELT</span>
            )}
          </div>
        </button>
      )}

      {/* Scale down suggestion */}
      {proposal.scaleDown && proposal.scaleDown.targetBuildingCount > 0 && (
        <button
          onClick={() => onSelectRate(proposal.scaleDown!.targetRate)}
          className={`w-full text-left p-2 rounded transition ${
            isDark
              ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-800'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Scale to {formatRate(proposal.scaleDown.targetRate)}/min</span>
            <span className="font-bold">{proposal.scaleDown.targetBuildingCount} {proposal.buildingName}</span>
          </div>
          <div className="flex gap-2 mt-1">
            {proposal.scaleDown.otherBuildingsStillInteger && (
              <span className="px-1 py-0.5 rounded bg-green-800/50 text-green-300">INT</span>
            )}
            {proposal.scaleDown.beltsStillClean && (
              <span className="px-1 py-0.5 rounded bg-cyan-800/50 text-cyan-300">BELT</span>
            )}
          </div>
        </button>
      )}

      {/* Overcapacity info */}
      <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Or build {Math.ceil(proposal.currentCount)} (overcapacity: {proposal.overproductionPercent.toFixed(0)}%)
      </div>

    </div>
  );
}

// Always-visible building count input
interface EditableBuildingCountProps {
  count: number;
  isInteger: boolean;
  isConstraint: boolean;
  onSetCount: (count: number) => void;
  isDark: boolean;
}

function EditableBuildingCount({ count, isInteger, isConstraint, onSetCount, isDark }: EditableBuildingCountProps) {
  const displayValue = isInteger ? Math.round(count).toString() : count.toFixed(2);
  const [editValue, setEditValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);

  // Sync display when count changes externally (but not while user is typing)
  useEffect(() => {
    if (!isFocused) {
      setEditValue(isInteger ? Math.round(count).toString() : count.toFixed(2));
    }
  }, [count, isInteger, isFocused]);

  const handleConfirm = () => {
    const newCount = parseFloat(editValue);
    if (!isNaN(newCount) && newCount > 0) {
      onSetCount(newCount);
    } else {
      // Reset to current value on invalid input
      setEditValue(displayValue);
    }
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(displayValue);
      setIsFocused(false);
    }
  };

  return (
    <input
      type="number"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={(e) => { setIsFocused(true); e.target.select(); }}
      onBlur={handleConfirm}
      onKeyDown={handleKeyDown}
      className={`w-20 h-7 px-2 text-right font-mono text-sm font-semibold rounded border ${
        isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
      } ${
        isInteger
          ? 'border-green-500'
          : 'border-yellow-500'
      } ${isConstraint ? 'ring-2 ring-blue-500' : ''}`}
      title="Edit to set as constraint"
      step="1"
      min="0"
    />
  );
}

// Always-visible resource rate input
interface EditableResourceRateProps {
  rate: number;
  isConstraint: boolean;
  onSetRate: (rate: number) => void;
  isDark: boolean;
}

function EditableResourceRate({ rate, isConstraint, onSetRate, isDark }: EditableResourceRateProps) {
  const displayValue = rate.toFixed(2);
  const [editValue, setEditValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setEditValue(rate.toFixed(2));
    }
  }, [rate, isFocused]);

  const handleConfirm = () => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate) && newRate > 0) {
      onSetRate(newRate);
    } else {
      setEditValue(displayValue);
    }
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(displayValue);
      setIsFocused(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={(e) => { setIsFocused(true); e.target.select(); }}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        className={`w-20 h-7 px-2 text-right font-mono text-sm rounded border ${
          isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        } ${isConstraint ? 'ring-2 ring-blue-500' : ''}`}
        title="Edit to set as constraint"
        step="0.1"
        min="0"
      />
      <span className={`text-sm leading-7 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/min</span>
    </div>
  );
}
