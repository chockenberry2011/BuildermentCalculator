import { useState } from 'react';
import { useStore } from '../store/useStore';
import { BELT_SPEED_PRESETS } from '../data/belts';

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

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setBeltSpeed(value);
      setInputValue(value.toString());
    }
  };

  // Find if current speed matches a preset
  const matchingPreset = BELT_SPEED_PRESETS.find((p) => p.itemsPerMinute === beltSpeed);

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Belt speed input */}
      <div>
        <label
          htmlFor="belt-speed"
          className={`block text-xs sm:text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
        >
          Items per minute
        </label>
        <div className="flex gap-2">
          <input
            id="belt-speed"
            type="number"
            min="1"
            step="1"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-3 py-1.5 sm:py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`flex items-center text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            /min
          </span>
        </div>
      </div>

      {/* Preset selector */}
      <div>
        <label
          htmlFor="belt-preset"
          className={`block text-xs sm:text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
        >
          Or select upgrade level
        </label>
        <select
          id="belt-preset"
          value={matchingPreset?.itemsPerMinute ?? ''}
          onChange={handlePresetSelect}
          className={`w-full px-3 py-1.5 sm:py-2 rounded-lg border ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">Custom value</option>
          {BELT_SPEED_PRESETS.map((preset) => (
            <option key={preset.itemsPerMinute} value={preset.itemsPerMinute}>
              {preset.name} ({preset.itemsPerMinute}/min)
            </option>
          ))}
        </select>
      </div>

      {/* Show belt info toggle */}
      <label className="flex items-center gap-2 cursor-pointer pt-1 sm:pt-2">
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

      {/* Info text */}
      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        The optimizer will prioritize rates where throughputs are clean multiples of belt capacity.
      </p>
    </div>
  );
}
