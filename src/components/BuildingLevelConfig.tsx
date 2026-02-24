import { BUILDINGS, BuildingType } from '../data/buildings';
import { useStore } from '../store/useStore';

export function BuildingLevelConfig() {
  const buildingLevels = useStore((s) => s.buildingLevels);
  const setBuildingLevel = useStore((s) => s.setBuildingLevel);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const relevantBuildings: BuildingType[] = [
    'extractor',
    'workshop',
    'furnace',
    'machine_shop',
    'industrial_factory',
    'manufacturer',
    'forge',
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-1.5">
      {relevantBuildings.map((buildingId) => {
        const building = BUILDINGS[buildingId];
        const level = buildingLevels.get(buildingId) ?? 1;

        return (
          <div key={buildingId} className="flex items-center justify-between">
            <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {building.name}
            </span>
            <select
              value={level}
              onChange={(e) =>
                setBuildingLevel(buildingId, parseInt(e.target.value, 10))
              }
              className={`px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500
                ${isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
                } border`}
            >
              {Array.from({ length: building.maxLevel }, (_, i) => i + 1).map(
                (lvl) => (
                  <option key={lvl} value={lvl}>
                    Lv {lvl}
                  </option>
                )
              )}
            </select>
          </div>
        );
      })}
    </div>
  );
}
