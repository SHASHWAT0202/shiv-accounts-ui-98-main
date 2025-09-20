/**
 * Optimized API client for mobile and 4G networks
 * Uses batching, caching, and compression for better performance
 */

import { networkOptimizer, requestDebouncer, isSlowNetwork } from './networkOptimization';

interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

interface RequestConfig {
  batch?: boolean;
  cache?: boolean;
  debounce?: number;
  priority?: 'high' | 'medium' | 'low';
  retry?: number;
}

export class OptimizedApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private retryDelays = [1000, 2000, 4000]; // Progressive backoff

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...defaultHeaders
    };
  }

  /**
   * GET request with optimization
   */
  async get<T>(
    endpoint: string, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (config.debounce) {
      return requestDebouncer.debounce(
        `GET:${url}`,
        () => this.executeRequest<T>('GET', url, undefined, config),
        config.debounce
      ) as Promise<ApiResponse<T>>;
    }

    if (config.batch && isSlowNetwork()) {
      const result = await networkOptimizer.batchRequest(url, 'GET');
      return this.formatResponse<T>(result);
    }

    return this.executeRequest<T>('GET', url, undefined, config);
  }

  /**
   * POST request with optimization
   */
  async post<T>(
    endpoint: string, 
    data: unknown, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (config.debounce) {
      return requestDebouncer.debounce(
        `POST:${url}:${JSON.stringify(data)}`,
        () => this.executeRequest<T>('POST', url, data, config),
        config.debounce
      ) as Promise<ApiResponse<T>>;
    }

    if (config.batch && isSlowNetwork()) {
      const result = await networkOptimizer.batchRequest(url, 'POST', data);
      return this.formatResponse<T>(result);
    }

    return this.executeRequest<T>('POST', url, data, config);
  }

  /**
   * PUT request with optimization
   */
  async put<T>(
    endpoint: string, 
    data: unknown, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.executeRequest<T>('PUT', url, data, config);
  }

  /**
   * PATCH request with optimization
   */
  async patch<T>(
    endpoint: string, 
    data: unknown, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.executeRequest<T>('PATCH', url, data, config);
  }

  /**
   * DELETE request with optimization
   */
  async delete<T>(
    endpoint: string, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.executeRequest<T>('DELETE', url, undefined, config);
  }

  /**
   * Execute request with retries and error handling
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { retry = isSlowNetwork() ? 3 : 1 } = config;
    let lastError: Error;

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await networkOptimizer.optimizedFetch(url, {
          method,
          headers: this.defaultHeaders,
          body: data ? JSON.stringify(data) : undefined
        });
        
        return this.formatResponse<T>(result);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }
        
        // Wait before retry
        if (attempt < retry) {
          await this.delay(this.retryDelays[attempt] || 4000);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Format response to consistent structure
   */
  private formatResponse<T>(result: unknown): ApiResponse<T> {
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      
      // If response already has success/error structure
      if ('success' in obj && 'data' in obj) {
        return obj as unknown as ApiResponse<T>;
      }
      
      // Wrap data in success response
      return {
        data: result as T,
        success: true
      };
    }
    
    return {
      data: result as T,
      success: true
    };
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Bulk operations optimized for mobile
   */
  async bulkGet<T>(
    endpoints: string[], 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T[]>> {
    const urls = endpoints.map(endpoint => `${this.baseUrl}${endpoint}`);
    
    if (isSlowNetwork()) {
      // Sequential processing on slow networks to avoid overwhelming
      const results: T[] = [];
      for (const url of urls) {
        try {
          const response = await this.executeRequest<T>('GET', url, undefined, config);
          if (response.success && response.data) {
            results.push(response.data);
          }
        } catch (error) {
          console.warn(`Failed to fetch ${url}:`, error);
        }
      }
      return { data: results, success: true };
    } else {
      // Parallel processing on faster networks
      const promises = urls.map(url => 
        this.executeRequest<T>('GET', url, undefined, config)
          .catch(error => {
            console.warn(`Failed to fetch ${url}:`, error);
            return null;
          })
      );
      
      const responses = await Promise.all(promises);
      const results = responses
        .filter((response): response is ApiResponse<T> => 
          response !== null && response.success && response.data !== undefined
        )
        .map(response => response.data);
      
      return { data: results, success: true };
    }
  }

  /**
   * Prefetch resources for better performance
   */
  async prefetch(endpoints: string[]): Promise<void> {
    const urls = endpoints.map(endpoint => `${this.baseUrl}${endpoint}`);
    await networkOptimizer.preloadResources(urls);
  }

  /**
   * Search with debouncing for auto-complete
   */
  async search<T>(
    endpoint: string, 
    query: string, 
    debounceMs: number = 300
  ): Promise<ApiResponse<T[]>> {
    const searchUrl = `${endpoint}?q=${encodeURIComponent(query)}`;
    
    return requestDebouncer.debounce(
      `search:${searchUrl}`,
      () => this.get<T[]>(searchUrl, { cache: true }),
      debounceMs
    ) as Promise<ApiResponse<T[]>>;
  }

  /**
   * Upload with progress for large files
   */
  async upload<T>(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(this.formatResponse<T>(result));
          } catch (error) {
            resolve({
              data: xhr.responseText as T,
              success: true
            });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      // Add auth headers if available
      Object.entries(this.defaultHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    networkOptimizer.clearCache();
    requestDebouncer.clear();
  }

  /**
   * Get performance statistics
   */
  getStats(): { cache: { size: number; hitRate: number }; network: object } {
    return {
      cache: networkOptimizer.getCacheStats(),
      network: networkOptimizer.getNetworkInfo()
    };
  }
}

// Create default instance
export const api = new OptimizedApiClient('/api', {
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
});

// Export utility functions
export { isSlowNetwork } from './networkOptimization';

// Update auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
  api['defaultHeaders']['Authorization'] = `Bearer ${token}`;
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
  delete api['defaultHeaders']['Authorization'];
};