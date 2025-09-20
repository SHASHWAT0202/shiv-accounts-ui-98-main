import { useState, useMemo, useCallback } from 'react';

export interface VirtualScrollItem {
  id: string | number;
  [key: string]: unknown;
}

// Hook for virtual scrolling with search and filtering
export function useVirtualScroll<T extends VirtualScrollItem>(
  allItems: T[],
  searchTerm: string = '',
  filterFn?: (item: T, search: string) => boolean
) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(1000); // Load items in chunks

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return allItems;
    
    const defaultFilter = (item: T, search: string) => {
      return Object.values(item).some(value => 
        String(value).toLowerCase().includes(search.toLowerCase())
      );
    };
    
    const filter = filterFn || defaultFilter;
    return allItems.filter(item => filter(item, searchTerm));
  }, [allItems, searchTerm, filterFn]);

  // Paginated items for current page
  const paginatedItems = useMemo(() => {
    const startIndex = 0;
    const endIndex = page * pageSize;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, page, pageSize]);

  const loadMore = useCallback(() => {
    if (paginatedItems.length < filteredItems.length) {
      setPage(prev => prev + 1);
    }
  }, [paginatedItems.length, filteredItems.length]);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    items: paginatedItems,
    totalItems: filteredItems.length,
    hasMore: paginatedItems.length < filteredItems.length,
    loadMore,
    reset,
    isFiltered: !!searchTerm,
  };
}