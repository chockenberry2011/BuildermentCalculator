import { useStore, ViewMode } from '../store/useStore';

export function ViewToggle() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const modes: { id: ViewMode; label: string }[] = [
    { id: 'tree', label: 'Tree View' },
    { id: 'blueprint', label: 'Blueprint' },
  ];

  return (
    <div className={`flex rounded-lg overflow-hidden border ${
      isDark ? 'border-gray-600' : 'border-gray-300'
    }`}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setViewMode(mode.id)}
          className={`px-4 py-2 text-sm font-medium transition
            ${viewMode === mode.id
              ? 'bg-blue-600 text-white'
              : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
