/**
 * Rate Limiter Utility for DDoS protection and API abuse prevention
 * Implements sliding window rate limiting algorithm
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private blockedUsers: Map<string, number> = new Map();
  
  /**
   * Check if a user/IP is rate limited
   * @param identifier - User identifier (IP, user ID, etc.)
   * @param config - Rate limit configuration
   * @returns true if rate limited, false otherwise
   */
  isRateLimited(identifier: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    
    // Check if user is currently blocked
    const blockedUntil = this.blockedUsers.get(identifier);
    if (blockedUntil && now < blockedUntil) {
      return true;
    }
    
    // Remove block if expired
    if (blockedUntil && now >= blockedUntil) {
      this.blockedUsers.delete(identifier);
    }
    
    const userRequests = this.requests.get(identifier) || [];
    
    // Filter requests within the time window
    const validRequests = userRequests.filter(time => now - time < config.windowMs);
    
    if (validRequests.length >= config.maxRequests) {
      // Block user for additional time if specified
      if (config.blockDurationMs) {
        this.blockedUsers.set(identifier, now + config.blockDurationMs);
      }
      return true;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    // Cleanup old entries to prevent memory leaks
    this.cleanup();
    
    return false;
  }
  
  /**
   * Get remaining requests for a user
   * @param identifier - User identifier
   * @param config - Rate limit configuration
   * @returns number of remaining requests
   */
  getRemainingRequests(identifier: string, config: RateLimitConfig): number {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => now - time < config.windowMs);
    
    return Math.max(0, config.maxRequests - validRequests.length);
  }
  
  /**
   * Get time until rate limit resets
   * @param identifier - User identifier
   * @param config - Rate limit configuration
   * @returns milliseconds until reset
   */
  getTimeUntilReset(identifier: string, config: RateLimitConfig): number {
    const userRequests = this.requests.get(identifier) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + config.windowMs;
    
    return Math.max(0, resetTime - Date.now());
  }
  
  /**
   * Clear rate limit data for a user
   * @param identifier - User identifier
   */
  clearUser(identifier: string): void {
    this.requests.delete(identifier);
    this.blockedUsers.delete(identifier);
  }
  
  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
    this.blockedUsers.clear();
  }
  
  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old request entries
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < maxAge);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
    
    // Clean up expired blocks
    for (const [identifier, blockedUntil] of this.blockedUsers.entries()) {
      if (now >= blockedUntil) {
        this.blockedUsers.delete(identifier);
      }
    }
  }
}

// Default rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // General API calls
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
  
  // Authentication endpoints
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  
  // Payment endpoints
  PAYMENT: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  
  // File uploads
  UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 2 * 60 * 1000, // 2 minutes
  },
} as const;

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();