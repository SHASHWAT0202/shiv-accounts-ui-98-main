import { useCallback, useRef, useState } from 'react';
import { globalRateLimiter, RATE_LIMIT_CONFIGS, RateLimitConfig } from '@/utils/rateLimiter';

export interface UseThrottledApiOptions {
  delay?: number;
  rateLimitConfig?: RateLimitConfig;
  identifier?: string;
  onRateLimit?: (remainingTime: number) => void;
  onError?: (error: Error) => void;
}

export interface ThrottledApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  remainingRequests: number;
  timeUntilReset: number;
}

/**
 * Hook for throttled API calls with rate limiting and DDoS protection
 */
export function useThrottledApi<T = unknown>(options: UseThrottledApiOptions = {}) {
  const {
    delay = 1000,
    rateLimitConfig = RATE_LIMIT_CONFIGS.API,
    identifier = 'default',
    onRateLimit,
    onError,
  } = options;
  
  const lastCall = useRef<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const throttledCall = useCallback(async (
    apiCall: () => Promise<T>
  ): Promise<ThrottledApiResponse<T>> => {
    const now = Date.now();
    
    // Check rate limiting
    if (globalRateLimiter.isRateLimited(identifier, rateLimitConfig)) {
      const remainingTime = globalRateLimiter.getTimeUntilReset(identifier, rateLimitConfig);
      const rateLimitError = new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)} seconds.`);
      
      if (onRateLimit) {
        onRateLimit(remainingTime);
      }
      
      if (onError) {
        onError(rateLimitError);
      }
      
      return {
        data: null,
        loading: false,
        error: rateLimitError,
        remainingRequests: 0,
        timeUntilReset: remainingTime,
      };
    }
    
    // Check throttling
    if (now - lastCall.current < delay) {
      const throttleError = new Error(`Please wait ${delay}ms between requests.`);
      
      if (onError) {
        onError(throttleError);
      }
      
      return {
        data: null,
        loading: false,
        error: throttleError,
        remainingRequests: globalRateLimiter.getRemainingRequests(identifier, rateLimitConfig),
        timeUntilReset: globalRateLimiter.getTimeUntilReset(identifier, rateLimitConfig),
      };
    }
    
    lastCall.current = now;
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiCall();
      
      return {
        data,
        loading: false,
        error: null,
        remainingRequests: globalRateLimiter.getRemainingRequests(identifier, rateLimitConfig),
        timeUntilReset: globalRateLimiter.getTimeUntilReset(identifier, rateLimitConfig),
      };
    } catch (err) {
      const apiError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(apiError);
      
      if (onError) {
        onError(apiError);
      }
      
      return {
        data: null,
        loading: false,
        error: apiError,
        remainingRequests: globalRateLimiter.getRemainingRequests(identifier, rateLimitConfig),
        timeUntilReset: globalRateLimiter.getTimeUntilReset(identifier, rateLimitConfig),
      };
    } finally {
      setLoading(false);
    }
  }, [delay, rateLimitConfig, identifier, onRateLimit, onError]);
  
  const getRemainingRequests = useCallback(() => {
    return globalRateLimiter.getRemainingRequests(identifier, rateLimitConfig);
  }, [identifier, rateLimitConfig]);
  
  const getTimeUntilReset = useCallback(() => {
    return globalRateLimiter.getTimeUntilReset(identifier, rateLimitConfig);
  }, [identifier, rateLimitConfig]);
  
  const clearRateLimit = useCallback(() => {
    globalRateLimiter.clearUser(identifier);
  }, [identifier]);
  
  return {
    throttledCall,
    loading,
    error,
    getRemainingRequests,
    getTimeUntilReset,
    clearRateLimit,
  };
}

/**
 * Hook for debounced API calls (useful for search inputs)
 */
export function useDebouncedApi<T = unknown>(
  delay: number = 300,
  options: Omit<UseThrottledApiOptions, 'delay'> = {}
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedCall = useCallback((
    apiCall: () => Promise<T>
  ): Promise<ThrottledApiResponse<T>> => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setLoading(true);
      setError(null);
      
      timeoutRef.current = setTimeout(async () => {
        try {
          const data = await apiCall();
          resolve({
            data,
            loading: false,
            error: null,
            remainingRequests: globalRateLimiter.getRemainingRequests(
              options.identifier || 'default',
              options.rateLimitConfig || RATE_LIMIT_CONFIGS.API
            ),
            timeUntilReset: globalRateLimiter.getTimeUntilReset(
              options.identifier || 'default',
              options.rateLimitConfig || RATE_LIMIT_CONFIGS.API
            ),
          });
        } catch (err) {
          const apiError = err instanceof Error ? err : new Error('Unknown error occurred');
          setError(apiError);
          
          if (options.onError) {
            options.onError(apiError);
          }
          
          resolve({
            data: null,
            loading: false,
            error: apiError,
            remainingRequests: globalRateLimiter.getRemainingRequests(
              options.identifier || 'default',
              options.rateLimitConfig || RATE_LIMIT_CONFIGS.API
            ),
            timeUntilReset: globalRateLimiter.getTimeUntilReset(
              options.identifier || 'default',
              options.rateLimitConfig || RATE_LIMIT_CONFIGS.API
            ),
          });
        } finally {
          setLoading(false);
        }
      }, delay);
    });
  }, [delay, options]);
  
  return {
    debouncedCall,
    loading,
    error,
  };
}