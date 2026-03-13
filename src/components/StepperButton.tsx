/**
 * Small circular stepper buttons (+ / −) with SVG icons.
 * Used by EditableBuildingCount and EditableResourceRate.
 */

interface StepperButtonProps {
  direction: 'increment' | 'decrement';
  onClick: () => void;
  isDark: boolean;
}

export function StepperButton({ direction, onClick, isDark }: StepperButtonProps) {
  return (
    <button
      onClick={onClick}
      tabIndex={-1}
      title={direction === 'increment' ? 'Increase' : 'Decrease'}
      className={`w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-[colors,transform] flex-shrink-0 ${
        isDark
          ? 'bg-gray-700 text-blue-400 hover:bg-blue-900/60 hover:text-blue-300 active:bg-blue-800/60'
          : 'bg-gray-100 text-blue-500 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'
      }`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {direction === 'decrement' ? (
          <line x1="2" y1="5" x2="8" y2="5" />
        ) : (
          <>
            <line x1="2" y1="5" x2="8" y2="5" />
            <line x1="5" y1="2" x2="5" y2="8" />
          </>
        )}
      </svg>
    </button>
  );
}
