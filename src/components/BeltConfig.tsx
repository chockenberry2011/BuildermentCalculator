import { useState } from 'react';
import { useStore } from '../store/useStore';

export function BeltConfig() {
  const beltSpeed = useStore((s) => s.beltSpeed);
  const showBeltInfo = useStore((s) => s.showBeltInfo);
  const setBeltSpeed = useStore((s) => s.setBeltSpeed);
  const toggleBeltInfo = useStore((s) => s.toggleBeltInfo);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

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
          className={`w-20 px-2 py-1 rounded border text-sm ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          /min
        </span>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showBeltInfo}
          onChange={toggleBeltInfo}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Show belt requirements
        </span>
      </label>
    </div>
  );
}
