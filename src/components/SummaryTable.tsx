import { useState, useEffect } from 'react';
import { ITEMS } from '../data/items';
import { useStore } from '../store/useStore';
import { ResourceIcon } from './ResourceIcon';
import { StepperButton } from './StepperButton';

export function SummaryTable() {
  const productionResult = useStore((s) => s.productionResult);
  const beltResult = useStore((s) => s.beltResult);
  const beltSpeed = useStore((s) => s.beltSpeed);
  const showBeltInfo = useStore((s) => s.showBeltInfo);
  const setRateFromResourceAmount = useStore((s) => s.setRateFromResourceAmount);
  const constraintSource = useStore((s) => s.constraintSource);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!productionResult) {
    return null;
  }

  // Raw resources
  const rawResources = Array.from(productionResult.rawResources.entries())
    .map(([itemId, rate]) => ({
      itemId,
      name: ITEMS[itemId]?.name ?? itemId,
      rate,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      {/* Raw Resources */}
      <div>
        <div className="space-y-0.5">
          {rawResources.map(({ itemId, name, rate }) => {
            const isConstraint = constraintSource.type === 'resource' && constraintSource.resourceId === itemId;
            return (
              <div
                key={itemId}
                className={`flex items-center gap-1.5 py-0.5 ${isConstraint ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') + ' rounded px-1 -mx-1' : ''}`}
              >
                <ResourceIcon resourceId={itemId} />
                <span className={`flex-1 min-w-0 truncate text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {name}
                  {isConstraint && (
                    <span className="text-xs px-1 py-0.5 rounded bg-blue-600 text-blue-100 ml-1">
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

      {/* Power Consumption — future feature */}
      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Power Consumption
          </h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
          }`}>
            Coming soon
          </span>
        </div>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Power tracking is planned for a future update.
        </p>
      </div>

      {/* Belt Analysis */}
      {showBeltInfo && beltResult && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Belt Analysis
            </h3>
            {beltResult.hasMultiBelt ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {beltResult.multiBeltConnections.length} multi-belt
              </span>
            ) : beltResult.hasNearCapacity ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                {beltResult.nearCapacityConnections.length} near capacity
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                All clear
              </span>
            )}
          </div>

          <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Belt speed: {beltSpeed}/min
          </div>

          {!beltResult.hasMultiBelt && !beltResult.hasNearCapacity && (
            <div className={`p-2 rounded text-xs ${
              isDark ? 'bg-green-900/30 border border-green-800 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              All connections fit within a single belt
            </div>
          )}

          {beltResult.multiBeltConnections.length > 0 && (
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
          )}

          {beltResult.nearCapacityConnections.length > 0 && (
            <div className={beltResult.hasMultiBelt ? 'mt-2' : ''}>
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

// Editable resource rate
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

  const step = (delta: number) => {
    const next = Math.max(0.1, rate + delta);
    onSetRate(next);
  };

  return (
    <div className={`flex items-center gap-0.5 ${isConstraint ? 'ring-2 ring-blue-500 rounded-full px-0.5' : ''}`}>
      <StepperButton direction="decrement" onClick={() => step(-1)} isDark={isDark} />
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={(e) => { setIsFocused(true); e.target.select(); }}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        className={`w-16 h-5 px-0 text-center font-mono text-sm bg-transparent border-none outline-none ${
          isDark ? 'text-white' : 'text-gray-900'
        } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        title="Edit to set as constraint"
        step="0.1"
        min="0"
      />
      <StepperButton direction="increment" onClick={() => step(1)} isDark={isDark} />
      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/min</span>
    </div>
  );
}
