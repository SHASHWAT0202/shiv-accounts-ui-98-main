/**
 * Performance utilities for bundle optimization and network-aware loading
 */

export enum LoadingPriority {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low',
}

/**
 * Network connection interface
 */
interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Preload components for better performance
 */
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();
  
  static preload(key: string, importFunc: () => Promise<{ default: unknown }>) {
    if (this.preloadedComponents.has(key)) {
      return;
    }
    
    this.preloadedComponents.add(key);
    
    // Preload when browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importFunc().catch(() => {
          // Silent fail for preloading
          this.preloadedComponents.delete(key);
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        importFunc().catch(() => {
          this.preloadedComponents.delete(key);
        });
      }, 100);
    }
  }
  
  static preloadOnHover(key: string, importFunc: () => Promise<{ default: unknown }>) {
    return {
      onMouseEnter: () => this.preload(key, importFunc),
      onTouchStart: () => this.preload(key, importFunc),
    };
  }
}

/**
 * Network-aware loading utilities
 */
export class NetworkOptimizer {
  private static get connection(): NetworkConnection | undefined {
    return (navigator as { connection?: NetworkConnection })?.connection;
  }
  
  static getNetworkInfo() {
    if (!this.connection) {
      return { effectiveType: '4g', downlink: 10, rtt: 100, saveData: false };
    }
    
    return {
      effectiveType: this.connection.effectiveType || '4g',
      downlink: this.connection.downlink || 10,
      rtt: this.connection.rtt || 100,
      saveData: this.connection.saveData || false,
    };
  }
  
  static isSlowConnection() {
    const { effectiveType, downlink, saveData } = this.getNetworkInfo();
    return effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1.5 || saveData;
  }
  
  static isFastConnection() {
    const { effectiveType, downlink } = this.getNetworkInfo();
    return effectiveType === '4g' && downlink > 5;
  }
  
  static shouldPreload() {
    return this.isFastConnection() && !this.getNetworkInfo().saveData;
  }
  
  static getOptimalImageQuality(): 'low' | 'medium' | 'high' {
    if (this.isSlowConnection()) return 'low';
    if (this.isFastConnection()) return 'high';
    return 'medium';
  }
  
  static getOptimalChunkSize() {
    if (this.isSlowConnection()) return 'small';
    if (this.isFastConnection()) return 'large';
    return 'medium';
  }
}

/**
 * Resource loading with priority queue
 */
export class ResourceLoader {
  private static loadingQueue: Array<{
    url: string;
    priority: LoadingPriority;
    loader: () => Promise<unknown>;
  }> = [];
  
  private static isProcessing = false;
  
  static addToQueue(url: string, loader: () => Promise<unknown>, priority: LoadingPriority = LoadingPriority.MEDIUM) {
    this.loadingQueue.push({ url, loader, priority });
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    this.processQueue();
  }
  
  private static async processQueue() {
    if (this.isProcessing || this.loadingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    // Process high priority items immediately
    const highPriorityItems = this.loadingQueue.filter(item => item.priority === LoadingPriority.HIGH);
    const remainingItems = this.loadingQueue.filter(item => item.priority !== LoadingPriority.HIGH);
    
    // Load high priority items in parallel
    if (highPriorityItems.length > 0) {
      await Promise.allSettled(
        highPriorityItems.map(item => item.loader())
      );
    }
    
    // Load remaining items with concurrency control
    const maxConcurrent = NetworkOptimizer.isSlowConnection() ? 2 : 4;
    
    for (let i = 0; i < remainingItems.length; i += maxConcurrent) {
      const batch = remainingItems.slice(i, i + maxConcurrent);
      await Promise.allSettled(
        batch.map(item => item.loader())
      );
      
      // Add delay for slow connections
      if (NetworkOptimizer.isSlowConnection()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.loadingQueue = [];
    this.isProcessing = false;
  }
}

/**
 * Component size optimization utilities
 */
export class BundleOptimizer {
  static getComponentSize(component: Record<string, unknown>): number {
    try {
      const serialized = JSON.stringify(component);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }
  
  static shouldLazyLoad(componentSize: number): boolean {
    const threshold = NetworkOptimizer.isSlowConnection() ? 50000 : 100000; // 50KB or 100KB
    return componentSize > threshold;
  }
  
  static getOptimalChunkStrategy() {
    const networkInfo = NetworkOptimizer.getNetworkInfo();
    
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return {
        maxChunkSize: 50000, // 50KB
        concurrent: 1,
        delay: 200,
      };
    }
    
    if (networkInfo.effectiveType === '3g') {
      return {
        maxChunkSize: 100000, // 100KB
        concurrent: 2,
        delay: 100,
      };
    }
    
    return {
      maxChunkSize: 250000, // 250KB
      concurrent: 4,
      delay: 0,
    };
  }
}

/**
 * Setup preloading for common routes
 */
export const setupPreloading = () => {
  // Preload common routes on app startup
  if (NetworkOptimizer.shouldPreload()) {
    ComponentPreloader.preload('dashboard', () => import('@/pages/Dashboard'));
    ComponentPreloader.preload('contacts', () => import('@/pages/masters/Contacts'));
    ComponentPreloader.preload('invoices', () => import('@/pages/transactions/Invoices'));
  }
};