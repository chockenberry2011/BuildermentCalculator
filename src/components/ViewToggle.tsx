import { useStore, ViewMode } from '../store/useStore';
import { useDark } from '../hooks/useDark';

export function ViewToggle() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const isDark = useDark();

  const modes: { id: ViewMode; label: string }[] = [
    { id: 'tree', label: 'Tree' },
    { id: 'blueprint', label: 'Blueprint' },
  ];

  return (
    <div className={`relative grid grid-cols-2 rounded-lg overflow-hidden border ${
      isDark ? 'border-gray-600' : 'border-gray-300'
    }`}>
      {/* Sliding active indicator */}
      <div
        className="absolute inset-y-0 w-1/2 bg-blue-600 rounded-lg transition-transform duration-200 ease-out"
        style={{
          transform: viewMode === 'tree' ? 'translateX(0)' : 'translateX(100%)',
        }}
      />
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setViewMode(mode.id)}
          className={`relative z-10 text-center px-4 py-1 text-xs font-medium active:scale-95 transition-[colors,transform] duration-200
            ${viewMode === mode.id
              ? 'text-white'
              : isDark
                ? 'text-gray-300 hover:text-gray-100'
                : 'text-gray-700 hover:text-gray-900'
            }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
