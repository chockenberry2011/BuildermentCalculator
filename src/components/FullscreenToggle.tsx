import { useStore } from '../store/useStore';

interface FullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenToggle({ isFullscreen, onToggle }: FullscreenToggleProps) {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      className={`flex items-center justify-center w-7 h-7 rounded-lg transition ${
        isDark
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
      }`}
    >
      {isFullscreen ? (
        /* Collapse: arrows pointing inward from corners */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l5 5m0-4v4H5m10-5l5 5m-4 0h4v-4M4 20l5-5m-4 0v4h4m7-4l5 5m0-4v4h-4" />
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
