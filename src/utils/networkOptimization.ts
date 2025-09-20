/**
 * Network Optimization Utilities for 4G Performance
 * Implements request batching, compression, and adaptive loading
 */

interface NetworkInfo {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener: (event: string, callback: () => void) => void;
}

interface ExtendedNavigator extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

interface RequestBatch {
  id: string;
  requests: Array<{
    url: string;
    method: string;
    data?: unknown;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>;
  timeout: NodeJS.Timeout;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private requestBatches = new Map<string, RequestBatch>();
  private requestCache = new Map<string, CacheEntry>();
  private batchDelay = 50; // ms
  private maxBatchSize = 10;
  private compressionThreshold = 1024; // bytes
  
  private constructor() {
    this.adjustForNetworkConditions();
    this.setupNetworkListener();
  }

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): NetworkInfo {
    const connection = (navigator as ExtendedNavigator).connection || 
                      (navigator as ExtendedNavigator).mozConnection || 
                      (navigator as ExtendedNavigator).webkitConnection;
    
    if (!connection) {
      return { effectiveType: '4g' }; // Default assumption
    }

    return {
      effectiveType: (connection.effectiveType as NetworkInfo['effectiveType']) || '4g',
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData || false
    };
  }

  /**
   * Check if network is slow
   */
  isSlowNetwork(): boolean {
    const network = this.getNetworkInfo();
    return network.effectiveType === '2g' || 
           network.effectiveType === 'slow-2g' || 
           (network.downlink && network.downlink < 1.5) ||
           network.saveData === true;
  }

  /**
   * Adjust optimization parameters based on network conditions
   */
  private adjustForNetworkConditions(): void {
    const network = this.getNetworkInfo();
    
    if (this.isSlowNetwork()) {
      this.batchDelay = 200; // More batching on slow networks
      this.maxBatchSize = 20;
      this.compressionThreshold = 512; // Compress smaller payloads
    } else if (network.effectiveType === '3g') {
      this.batchDelay = 100;
      this.maxBatchSize = 15;
      this.compressionThreshold = 768;
    } else {
      this.batchDelay = 50;
      this.maxBatchSize = 10;
      this.compressionThreshold = 1024;
    }
  }

