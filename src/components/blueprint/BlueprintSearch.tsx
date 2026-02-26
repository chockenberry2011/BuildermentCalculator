import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Panel } from '@xyflow/react';

interface SearchItem {
  id: string;
  name: string;
}

interface BlueprintSearchProps {
  items: SearchItem[];
  isDark: boolean;
  onSelect: (nodeId: string) => void;
}

export function BlueprintSearch({ items, isDark, onSelect }: BlueprintSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(lower));
  }, [items, query]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return !prev;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  // Cmd/Ctrl+F shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        // Only intercept if the blueprint container or its children are focused
        const panel = document.querySelector('.react-flow');
        if (panel && panel.contains(document.activeElement)) {
          e.preventDefault();
          toggle();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const bg = isDark ? 'bg-gray-800' : 'bg-white';
  const border = isDark ? 'border-gray-600' : 'border-gray-300';
  const text = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  return (
    <Panel position="top-right">
      {!isOpen ? (
        <button
          onClick={toggle}
          className={`${bg} border ${border} rounded-md p-1.5 shadow-sm ${subtext} hover:${text}`}
          title="Search nodes (Cmd+F)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : (
        <div className={`${bg} border ${border} rounded-lg shadow-lg w-56`}>
          <div className="flex items-center gap-1.5 p-2 border-b border-inherit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={subtext}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setQuery('');
                } else if (e.key === 'Enter' && matches.length > 0) {
                  handleSelect(matches[0].id);
                }
              }}
              placeholder="Search items..."
              className={`flex-1 text-sm bg-transparent outline-none ${text} placeholder:${subtext}`}
            />
            <button
              onClick={() => { setIsOpen(false); setQuery(''); }}
              className={`${subtext} hover:${text} text-xs`}
            >
              Esc
            </button>
          </div>
          {matches.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {matches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm ${text} ${hoverBg} truncate`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          {query && matches.length === 0 && (
            <div className={`px-3 py-2 text-sm ${subtext} italic`}>
              No matches
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
