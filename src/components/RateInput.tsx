import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';

interface RateInputProps {
  value?: number;
  onChange?: (rate: number) => void;
}

export function RateInput({ value, onChange }: RateInputProps) {
  const storeRate = useStore((s) => s.targetRate);
  const storeSetRate = useStore((s) => s.setTargetRate);
  const constraintSource = useStore((s) => s.constraintSource);
  const isDark = useDark();

  const rate = value ?? storeRate;
  const commitRate = onChange ?? storeSetRate;
  const isConstraint = value === undefined && constraintSource.type === 'rate';

  const [localValue, setLocalValue] = useState(String(rate));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync local value when external rate changes (but not while user is typing)
  useEffect(() => {
    setLocalValue(String(rate));
  }, [rate]);

  const commit = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      commitRate(parsed);
    } else {
      // Reset to last good value
      setLocalValue(String(rate));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    // Debounce: commit after 300ms idle
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(val), 300);
  };

  const handleBlur = () => {
    // Commit immediately on blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      commit(localValue);
      (e.target as HTMLInputElement).blur();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-1 group-[]/sticky:space-y-0">
      <label className={`block text-xs font-medium group-[]/sticky:hidden ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
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
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 h-9 sm:h-10 group-[]/sticky:h-8 group-[]/sticky:sm:h-8 group-[]/sticky:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-gray-50 border-gray-300 text-gray-900'
          } border ${isConstraint ? 'ring-2 ring-blue-500' : ''}`}
      />
      <p className={`hidden sm:block group-[]/sticky:!hidden text-xs h-4 ${value === undefined && !isConstraint ? (isDark ? 'text-gray-500' : 'text-gray-400') : 'invisible'}`}>
        {value === undefined && !isConstraint
          ? `Derived from ${constraintSource.type === 'building' ? 'building count' : constraintSource.type === 'extractor' ? 'extractor count' : 'resource amount'}`
          : '\u00A0'}
      </p>
    </div>
  );
}
