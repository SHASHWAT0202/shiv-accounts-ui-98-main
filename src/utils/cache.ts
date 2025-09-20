/**
 * Advanced caching utility for client-side data management
 * Supports TTL, LRU eviction, and memory management
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // in milliseconds
  maxMemoryUsage?: number; // in MB
}

export class LRUCache<T = unknown> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private maxMemoryUsage: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxMemoryUsage = options.maxMemoryUsage || 50; // 50MB
  }

  /**
   * Store data in cache with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: now,
    };

    // Remove existing item if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new item
    this.cache.set(key, cacheItem);

    // Enforce size limits
    this.evictIfNecessary();
  }

  /**
   * Retrieve data from cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    
    // Check if item has expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = now;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalMemory = 0;
    let expiredCount = 0;
    let activeCount = 0;

    for (const [key, item] of this.cache.entries()) {
      // Estimate memory usage (rough approximation)
      totalMemory += this.estimateSize(item.data) + key.length * 2; // UTF-16

      if (now - item.timestamp > item.ttl) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      memoryUsageMB: totalMemory / (1024 * 1024),
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict items if cache exceeds limits
   */
  private evictIfNecessary(): void {
    // Clean up expired items first
    this.cleanup();

    // Check memory usage
    const stats = this.getStats();
    if (stats.memoryUsageMB > this.maxMemoryUsage) {
      this.evictLRU(Math.ceil(this.cache.size * 0.2)); // Remove 20% of items
    }

    // Check size limit
    if (this.cache.size > this.maxSize) {
      this.evictLRU(this.cache.size - this.maxSize);
    }
  }

  /**
   * Evict least recently used items
   */
  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (ascending)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest items
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Estimate memory usage of data (rough approximation)
   */
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16 approximation
    } catch {
      return 1024; // Default 1KB for unserializable data
    }
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private getHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    let totalAccess = 0;
    for (const item of this.cache.values()) {
      totalAccess += item.accessCount;
    }
    
    return totalAccess / this.cache.size;
  }
}

// Global cache instances for different data types
export const apiCache = new LRUCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxMemoryUsage: 20, // 20MB
});

export const userDataCache = new LRUCache({
  maxSize: 1000,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxMemoryUsage: 30, // 30MB
});

export const staticDataCache = new LRUCache({
  maxSize: 200,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  maxMemoryUsage: 10, // 10MB
});

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  invoices: (userId: string, page: number) => `invoices:${userId}:${page}`,
  contacts: (userId: string, type?: string) => `contacts:${userId}:${type || 'all'}`,
  products: (userId: string) => `products:${userId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  reports: (userId: string, type: string, period: string) => `reports:${userId}:${type}:${period}`,
} as const;

// Cache management utilities
export const CacheManager = {
  /**
   * Get or set data with caching
   */
  async getOrSet<T>(
    cache: LRUCache<T>,
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();
    
    // Store in cache
    cache.set(key, data, ttl);
    
    return data;
  },

  /**
   * Invalidate related cache entries
   */
  invalidatePattern(cache: LRUCache, pattern: string): void {
    const keysToDelete: string[] = [];
    
    // This is a simplified pattern matching
    // In a real implementation, you might want to use a more sophisticated approach
    cache.clear(); // For now, clear all - can be optimized
  },

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(userId: string): Promise<void> {
    try {
      // Pre-load commonly accessed data
      const promises = [
        // Add your data fetching functions here
        // Example: loadUserData(userId),
        // loadDashboardData(userId),
        // loadRecentInvoices(userId),
      ];

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Cache warm-up failed:', error);
    }
  },

  /**
   * Get combined cache statistics
   */
  getAllStats() {
    return {
      api: apiCache.getStats(),
      userData: userDataCache.getStats(),
      staticData: staticDataCache.getStats(),
    };
  },

  /**
   * Clean up all caches
   */
  cleanupAll(): void {
    apiCache.cleanup();
    userDataCache.cleanup();
    staticDataCache.cleanup();
  },

  /**
   * Clear all caches
   */
  clearAll(): void {
    apiCache.clear();
    userDataCache.clear();
    staticDataCache.clear();
  },
};