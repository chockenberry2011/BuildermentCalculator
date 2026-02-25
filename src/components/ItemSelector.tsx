import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PRODUCIBLE_ITEMS } from '../data/items';
import { useStore } from '../store/useStore';

const categoryLabels: Record<string, string> = {
  intermediate: 'Intermediate',
  component: 'Components',
  advanced: 'Advanced',
  end_product: 'End Products',
};

const categoryOrder = ['end_product', 'advanced', 'component', 'intermediate'];

interface ItemSelectorProps {
  value?: string;
  onSelect?: (itemId: string) => void;
}

export function ItemSelector({ value, onSelect }: ItemSelectorProps) {
  const storeItemId = useStore((s) => s.targetItemId);
  const storeSetTargetItem = useStore((s) => s.setTargetItem);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const selectedId = value ?? storeItemId;
  const handleSelect = onSelect ?? storeSetTargetItem;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = useMemo(
    () => PRODUCIBLE_ITEMS.find((item) => item.id === selectedId),
    [selectedId]
  );

  // Build filtered + grouped list
  const filteredGroups = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    const groups: { category: string; label: string; items: typeof PRODUCIBLE_ITEMS }[] = [];

    for (const cat of categoryOrder) {
      const items = PRODUCIBLE_ITEMS.filter(
        (item) => item.category === cat && item.name.toLowerCase().includes(lowerQuery)
      );
      if (items.length > 0) {
        groups.push({ category: cat, label: categoryLabels[cat] || cat, items });
      }
    }
    return groups;
  }, [query]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [flatItems.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || flatItems.length === 0) return;
    const el = dropdownRef.current?.querySelector(`[data-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, isOpen, flatItems.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectItem = useCallback(
    (itemId: string) => {
      handleSelect(itemId);
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    },
    [handleSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[highlightIndex]) {
          selectItem(flatItems[highlightIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // Build a running index counter for data-index
  let runningIndex = 0;

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Item
      </label>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? query : selectedItem?.name ?? ''}
        placeholder={isOpen ? 'Search items...' : ''}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
        }}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 h-9 sm:h-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
          } border`}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && flatItems[highlightIndex] ? `item-${flatItems[highlightIndex].id}` : undefined}
      />
      <p className="hidden sm:block text-xs h-4 invisible">&nbsp;</p>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-20 w-full max-h-60 overflow-y-auto rounded-lg shadow-lg border mt-1
            ${isDark
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
            }`}
          role="listbox"
        >
          {flatItems.length === 0 ? (
            <div className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No items found
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category}>
                <div
                  className={`px-3 py-1 text-xs font-semibold sticky top-0
                    ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const idx = runningIndex++;
                  const isHighlighted = idx === highlightIndex;
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      id={`item-${item.id}`}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      className={`px-3 py-1.5 text-sm cursor-pointer
                        ${isHighlighted
                          ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-gray-900'
                          : isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-50'
                        }
                        ${isSelected && !isHighlighted ? (isDark ? 'text-blue-400' : 'text-blue-600') : ''}
                      `}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectItem(item.id);
                      }}
                      onMouseEnter={() => setHighlightIndex(idx)}
                    >
                      {item.name}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
