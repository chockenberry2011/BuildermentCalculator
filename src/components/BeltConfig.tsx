import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';

export function BeltConfig() {
  const beltSpeed = useStore((s) => s.beltSpeed);
  const showBeltInfo = useStore((s) => s.showBeltInfo);
  const setBeltSpeed = useStore((s) => s.setBeltSpeed);
  const toggleBeltInfo = useStore((s) => s.toggleBeltInfo);
  const isDark = useDark();

  const [inputValue, setInputValue] = useState(beltSpeed.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value > 0) {
      setBeltSpeed(value);
    } else {
      setInputValue(beltSpeed.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor="belt-speed"
          className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
        >
          Belt speed
        </label>
        <input
          id="belt-speed"
          type="number"
          min="1"
          step="1"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`w-20 px-2 py-1 rounded-lg border text-sm ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          /min
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={showBeltInfo}
        onClick={toggleBeltInfo}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div
          className={`relative w-9 h-5 rounded-full transition-colors ${
            showBeltInfo
              ? 'bg-blue-600'
              : isDark
                ? 'bg-gray-600'
                : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              showBeltInfo ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Show belt requirements
        </span>
      </button>
    </div>
  );
}
