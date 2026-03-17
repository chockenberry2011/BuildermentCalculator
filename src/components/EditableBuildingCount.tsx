import { useState } from 'react';
import { Rational } from '../core/math/rational';
import { fractionSimplicityScore } from '../core/RatioOptimizer';
import { getCountColor } from '../core/countColor';
import { StepperButton } from './StepperButton';

interface EditableBuildingCountProps {
  count: Rational;
  isConstraint: boolean;
  onSetCount: (count: number) => void;
  isDark: boolean;
}

export function EditableBuildingCount({ count, isConstraint, onSetCount, isDark }: EditableBuildingCountProps) {
  const value = count.toNumber();
  const isInteger = count.isInteger() || Math.abs(value - Math.round(value)) < 0.001;
  const displayValue = isInteger ? Math.round(value).toString() : value.toFixed(2);
  const [editValue, setEditValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);

  const score = fractionSimplicityScore(count);
  const color = getCountColor(score, isDark);

  // Derive the shown value: when not focused, always show the prop value
  const shownValue = isFocused ? editValue : displayValue;

  const handleConfirm = () => {
    const newCount = parseFloat(editValue);
    if (!isNaN(newCount) && newCount > 0) {
      onSetCount(newCount);
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
    const next = Math.max(1, value + delta);
    onSetCount(next);
  };

  return (
    <div className={`flex items-center gap-0.5 ${isConstraint ? 'ring-2 ring-blue-500 rounded-full px-0.5' : ''}`}>
      <StepperButton direction="decrement" onClick={() => step(-1)} isDark={isDark} />
      <input
        type="number"
        value={shownValue}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={(e) => { setEditValue(displayValue); setIsFocused(true); e.target.select(); }}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        style={{ color }}
        className="w-12 sm:w-14 h-5 px-0 text-center font-mono text-xs sm:text-sm font-semibold bg-transparent border-none outline-none"
        title="Edit to set as constraint"
        step="1"
        min="0"
      />
      <StepperButton direction="increment" onClick={() => step(1)} isDark={isDark} />
    </div>
  );
}
