import { useState } from 'react';
import { Recipe } from '../data/recipes';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { getItemColor } from '../data/itemColors';

function getOutputRate(recipe: Recipe, level: number): number {
  const multiplier = BUILDINGS[recipe.building].speedMultipliers[level - 1];
  return (1 / recipe.craftTime) * 60 * multiplier;
}

function getInputRate(recipe: Recipe, ingredientQuantity: number, level: number): number {
  const multiplier = BUILDINGS[recipe.building].speedMultipliers[level - 1];
  return (ingredientQuantity / recipe.craftTime) * 60 * multiplier / recipe.outputQuantity;
}

function formatRate(rate: number): string {
  if (Math.abs(rate - Math.round(rate)) < 0.01) {
    return Math.round(rate).toString();
  }
  return rate.toFixed(2);
}

interface RecipeCardProps {
  recipe: Recipe;
  currentLevel: number;
  isDark: boolean;
}

export function RecipeCard({ recipe, currentLevel, isDark }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const building = BUILDINGS[recipe.building];
  const maxLevel = building.maxLevel;
  const outputRate = getOutputRate(recipe, currentLevel);
  const itemColor = getItemColor(recipe.outputId);

  return (
    <div
      className={`rounded-md px-3 py-2 text-xs cursor-pointer transition-colors ${
        isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
      }`}
      style={{ borderLeft: `3px solid ${itemColor}` }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header: item name + building */}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {ITEMS[recipe.outputId]?.name ?? recipe.outputId}
          {recipe.isAlternate && (
            <span className={`ml-1.5 text-[10px] font-normal px-1 py-0.5 rounded ${
              isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}>
              ALT
            </span>
          )}
        </span>
        <span className={`flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {building.name}{currentLevel > 1 ? ` Lv${currentLevel}` : ''}
        </span>
      </div>

      {/* Recipe at current level */}
      <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {recipe.ingredients.map((ing, i) => (
          <span key={ing.itemId}>
            {i > 0 && ' + '}
            {ing.quantity}x {ITEMS[ing.itemId]?.name ?? ing.itemId}
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
              {' '}({formatRate(getInputRate(recipe, ing.quantity, currentLevel))}/min)
            </span>
          </span>
        ))}
        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}> → </span>
        {recipe.outputQuantity}x {ITEMS[recipe.outputId]?.name ?? recipe.outputId}
        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {' '}({formatRate(outputRate)}/min)
        </span>
      </div>

      {/* Alternate name */}
      {recipe.isAlternate && recipe.alternateName && (
        <div className={`mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {recipe.alternateName}
        </div>
      )}

      {/* Expanded: all levels */}
      {expanded && maxLevel > 1 && (
        <div className={`mt-1.5 pt-1.5 border-t flex flex-wrap gap-x-3 gap-y-0.5 ${
          isDark ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-500'
        }`}>
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lv) => {
            const rate = getOutputRate(recipe, lv);
            const isCurrentLevel = lv === currentLevel;
            return (
              <span key={lv} className={isCurrentLevel ? (isDark ? 'text-blue-400 font-medium' : 'text-blue-600 font-medium') : ''}>
                Lv{lv}: {formatRate(rate)}/min
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
