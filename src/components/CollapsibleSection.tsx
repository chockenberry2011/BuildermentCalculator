import { useState } from 'react';
import { useStore } from '../store/useStore';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  headerRight?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  headerRight,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const cardClasses = `${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-3 sm:p-4`;

  return (
    <div className={className}>
      <div
        className={`${cardClasses} cursor-pointer flex items-center justify-between select-none ${isOpen ? 'rounded-b-none' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="flex items-baseline gap-2">
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </span>
          {subtitle && (
            <span className={`hidden sm:inline text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          )}
        </span>
        {headerRight && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div className="ml-auto mr-2" onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </div>
        )}
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className={`${cardClasses} rounded-t-none border-t-0 ${contentClassName ?? ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
