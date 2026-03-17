import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';
import { ItemSelector } from './ItemSelector';
import { RateInput } from './RateInput';

export function TargetList() {
  const targets = useStore((s) => s.targets);
  const addTarget = useStore((s) => s.addTarget);
  const removeTarget = useStore((s) => s.removeTarget);
  const updateTarget = useStore((s) => s.updateTarget);
  const isDark = useDark();

  const isSingleTarget = targets.length === 1;

  return (
    <div className="space-y-2">
      {targets.map((target, index) => (
        <div key={target.id} className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            {isSingleTarget ? (
              <ItemSelector />
            ) : (
              <ItemSelector
                value={target.itemId}
                onSelect={(itemId) => updateTarget(target.id, { itemId })}
              />
            )}
          </div>
          <div className="flex-1">
            {isSingleTarget ? (
              <RateInput />
            ) : (
              <RateInput
                value={target.rate}
                onChange={(rate) => updateTarget(target.id, { rate })}
              />
            )}
          </div>
          {!isSingleTarget && (
            <button
              onClick={() => removeTarget(target.id)}
              className={`h-9 sm:h-10 group-[]/sticky:h-8 group-[]/sticky:sm:h-8 px-2 rounded-lg border transition-colors flex-shrink-0
                ${isDark
                  ? 'border-gray-600 text-gray-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700'
                  : 'border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                }`}
              title={`Remove target ${index + 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addTarget}
        className={`text-xs px-3 py-1.5 group-[]/sticky:py-1 rounded-lg border border-dashed transition-colors
          ${isDark
            ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400'
            : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600'
          }`}
      >
        + Add Target
      </button>
    </div>
  );
}
