import { useStore } from '../store/useStore';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mobileOnly?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  mobileOnly = false,
}: CollapsibleSectionProps) {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const cardClasses = `${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-3 sm:p-4`;

  if (mobileOnly) {
    return (
      <>
        {/* Mobile: collapsible */}
        <details className="md:hidden" open={defaultOpen || undefined}>
          <summary
            className={`${cardClasses} list-none cursor-pointer flex items-center justify-between group`}
          >
            <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </span>
            <svg
              className={`w-4 h-4 transition-transform group-open:rotate-180 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className={`${cardClasses} mt-1 rounded-t-none border-t-0`}>
            {children}
          </div>
        </details>

        {/* Desktop: always open card */}
        <div className={`hidden md:block ${cardClasses}`}>
          <h3 className={`font-semibold text-sm mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          {children}
        </div>
      </>
    );
  }

  // Non-mobileOnly: always collapsible
  return (
    <details open={defaultOpen || undefined}>
      <summary
        className={`${cardClasses} list-none cursor-pointer flex items-center justify-between group`}
      >
        <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </span>
        <svg
          className={`w-4 h-4 transition-transform group-open:rotate-180 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className={`${cardClasses} mt-1 rounded-t-none border-t-0`}>
        {children}
      </div>
    </details>
  );
}
