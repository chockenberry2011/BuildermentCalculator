import { useState, useMemo } from 'react';
import { ALL_RECIPES, Recipe } from '../data/recipes';
import { ITEMS } from '../data/items';
import { BUILDINGS, BuildingType, getExtractorRates } from '../data/buildings';
import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';
import { RecipeCard } from './RecipeCard';

function formatRate(rate: number): string {
  if (Math.abs(rate - Math.round(rate)) < 0.01) {
    return Math.round(rate).toString();
  }
  return rate.toFixed(2);
}

export function RecipeBook() {
  const buildingLevels = useStore((s) => s.buildingLevels);
  const worldGen2 = useStore((s) => s.worldGen2);
  const isDark = useDark();
  const [search, setSearch] = useState('');

  // Group recipes by building type, filtered by search
  const filteredRecipes = useMemo(() => {
    const query = search.toLowerCase().trim();
    let recipes = ALL_RECIPES;

    if (query) {
      recipes = recipes.filter((r) => {
        const itemName = ITEMS[r.outputId]?.name ?? r.outputId;
        const altName = r.alternateName ?? '';
        const ingredientNames = r.ingredients.map((i) => ITEMS[i.itemId]?.name ?? i.itemId).join(' ');
        return (
          itemName.toLowerCase().includes(query) ||
          altName.toLowerCase().includes(query) ||
          ingredientNames.toLowerCase().includes(query)
        );
      });
    }

    // Group by building type
    const grouped = new Map<BuildingType, Recipe[]>();
    for (const recipe of recipes) {
      const list = grouped.get(recipe.building) ?? [];
      list.push(recipe);
      grouped.set(recipe.building, list);
    }
    return grouped;
  }, [search]);

  // Also show raw resources / extractors
  const rawItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    const raws = Object.values(ITEMS).filter((i) => i.category === 'raw');
    if (query) {
      return raws.filter((i) => i.name.toLowerCase().includes(query));
    }
    return raws;
  }, [search]);

  const extractorLevel = buildingLevels.get('extractor') ?? 1;

  // Building order for display
  const buildingOrder: BuildingType[] = [
    'workshop', 'furnace', 'forge', 'machine_shop',
    'industrial_factory', 'manufacturer', 'earth_teleporter',
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`w-full text-sm rounded-md px-3 py-1.5 border ${
          isDark
            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
      />

      {/* Extractors */}
      {rawItems.length > 0 && (
        <div>
          <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Extractor{extractorLevel > 1 ? ` Lv${extractorLevel}` : ''}
          </div>
          <div className="space-y-1">
            {rawItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {item.name}
                </span>
                <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatRate(getExtractorRates(worldGen2)[extractorLevel - 1])}/min per extractor
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipes grouped by building */}
      {buildingOrder.map((bt) => {
        const recipes = filteredRecipes.get(bt);
        if (!recipes || recipes.length === 0) return null;
        const level = buildingLevels.get(bt) ?? 1;
        return (
          <div key={bt}>
            <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {BUILDINGS[bt].name}{level > 1 ? ` Lv${level}` : ''}
            </div>
            <div className="space-y-1">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  currentLevel={level}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredRecipes.size === 0 && rawItems.length === 0 && (
        <div className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          No recipes match "{search}"
        </div>
      )}
    </div>
  );
}
