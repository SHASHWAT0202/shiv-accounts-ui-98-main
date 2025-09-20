import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';

export interface VirtualScrollItem {
  id: string | number;
  [key: string]: unknown;
}

export interface VirtualScrollProps<T extends VirtualScrollItem> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Number of items to render outside of visible area
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

/**
 * Virtual scrolling component for handling large datasets efficiently
 * Only renders visible items plus a small buffer for smooth scrolling
 */
export function VirtualScroll<T extends VirtualScrollItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);
  }, [onScroll]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const scrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        {loadingComponent || <div>Loading...</div>}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        {emptyComponent || <div>No items to display</div>}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                height: itemHeight,
                overflow: 'hidden',
              }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Example usage component for large contact lists
interface Contact extends VirtualScrollItem {
  name: string;
  email: string;
  phone: string;
  type: 'Customer' | 'Vendor';
}

interface VirtualContactListProps {
  contacts: Contact[];
  onContactSelect?: (contact: Contact) => void;
  searchTerm?: string;
}

export function VirtualContactList({ 
  contacts, 
  onContactSelect, 
  searchTerm = '' 
}: VirtualContactListProps) {
  const { items, totalItems, hasMore, loadMore } = useVirtualScroll(
    contacts,
    searchTerm,
    (contact, search) => 
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone.includes(search)
  );

  const renderContact = useCallback((contact: Contact, index: number) => (
    <div 
      className="flex items-center p-3 border-b hover:bg-muted/50 cursor-pointer"
      onClick={() => onContactSelect?.(contact)}
    >
      <div className="flex-1">
        <div className="font-medium">{contact.name}</div>
        <div className="text-sm text-muted-foreground">{contact.email}</div>
        <div className="text-sm text-muted-foreground">{contact.phone}</div>
      </div>
      <div className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
        {contact.type}
      </div>
    </div>
  ), [onContactSelect]);

  // Handle scroll to bottom for infinite loading
  const handleScroll = useCallback((scrollTop: number) => {
    const scrollElement = document.querySelector('.virtual-contact-list') as HTMLDivElement;
    if (scrollElement) {
      const { scrollHeight, clientHeight } = scrollElement;
      if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore) {
        loadMore();
      }
    }
  }, [hasMore, loadMore]);

  return (
    <div className="virtual-contact-list">
      <div className="p-2 text-sm text-muted-foreground border-b">
        {totalItems} contact{totalItems !== 1 ? 's' : ''} found
      </div>
      <VirtualScroll
        items={items}
        itemHeight={80}
        containerHeight={400}
        renderItem={renderContact}
        onScroll={handleScroll}
        className="border rounded-md"
        emptyComponent={
          <div className="p-8 text-center text-muted-foreground">
            No contacts found
          </div>
        }
      />
    </div>
  );
}