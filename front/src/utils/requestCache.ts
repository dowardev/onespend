// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Request caching utilities for API optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  // Get cached data or fetch fresh data
  async get<T>(key: string, fetchFn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    const cached = this.cache.get(key);

    // Return cached data if valid
    if (cached && this.isValid(cached)) {
      console.debug(`[RequestCache] Cache hit for: ${key}`);
      return cached.data;
    }

    // Fetch fresh data
    console.debug(`[RequestCache] Cache miss for: ${key}`);
    const data = await fetchFn();

    // Cache the fresh data
    this.set(key, data, ttl);

    return data;
  }

  // Store data in cache
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Check if cached entry is still valid
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Clear specific cache entry
  clear(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Cleanup expired entries
  cleanup(): void {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    console.debug(`[RequestCache] Cleaned up ${cleaned} expired entries`);
  }
}

// Create global cache instance
export const requestCache = new RequestCache();

// Cleanup expired entries periodically (every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      requestCache.cleanup();
    },
    10 * 60 * 1000,
  );
}

// Utility functions for common API patterns
export const cacheUtils = {
  // Cache for user data
  async getUserData(fetchFn: () => Promise<any>): Promise<any> {
    return requestCache.get('user_data', fetchFn, 10 * 60 * 1000); // 10 minutes
  },

  // Cache for suppliers data
  async getSuppliersData(fetchFn: () => Promise<any>): Promise<any> {
    return requestCache.get('suppliers_data', fetchFn, 5 * 60 * 1000); // 5 minutes
  },

  // Cache for accounts data
  async getAccountsData(fetchFn: () => Promise<any>): Promise<any> {
    return requestCache.get('accounts_data', fetchFn, 3 * 60 * 1000); // 3 minutes
  },

  // Cache for statistics data
  async getStatisticsData(fetchFn: () => Promise<any>, dateKey: string): Promise<any> {
    const key = `statistics_data_${dateKey}`;
    return requestCache.get(key, fetchFn, 2 * 60 * 1000); // 2 minutes
  },

  // Cache for templates data
  async getTemplatesData(fetchFn: () => Promise<any>): Promise<any> {
    return requestCache.get('templates_data', fetchFn, 15 * 60 * 1000); // 15 minutes
  },

  // Cache for budget data
  async getBudgetData(fetchFn: () => Promise<any>, dateKey: string): Promise<any> {
    const key = `budget_data_${dateKey}`;
    return requestCache.get(key, fetchFn, 1 * 60 * 1000); // 1 minute (very fresh budget data)
  },

  // Clear all user-related caches
  clearUserCaches(): void {
    requestCache.clear('user_data');
    requestCache.clear('suppliers_data');
    requestCache.clear('accounts_data');
    requestCache.clear('templates_data');
    console.debug('[RequestCache] Cleared all user-related caches');
  },

  // Clear date-specific caches
  clearDateCaches(dateKey: string): void {
    requestCache.clear(`statistics_data_${dateKey}`);
    requestCache.clear(`budget_data_${dateKey}`);
    console.debug(`[RequestCache] Cleared caches for date: ${dateKey}`);
  },
};

// Export for use in components
export function useRequestCache() {
  return {
    get: requestCache.get.bind(requestCache),
    set: requestCache.set.bind(requestCache),
    clear: requestCache.clear.bind(requestCache),
    clearAll: requestCache.clearAll.bind(requestCache),
    getStats: requestCache.getStats.bind(requestCache),
    cleanup: requestCache.cleanup.bind(requestCache),
    cacheUtils,
  };
}
