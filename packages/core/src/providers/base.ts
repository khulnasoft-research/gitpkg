/**
 * Base Provider Interface for Multi-Platform Support
 * Supports GitHub, GitLab, Gitee, Bitbucket
 */

export interface RepositoryInfo {
  platform: string;
  owner: string;
  repo: string;
  ref: string; // branch, tag, or commit
  path: string; // subdirectory path
  apiUrl?: string;
  rawUrl?: string;
}

export interface ProviderConfig {
  apiToken?: string;
  baseUrl?: string; // for self-hosted instances
  timeout?: number;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected apiUrl: string;
  abstract platformName: string;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
    this.apiUrl = config.baseUrl || this.getDefaultApiUrl();
  }

  /**
   * Get the default API URL for this provider
   */
  protected abstract getDefaultApiUrl(): string;

  /**
   * Parse a URL into repository info
   */
  abstract parseUrl(url: string): RepositoryInfo | null;

  /**
   * Get the raw content URL for a file or directory
   */
  abstract getRawContentUrl(info: RepositoryInfo, filePath: string): string;

  /**
   * Get archive download URL (tar.gz or zip)
   */
  abstract getArchiveUrl(info: RepositoryInfo, format?: 'tar' | 'zip'): string;

  /**
   * Get default branch name
   */
  abstract getDefaultBranch(owner: string, repo: string): Promise<string>;

  /**
   * List available packages/subdirectories
   */
  abstract listPackages(owner: string, repo: string, ref: string): Promise<string[]>;

  /**
   * Get package metadata
   */
  abstract getPackageMetadata(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<Record<string, unknown>>;

  /**
   * Check if authentication token is valid
   */
  abstract validateToken(): Promise<boolean>;

  /**
   * Format a URL in a canonical way
   */
  abstract formatUrl(info: RepositoryInfo): string;
}

/**
 * Provider factory for creating provider instances
 */
export class ProviderFactory {
  private static providers = new Map<string, new (config: ProviderConfig) => BaseProvider>();

  static {
    // Providers will be registered during initialization
  }

  /**
   * Register a provider
   */
  static register(name: string, provider: new (config: ProviderConfig) => BaseProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  /**
   * Get a provider by name
   */
  static getProvider(name: string): (new (config: ProviderConfig) => BaseProvider) | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Create a provider instance
   */
  static createProvider(name: string, config?: ProviderConfig): BaseProvider {
    const Provider = this.getProvider(name);
    if (!Provider) {
      throw new Error(`Unknown provider: ${name}`);
    }
    return new Provider(config ?? {});
  }

  /**
   * Get all registered providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Auto-detect provider from URL
   */
  static detectProvider(url: string): string {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com') || url.includes('gitlab')) return 'gitlab';
    if (url.includes('gitee.com') || url.includes('gitee')) return 'gitee';
    if (url.includes('bitbucket.org') || url.includes('bitbucket')) return 'bitbucket';
    throw new Error(`Unable to detect provider for URL: ${url}`);
  }
}

export interface ProviderError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}
