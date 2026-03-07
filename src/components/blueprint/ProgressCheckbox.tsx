import type { BlueprintProgressState } from '../../store/useStore';

export function getProgressColors(progressState: BlueprintProgressState | false, isDark: boolean): { bgClass: string; borderColor: string } {
  if (progressState === 'completed') {
    return {
      bgClass: isDark ? 'bg-green-900/60' : 'bg-green-100',
      borderColor: isDark ? '#166534' : '#86EFAC',
    };
  }
  if (progressState === 'in_progress') {
    return {
      bgClass: isDark ? 'bg-amber-900/40' : 'bg-amber-50',
      borderColor: isDark ? '#92400E' : '#FCD34D',
    };
  }
  return {
    bgClass: isDark ? 'bg-gray-800' : 'bg-white',
    borderColor: isDark ? '#374151' : '#D1D5DB',
  };
}

export function ProgressCheckbox({ progressState, isDark, size }: { progressState: BlueprintProgressState | false; isDark: boolean; size: number }) {
  if (progressState === 'completed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#22C55E" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2.5" />
      </svg>
    );
  }
  if (progressState === 'in_progress') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={isDark ? '#92400E' : '#FEF3C7'} stroke={isDark ? '#F59E0B' : '#D97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="8" y1="10" x2="16" y2="10" stroke={isDark ? '#FCD34D' : '#92400E'} strokeWidth="2" />
        <line x1="8" y1="14" x2="16" y2="14" stroke={isDark ? '#FCD34D' : '#92400E'} strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#6B7280' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  );
}
