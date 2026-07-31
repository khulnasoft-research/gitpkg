/**
 * Smart Caching System for GitPkg
 * Provides in-memory LRU cache with hash validation and TTL support
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  hash?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set(key: K, value: V, ttl?: number, hash?: string): void {
    // Remove oldest entry if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      hash,
    });
  }

  /**
   * Get a value from the cache
   */
  get(key: K, validateHash?: (value: V) => string): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.misses++;
        return undefined;
      }
    }

    // Validate hash if provided
    if (entry.hash && validateHash) {
      const currentHash = validateHash(entry.value);
      if (currentHash !== entry.hash) {
        this.cache.delete(key);
        this.misses++;
        return undefined;
      }
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }
}

// Global cache instance for package metadata
export const packageCache = new LRUCache<string, unknown>(500);

// Cache for downloaded packages
export const downloadCache = new LRUCache<string, Buffer>(50);
