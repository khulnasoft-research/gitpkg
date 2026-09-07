/**
 * Gitee (码云) Provider Implementation
 * Chinese Git repository platform
 */

import { BaseProvider, RepositoryInfo } from './base';

export class GiteeProvider extends BaseProvider {
  readonly platformName = 'gitee';

  protected getDefaultApiUrl(): string {
    return 'https://gitee.com/api/v5';
  }

  parseUrl(url: string): RepositoryInfo | null {
    // Matches: https://gitee.com/owner/repo//path/to/subdir@ref
    const match = url.match(
      /https?:\/\/gitee\.com\/([^\/]+)\/([^\/]+)(?:\/\/(.+?))?(?:@(.+?))?$/
    );

    if (!match) {
      return null;
    }

    const [, owner, repo, path = '', ref = 'master'] = match;

    return {
      platform: this.platformName,
      owner,
      repo,
      ref,
      path: path || '',
      apiUrl: this.apiUrl,
      rawUrl: `https://gitee.com/${owner}/${repo}/raw/${ref}`,
    };
  }

  getRawContentUrl(info: RepositoryInfo, filePath: string): string {
    const path = info.path ? `${info.path}/` : '';
    return `https://gitee.com/${info.owner}/${info.repo}/raw/${info.ref}/${path}${filePath}`;
  }

  getArchiveUrl(info: RepositoryInfo, format: 'tar' | 'zip' = 'tar'): string {
    const ext = format === 'tar' ? 'tar.gz' : 'zip';
    return `https://gitee.com/${info.owner}/${info.repo}/repository/archive/${info.ref}.${ext}`;
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const url = `${this.apiUrl}/repos/${owner}/${repo}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = (await response.json()) as { default_branch: string };
        return data.default_branch;
      }
    } catch {
      // Fallback to master
    }

    return 'master';
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
      { platform: 'gitee', owner, repo, ref, path } as RepositoryInfo,
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
    const ref = info.ref !== 'master' ? `@${info.ref}` : '';
    const path = info.path ? `/${info.path}` : '';
    return `https://gitee.com/${info.owner}/${info.repo}//${path}${ref}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'gitpkg',
    };

    if (this.config.apiToken) {
      headers['Authorization'] = `token ${this.config.apiToken}`;
    }

    return headers;
  }
}
