import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BadgePopoverProps {
  children: ReactNode;
  tooltipContent: ReactNode;
  popoverContent: ReactNode;
  isDark: boolean;
}

/**
 * Compute { top, left } for a floating element anchored below `anchor`.
 * Flips to right-aligned if it would overflow the viewport.
 */
function getFloatingPosition(
  anchor: DOMRect,
  floating: DOMRect | null,
  gap: number = 4,
) {
  const top = anchor.bottom + gap + window.scrollY;
  let left = anchor.left + window.scrollX;

  if (floating && left + floating.width > window.innerWidth - 8) {
    left = anchor.right + window.scrollX - floating.width;
  }

  return { top, left: Math.max(4, left) };
}

export function BadgePopover({ children, tooltipContent, popoverContent, isDark }: BadgePopoverProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover handlers — tooltip only when popover is closed
  const handleMouseEnter = useCallback(() => {
    if (showPopover) return;
    hoverTimer.current = setTimeout(() => setShowTooltip(true), 300);
  }, [showPopover]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowTooltip(false);
  }, []);

  // Click toggles popover
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover((prev) => !prev);
    setShowTooltip(false);
  }, []);

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowPopover((prev) => !prev);
      setShowTooltip(false);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!showPopover) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPopover(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPopover]);

  // Close on click outside
  useEffect(() => {
    if (!showPopover) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setShowPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  // Continuously track trigger position while tooltip or popover is visible
  useEffect(() => {
    const isTooltipVisible = showTooltip && !showPopover;
    const isPopoverVisible = showPopover;
    if ((!isTooltipVisible && !isPopoverVisible) || !triggerRef.current) return;

    let rafId: number;
    let prevTop = NaN;
    let prevLeft = NaN;

    function tick() {
      if (!triggerRef.current) return;
      const anchor = triggerRef.current.getBoundingClientRect();
      const floatingEl = isPopoverVisible ? popoverRef.current : tooltipRef.current;
      const floating = floatingEl?.getBoundingClientRect() ?? null;
      const next = getFloatingPosition(anchor, floating);
      if (next.top !== prevTop || next.left !== prevLeft) {
        prevTop = next.top;
        prevLeft = next.left;
        setPos(next);
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [showTooltip, showPopover]);

  const tooltipBg = isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-900 text-white border-gray-800';
  const popoverBg = isDark ? 'bg-gray-800 text-gray-200 border-gray-600' : 'bg-white text-gray-900 border-gray-200';

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-expanded={showPopover}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer inline-flex"
      >
        {children}
      </span>

      {/* Tooltip — portalled to body */}
      {showTooltip && !showPopover && createPortal(
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] pointer-events-none whitespace-nowrap text-xs px-2 py-1 rounded border shadow-md ${tooltipBg}`}
          style={{ top: pos.top, left: pos.left, position: 'absolute' }}
        >
          {tooltipContent}
        </div>,
        document.body,
      )}

      {/* Popover — portalled to body */}
      {showPopover && createPortal(
        <div
          ref={popoverRef}
          className={`z-[9999] min-w-[220px] rounded-lg border shadow-xl p-3 text-xs ${popoverBg}`}
          style={{ top: pos.top, left: pos.left, position: 'absolute' }}
        >
          <button
            onClick={() => setShowPopover(false)}
            className={`absolute top-1.5 right-1.5 p-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
          {popoverContent}
        </div>,
        document.body,
      )}
    </>
  );
}
