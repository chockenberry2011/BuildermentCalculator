import { useStore } from '../store/useStore';
import { BuildingLevelConfig } from './BuildingLevelConfig';
import { BeltConfig } from './BeltConfig';

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
    </div>
  );
}

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
          <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400 border border-amber-500/30 dark:border-amber-400/30">
            BETA
          </span>
        </span>
      </button>
      <SectionLabel label="Building Levels" isDark={isDark} />
      <BuildingLevelConfig />
      <SectionLabel label="Belt Speed" isDark={isDark} />
      <BeltConfig />
    </div>
  );
}
