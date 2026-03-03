import { useStore } from '../store/useStore';
import { BuildingLevelConfig } from './BuildingLevelConfig';
import { BeltConfig } from './BeltConfig';

export function SettingsSection() {
  const theme = useStore((s) => s.theme);
  const worldGen2 = useStore((s) => s.worldGen2);
  const setWorldGen2 = useStore((s) => s.setWorldGen2);
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3">
      <button
        type="button"
        role="switch"
        aria-checked={worldGen2}
        onClick={() => setWorldGen2(!worldGen2)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div
          className={`relative w-9 h-5 rounded-full transition-colors ${
            worldGen2
              ? 'bg-blue-600'
              : isDark
                ? 'bg-gray-600'
                : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              worldGen2 ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          World Gen 2.0
        </span>
      </button>
      <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
      <BuildingLevelConfig />
      <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
      <BeltConfig />
    </div>
  );
}
