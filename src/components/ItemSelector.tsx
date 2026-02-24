import { PRODUCIBLE_ITEMS } from '../data/items';
import { useStore } from '../store/useStore';

export function ItemSelector() {
  const targetItemId = useStore((s) => s.targetItemId);
  const setTargetItem = useStore((s) => s.setTargetItem);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Group items by category
  const itemsByCategory = PRODUCIBLE_ITEMS.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof PRODUCIBLE_ITEMS>
  );

  const categoryLabels: Record<string, string> = {
    intermediate: 'Intermediate',
    component: 'Components',
    advanced: 'Advanced',
    end_product: 'End Products',
  };

  const categoryOrder = ['end_product', 'advanced', 'component', 'intermediate'];

  return (
    <div className="space-y-1">
      <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Item
      </label>
      <select
        value={targetItemId}
        onChange={(e) => setTargetItem(e.target.value)}
        className={`w-full px-3 h-9 sm:h-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-gray-50 border-gray-300 text-gray-900'
          } border`}
      >
        {categoryOrder.map((category) => {
          const items = itemsByCategory[category];
          if (!items?.length) return null;
          return (
            <optgroup key={category} label={categoryLabels[category] || category}>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
