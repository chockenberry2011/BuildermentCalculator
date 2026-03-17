import { getRecipesForItem, hasAlternateRecipes, Recipe } from '../data/recipes';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';

interface RecipePickerProps {
  itemId: string;
}

function RecipeDetails({ recipe, isDark }: { recipe: Recipe; isDark: boolean }) {
  const ingredients = recipe.ingredients
    .map((ing) => `${ing.quantity}× ${ITEMS[ing.itemId]?.name ?? ing.itemId}`)
    .join(' + ');
  const output = `${recipe.outputQuantity}× ${ITEMS[recipe.outputId]?.name ?? recipe.outputId}`;
  const building = BUILDINGS[recipe.building]?.name ?? recipe.building;

  return (
    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      {ingredients} → {output} ({building})
    </div>
  );
}

export function RecipePicker({ itemId }: RecipePickerProps) {
  const recipeSelections = useStore((s) => s.recipeSelections);
  const setRecipeSelection = useStore((s) => s.setRecipeSelection);
  const isDark = useDark();

  if (!hasAlternateRecipes(itemId)) {
    return null;
  }

  const recipes = getRecipesForItem(itemId);
  const selectedId = recipeSelections.get(itemId) ?? recipes[0]?.id;
  const selectedRecipe = recipes.find((r) => r.id === selectedId) ?? recipes[0];
  const item = ITEMS[itemId];

  return (
    <div className="text-sm">
      <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
        {item?.name ?? itemId}:
      </div>
      <div className={`mt-1 inline-flex rounded-lg overflow-hidden border ${
        isDark ? 'border-gray-600' : 'border-gray-300'
      }`}>
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => setRecipeSelection(itemId, recipe.id)}
            className={`px-3 py-1 text-xs font-medium transition
              ${selectedId === recipe.id
                ? 'bg-blue-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
          >
            {recipe.isAlternate ? 'Alternate' : 'Standard'}
          </button>
        ))}
      </div>
      {selectedRecipe && <RecipeDetails recipe={selectedRecipe} isDark={isDark} />}
    </div>
  );
}

export function RecipePickerList() {
  const productionResult = useStore((s) => s.productionResult);
  const isDark = useDark();

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
