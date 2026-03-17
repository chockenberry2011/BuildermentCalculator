import { BuildingType } from '../data/buildings';
import { BUILDINGS } from '../data/buildings';
import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';
import { BuildingIcon } from './BuildingIcon';

export function BuildingLevelConfig() {
  const buildingLevels = useStore((s) => s.buildingLevels);
  const setBuildingLevel = useStore((s) => s.setBuildingLevel);
  const isDark = useDark();

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
              <div
                className={`flex rounded overflow-hidden border ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                }`}
              >
                {Array.from({ length: building.maxLevel }, (_, i) => i + 1).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setBuildingLevel(buildingId, lvl)}
                      className={`w-6 h-6 text-[10px] font-medium transition-colors ${
                        lvl === level
                          ? 'bg-blue-600 text-white'
                          : isDark
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`${building.name} Level ${lvl}`}
                    >
                      {lvl}
                    </button>
                  )
                )}
              </div>
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
