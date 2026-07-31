/**
 * Provider Registry and Public API
 */

import { BaseProvider, ProviderFactory, ProviderConfig } from './base';
import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import { GiteeProvider } from './gitee';
import { BitbucketProvider } from './bitbucket';

// Register all providers
ProviderFactory.register('github', GitHubProvider);
ProviderFactory.register('gitlab', GitLabProvider);
ProviderFactory.register('gitee', GiteeProvider);
ProviderFactory.register('bitbucket', BitbucketProvider);

export { BaseProvider, ProviderFactory, ProviderConfig };
export { GitHubProvider } from './github';
export { GitLabProvider } from './gitlab';
export { GiteeProvider } from './gitee';
export { BitbucketProvider } from './bitbucket';
export type { RepositoryInfo, ProviderError } from './base';

/**
 * Create a provider from a URL
 */
export function createProviderFromUrl(
  url: string,
  config?: ProviderConfig
): BaseProvider {
  const providerName = ProviderFactory.detectProvider(url);
  return ProviderFactory.createProvider(providerName, config);
}

/**
 * Parse a URL with auto-detected provider
 */
export function parseUrl(url: string): { provider: string; info: unknown } | null {
  try {
    const provider = createProviderFromUrl(url);
    const info = provider.parseUrl(url);
    return info ? { provider: provider.platformName, info } : null;
  } catch {
    return null;
  }
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): string[] {
  return ProviderFactory.getAvailableProviders();
}
