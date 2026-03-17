import { useStore } from '../store/useStore';
import { useDark } from '../hooks/useDark';

export function QuickScale() {
  const targetRate = useStore((s) => s.targetRate);
  const setTargetRate = useStore((s) => s.setTargetRate);
  const isDark = useDark();

  const handleScale = (multiplier: number) => {
    setTargetRate(targetRate * multiplier);
  };

  return (
    <div className="inline-flex gap-1">
      {[2, 3, 4, 5].map((multiplier) => (
        <button
          key={multiplier}
          onClick={() => handleScale(multiplier)}
          className={`px-2 py-1 text-xs rounded transition font-medium ${
            isDark
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          x{multiplier}
        </button>
      ))}
    </div>
  );
}
