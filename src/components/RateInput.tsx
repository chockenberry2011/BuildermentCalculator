import { useStore } from '../store/useStore';

export function RateInput() {
  const targetRate = useStore((s) => s.targetRate);
  const setTargetRate = useStore((s) => s.setTargetRate);
  const constraintSource = useStore((s) => s.constraintSource);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isConstraint = constraintSource.type === 'rate';

  return (
    <div className="space-y-1">
      <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
        Rate/min
        {isConstraint && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600 text-blue-100" title="This value is driving the calculation">
            CONSTRAINT
          </span>
        )}
      </label>
      <input
        type="number"
        min={0.1}
        step={0.1}
        value={targetRate}
        onChange={(e) => setTargetRate(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
        className={`w-full px-3 h-9 sm:h-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-gray-50 border-gray-300 text-gray-900'
          } border ${isConstraint ? 'ring-2 ring-blue-500' : ''}`}
      />
      {!isConstraint && (
        <p className={`hidden sm:block text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Derived from {constraintSource.type === 'building' ? 'building count' : constraintSource.type === 'extractor' ? 'extractor count' : 'resource amount'}
        </p>
      )}
    </div>
  );
}
