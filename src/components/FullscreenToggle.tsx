import { useDark } from '../hooks/useDark';

interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenToggle({ isFullscreen, onToggle }: FullscreenToggleProps) {
  const isDark = useDark();

  return (
    <button
      onClick={onToggle}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      className={`flex items-center justify-center w-7 h-7 rounded-lg active:scale-95 transition-[colors,transform] ${
        isDark
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
      }`}
    >
      {isFullscreen ? (
        /* Collapse: arrows pointing inward from corners */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5v4H5M9 9L4 4M15 5v4h4M15 9l5-5M5 15h4v4M9 15l-5 5M19 15h-4v4M15 15l5 5" />
        </svg>
      ) : (
        /* Expand: arrows pointing outward to corners */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M4 4l5 5m7-5h4v4m0-4l-5 5M4 16v4h4m-4 0l5-5m7 5h4v-4m0 4l-5-5" />
        </svg>
      )}
    </button>
  );
}
