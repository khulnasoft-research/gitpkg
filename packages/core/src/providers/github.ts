/**
 * GitHub Provider Implementation
 */

import { BaseProvider, RepositoryInfo, ProviderConfig } from './base';

export class GitHubProvider extends BaseProvider {
  readonly platformName = 'github';

  protected getDefaultApiUrl(): string {
    return 'https://api.github.com';
  }

  parseUrl(url: string): RepositoryInfo | null {
    // Matches: https://github.com/owner/repo//path/to/subdir
    const match = url.match(
      /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/\/(.*?))?(?:@([^\/]+))?$/
    );

    if (!match) {
      return null;
    }

    const [, owner, repo, path = '', ref = 'main'] = match;

    return {
      platform: this.platformName,
      owner,
      repo,
      ref,
      path: path || '',
      apiUrl: this.apiUrl,
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`,
    };
  }

  getRawContentUrl(info: RepositoryInfo, filePath: string): string {
    const path = info.path ? `${info.path}/` : '';
    return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.ref}/${path}${filePath}`;
  }

  getArchiveUrl(info: RepositoryInfo, format: 'tar' | 'zip' = 'tar'): string {
    const ext = format === 'tar' ? 'tar.gz' : 'zip';
    let url = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${info.ref}.${ext}`;
    
    // GitHub API also supports: /archive/{ref}.tar.gz
    if (info.ref.includes('/')) {
      // Tag or other ref
      url = `https://github.com/${info.owner}/${info.repo}/archive/${info.ref}.${ext}`;
    }
    
    return url;
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}`;
    const headers = this.getHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch repository info: ${response.statusText}`);
    }

    const data = (await response.json()) as { default_branch: string };
    return data.default_branch;
  }

  async listPackages(owner: string, repo: string, ref: string): Promise<string[]> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/?ref=${ref}`;
    const headers = this.getHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to list repository contents: ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{ name: string; type: string }>;
    return data
      .filter(item => item.type === 'dir')
      .map(item => item.name);
  }

  async getPackageMetadata(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<Record<string, unknown>> {
    const packageJsonUrl = this.getRawContentUrl(
      { platform: 'github', owner, repo, ref, path } as RepositoryInfo,
      'package.json'
    );

    try {
      const response = await fetch(packageJsonUrl);
      if (!response.ok) {
        return {};
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async validateToken(): Promise<boolean> {
    if (!this.config.apiToken) {
      return false;
    }

    const url = `${this.apiUrl}/user`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      return response.ok;
    } catch {
      return false;
    }
  }

  formatUrl(info: RepositoryInfo): string {
    const ref = info.ref !== 'main' ? `@${info.ref}` : '';
    const path = info.path ? `/${info.path}` : '';
    return `https://github.com/${info.owner}/${info.repo}//${path}${ref}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'gitpkg',
    };

    if (this.config.apiToken) {
      headers['Authorization'] = `token ${this.config.apiToken}`;
    }

    return headers;
  }
}
