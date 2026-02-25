import { BuildingType } from '../data/buildings';
import { BUILDINGS } from '../data/buildings';
import { useStore } from '../store/useStore';
import { BuildingIcon } from './BuildingIcon';

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
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {relevantBuildings.map((buildingId) => {
        const building = BUILDINGS[buildingId];
        const level = buildingLevels.get(buildingId) ?? 1;

        return (
          <div key={buildingId} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <BuildingIcon buildingType={buildingId} />
              <select
                value={level}
                onChange={(e) =>
                  setBuildingLevel(buildingId, parseInt(e.target.value, 10))
                }
                className={`px-1 py-0.5 rounded text-xs focus:ring-2 focus:ring-blue-500
                  ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                  } border`}
                title={building.name}
              >
                {Array.from({ length: building.maxLevel }, (_, i) => i + 1).map(
                  (lvl) => (
                    <option key={lvl} value={lvl}>
                      Lv{lvl}
                    </option>
                  )
                )}
              </select>
            </div>
            <span className={`text-[10px] leading-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {building.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
