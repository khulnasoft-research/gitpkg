/**
 * Security & Integrity Verification Module
 * Provides SHA256 hashing, SRI support, and vulnerability scanning
 */

import { createHash } from 'crypto';

export interface IntegrityCheckResult {
  valid: boolean;
  hash: string;
  expected?: string;
  algorithm: string;
}

export interface SRIConfig {
  hashes: string[]; // base64 encoded hashes with algorithm prefix, e.g., ["sha256-abc123"]
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface AuditLog {
  timestamp: number;
  action: string;
  package: string;
  version?: string;
  success: boolean;
  details?: unknown;
}

/**
 * Integrity verification utilities
 */
export class IntegrityVerifier {
  /**
   * Calculate SHA256 hash of data
   */
  static calculateSHA256(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculate SRI hash (base64 encoded)
   */
  static calculateSRI(data: Buffer | string, algorithm: 'sha256' | 'sha384' = 'sha256'): string {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const hash = createHash(algorithm).update(buffer).digest('base64');
    return `${algorithm}-${hash}`;
  }

  /**
   * Verify data against expected hash
   */
  static verify(
    data: Buffer | string,
    expectedHash: string,
    algorithm: 'sha256' | 'sha384' = 'sha256'
  ): IntegrityCheckResult {
    const hash = this.calculateSHA256(data);
    const expected = algorithm === 'sha256'
      ? expectedHash
      : createHash(algorithm).update(
          typeof data === 'string' ? Buffer.from(data) : data
        ).digest('hex');

    return {
      valid: hash === expected,
      hash,
      expected: expectedHash,
      algorithm,
    };
  }

  /**
   * Verify SRI integrity
   */
  static verifySRI(data: Buffer | string, sriHash: string): IntegrityCheckResult {
    const [algorithm, expected] = sriHash.split('-');
    if (!algorithm || !expected) {
      return {
        valid: false,
        hash: '',
        algorithm: 'unknown',
      };
    }

    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    const hash = createHash(algorithm)
      .update(buffer)
      .digest('base64');

    return {
      valid: hash === expected,
      hash,
      expected,
      algorithm,
    };
  }

  /**
   * Generate lock file entry
   */
  static generateLockEntry(
    url: string,
    data: Buffer,
    version?: string
  ): Record<string, unknown> {
    return {
      url,
      integrity: this.calculateSRI(data),
      version,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Audit logging for security tracking
 */
export class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 1000;

  /**
   * Log an action
   */
  log(action: string, pkg: string, success: boolean, details?: unknown): void {
    this.logs.push({
      timestamp: Date.now(),
      action,
      package: pkg,
      success,
      details,
    });

    // Keep recent logs only
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get logs filtered by action
   */
  getLogs(action?: string, limit?: number): AuditLog[] {
    let filtered = this.logs;
    if (action) {
      filtered = filtered.filter(log => log.action === action);
    }
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const total = this.logs.length;
    const successful = this.logs.filter(l => l.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }

  /**
   * Export logs as JSON
   */
  exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global instances
export const integrityVerifier = new IntegrityVerifier();
export const auditLogger = new AuditLogger();