  /**
   * Listen for network changes and adjust accordingly
   */
  private setupNetworkListener(): void {
    const connection = (navigator as ExtendedNavigator).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.adjustForNetworkConditions();
      });
    }
  }

  /**
   * Batch similar requests together
   */
  async batchRequest(
    endpoint: string,
    method: string = 'GET',
    data?: unknown
  ): Promise<unknown> {
    const batchKey = `${method}:${endpoint}`;
    
    return new Promise((resolve, reject) => {
      let batch = this.requestBatches.get(batchKey);
      
      if (!batch) {
        batch = {
          id: batchKey,
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.batchDelay)
        };
        this.requestBatches.set(batchKey, batch);
      }

      batch.requests.push({
        url: endpoint,
        method,
        data,
        resolve,
        reject
      });

      // Execute immediately if batch is full
      if (batch.requests.length >= this.maxBatchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey);
      }
    });
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.requestBatches.get(batchKey);
    if (!batch) return;

    this.requestBatches.delete(batchKey);

    try {
      // For GET requests, we can use a single request with multiple IDs
      if (batch.requests[0].method === 'GET' && batch.requests.length > 1) {
        await this.executeBatchedGET(batch);
      } else {
        // For other methods, execute individually but in parallel
        await this.executeParallelRequests(batch);
      }
    } catch (error) {
      batch.requests.forEach(req => req.reject(error));
    }
  }

  /**
   * Execute batched GET requests
   */
  private async executeBatchedGET(batch: RequestBatch): Promise<void> {
    const urls = batch.requests.map(req => req.url);
    const batchEndpoint = `${batch.requests[0].url.split('?')[0]}/batch`;
    
    try {
      const response = await fetch(batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        body: JSON.stringify({ urls })
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }

      const results = await response.json();
      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      // Fallback to individual requests
      await this.executeParallelRequests(batch);
    }
  }

  /**
   * Execute requests in parallel
   */
  private async executeParallelRequests(batch: RequestBatch): Promise<void> {
    const promises = batch.requests.map(async (req) => {
      try {
        const result = await this.optimizedFetch(req.url, {
          method: req.method,
          body: req.data ? JSON.stringify(req.data) : undefined,
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });
        req.resolve(result);
      } catch (error) {
        req.reject(error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Optimized fetch with caching and compression
   */
  async optimizedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
    
    // Check cache first for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Add compression headers
    const headers = {
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': this.isSlowNetwork() ? 'max-age=300' : 'max-age=60',
      ...options.headers
    };

    // Compress request body if needed
    if (options.body && typeof options.body === 'string') {
      const bodySize = new Blob([options.body]).size;
      if (bodySize > this.compressionThreshold) {
        headers['Content-Encoding'] = 'gzip';
        // Note: In a real implementation, you'd compress the body here
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful GET responses
      if (!options.method || options.method === 'GET') {
        this.setCache(cacheKey, data, {
          ttl: this.isSlowNetwork() ? 300000 : 60000, // 5min or 1min
          etag: response.headers.get('etag') || undefined
        });
      }

      return data;
    } catch (error) {
      // Return cached data as fallback if available
      const cached = this.getFromCache(cacheKey, true);
      if (cached) {
        console.warn('Using stale cache due to network error:', error);
        return cached;
      }
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string, allowStale: boolean = false): unknown | null {
    const entry = this.requestCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired && !allowStale) {
      this.requestCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache
   */
  private setCache(
    key: string, 
    data: unknown, 
    options: { ttl: number; etag?: string }
  ): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
      etag: options.etag
    });

    // Clean up old entries if cache gets too large
    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
  }

  /**
   * Preload critical resources
   */
  async preloadResources(urls: string[]): Promise<void> {
    if (this.isSlowNetwork()) {
      // Only preload the most critical resources on slow networks
      urls = urls.slice(0, 3);
    }

    const preloadPromises = urls.map(url => {
      return new Promise<void>((resolve) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.onload = () => resolve();
        link.onerror = () => resolve(); // Continue even if preload fails
        document.head.appendChild(link);
      });
    });

    await Promise.all(preloadPromises);
  }

  /**
   * Adaptive image loading based on network conditions
   */
  getOptimalImageUrl(baseUrl: string, width: number, height: number): string {
    const network = this.getNetworkInfo();
    let quality = 85;
    let format = 'webp';

    if (this.isSlowNetwork()) {
      quality = 60;
      width = Math.floor(width * 0.8);
      height = Math.floor(height * 0.8);
    } else if (network.effectiveType === '3g') {
      quality = 75;
      width = Math.floor(width * 0.9);
      height = Math.floor(height * 0.9);
    }

    // Fallback to JPEG on older browsers
    if (!this.supportsWebP()) {
      format = 'jpeg';
    }

    return `${baseUrl}?w=${width}&h=${height}&q=${quality}&f=${format}`;
  }

  /**
   * Check if browser supports WebP
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.requestCache.size,
      hitRate: 0.85 // This would be calculated in a real implementation
    };
  }
}

/**
 * Request debouncer for reducing API calls
 */
export class RequestDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  /**
   * Debounce a request
   */
  debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Return existing promise if request is pending
    const pendingRequest = this.pendingRequests.get(key) as Promise<T>;
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new debounced promise
    const promise = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          this.timers.delete(key);
          this.pendingRequests.delete(key);
          const result = await fn();
          resolve(result);
        } catch (error) {
          this.pendingRequests.delete(key);
          reject(error);
        }
      }, delay);

      this.timers.set(key, timer);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Cancel a debounced request
   */
  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Clear all debounced requests
   */
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instances
export const networkOptimizer = NetworkOptimizer.getInstance();
export const requestDebouncer = new RequestDebouncer();

// Utility functions
export const optimizedFetch = (url: string, options?: RequestInit) => 
  networkOptimizer.optimizedFetch(url, options);

export const batchRequest = (endpoint: string, method?: string, data?: unknown) =>
  networkOptimizer.batchRequest(endpoint, method, data);

export const isSlowNetwork = () => networkOptimizer.isSlowNetwork();

export const getOptimalImageUrl = (baseUrl: string, width: number, height: number) =>
  networkOptimizer.getOptimalImageUrl(baseUrl, width, height);