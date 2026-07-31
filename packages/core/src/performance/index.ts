/**
 * Performance Optimization Module for GitPkg
 * Provides parallel downloads, streaming, connection pooling, and progress reporting
 */

export interface PerformanceConfig {
  maxConcurrency?: number;
  timeout?: number;
  retries?: number;
  bandwidthThrottle?: number; // bytes per second
}

export interface DownloadProgress {
  url: string;
  downloaded: number;
  total?: number;
  percentage: number;
  speed: number; // bytes per second
  eta?: number; // seconds
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Connection pool for managing HTTP connections
 */
export class ConnectionPool {
  private activeConnections = 0;
  private maxConcurrency: number;
  private queue: Array<() => Promise<void>> = [];
  private timeout: number;

  constructor(config: PerformanceConfig = {}) {
    this.maxConcurrency = config.maxConcurrency ?? 6;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Execute a task with connection pooling
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeConnections < this.maxConcurrency) {
      this.activeConnections++;
      try {
        return await Promise.race([
          task(),
          this.createTimeoutPromise(),
        ]);
      } finally {
        this.activeConnections--;
        this.processQueue();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          this.activeConnections++;
          try {
            resolve(await Promise.race([
              task(),
              this.createTimeoutPromise(),
            ]));
          } catch (err) {
            reject(err);
          } finally {
            this.activeConnections--;
            this.processQueue();
          }
        });
      });
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeConnections < this.maxConcurrency) {
      const task = this.queue.shift();
      if (task) {
        task().catch(() => {
          // Error already handled in caller
        });
      }
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), this.timeout);
    });
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      activeConnections: this.activeConnections,
      maxConcurrency: this.maxConcurrency,
      queuedTasks: this.queue.length,
    };
  }
}

/**
 * Progress tracker for downloads
 */
export class ProgressTracker {
  private startTime: number;
  private startBytes = 0;
  private callbacks: ProgressCallback[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Register a progress callback
   */
  on(callback: ProgressCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Report download progress
   */
  report(url: string, downloaded: number, total?: number): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const bytesTransferred = downloaded - this.startBytes;
    const speed = bytesTransferred / (elapsed || 1);
    
    let eta: number | undefined;
    if (total && speed > 0) {
      const remaining = total - downloaded;
      eta = remaining / speed;
    }

    const progress: DownloadProgress = {
      url,
      downloaded,
      total,
      percentage: total ? (downloaded / total) * 100 : 0,
      speed,
      eta,
    };

    this.callbacks.forEach(cb => cb(progress));
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.startTime = Date.now();
    this.startBytes = 0;
  }
}

/**
 * Bandwidth throttler for rate limiting
 */
export class BandwidthThrottler {
  private bytesPerSecond: number;
  private bucket = 0;
  private lastRefill: number;

  constructor(bytesPerSecond: number) {
    this.bytesPerSecond = bytesPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Wait for bandwidth allowance
   */
  async throttle(bytes: number): Promise<void> {
    this.refillBucket();

    if (this.bucket < bytes) {
      const deficit = bytes - this.bucket;
      const waitTime = (deficit / this.bytesPerSecond) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.bucket = 0;
    } else {
      this.bucket -= bytes;
    }
  }

  private refillBucket(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.bucket = Math.min(
      this.bucket + elapsed * this.bytesPerSecond,
      this.bytesPerSecond * 2 // Max 2 seconds of bandwidth
    );
    this.lastRefill = now;
  }
}

// Global instances
export const globalConnectionPool = new ConnectionPool();
export const globalProgressTracker = new ProgressTracker();
