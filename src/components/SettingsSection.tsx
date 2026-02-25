import { useStore } from '../store/useStore';
import { BuildingLevelConfig } from './BuildingLevelConfig';
import { BeltConfig } from './BeltConfig';

export function SettingsSection() {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3">
      <BuildingLevelConfig />
      <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
      <BeltConfig />
    </div>
  );
}
