import { getRecipesForItem, hasAlternateRecipes } from '../data/recipes';
import { ITEMS } from '../data/items';
import { useStore } from '../store/useStore';

interface RecipePickerProps {
  itemId: string;
}

export function RecipePicker({ itemId }: RecipePickerProps) {
  const recipeSelections = useStore((s) => s.recipeSelections);
  const setRecipeSelection = useStore((s) => s.setRecipeSelection);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!hasAlternateRecipes(itemId)) {
    return null;
  }

  const recipes = getRecipesForItem(itemId);
  const selectedId = recipeSelections.get(itemId) ?? recipes[0]?.id;
  const item = ITEMS[itemId];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
        {item?.name ?? itemId}:
      </span>
      <select
        value={selectedId}
        onChange={(e) => setRecipeSelection(itemId, e.target.value)}
        className={`px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500
          ${isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-gray-50 border-gray-300 text-gray-900'
          } border`}
      >
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>
            {recipe.isAlternate ? recipe.alternateName : 'Default'}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RecipePickerList() {
  const productionResult = useStore((s) => s.productionResult);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!productionResult) return null;

  // Find all items with alternate recipes in the production chain
  const itemsWithAlternates = new Set<string>();
  for (const itemId of productionResult.allNodes.keys()) {
    if (hasAlternateRecipes(itemId)) {
      itemsWithAlternates.add(itemId);
    }
  }

  if (itemsWithAlternates.size === 0) {
    return (
      <div className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        No alternate recipes available for this chain
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Array.from(itemsWithAlternates)
        .sort()
        .map((itemId) => (
          <RecipePicker key={itemId} itemId={itemId} />
        ))}
    </div>
  );
}
