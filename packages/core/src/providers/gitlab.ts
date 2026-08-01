/**
 * GitLab Provider Implementation
 * Supports both gitlab.com and self-hosted GitLab instances
 */

import { BaseProvider, RepositoryInfo } from './base';

export class GitLabProvider extends BaseProvider {
  readonly platformName = 'gitlab';

  protected getDefaultApiUrl(): string {
    return this.config.baseUrl ? `${this.config.baseUrl}/api/v4` : 'https://gitlab.com/api/v4';
  }

  parseUrl(url: string): RepositoryInfo | null {
    // Matches: https://gitlab.com/group/project//path/to/subdir@ref
    // or https://gitlab.com/group/subgroup/project//path/to/subdir@ref
    const match = url.match(
      /https?:\/\/(?:.*?\.)?gitlab\.com\/(.+?)\/([^\/]+?)(?:\/\/(.+?))?(?:@(.+?))?$/
    );

    if (!match) {
      return null;
    }

    const [, path, repo, subpath = '', ref = 'main'] = match;
    const owner = path.replace(/\//g, '%2F'); // URL encode group path

    return {
      platform: this.platformName,
      owner,
      repo,
      ref,
      path: subpath || '',
      apiUrl: this.apiUrl,
      rawUrl: `https://gitlab.com/${path}/${repo}/-/raw/${ref}`,
    };
  }

  getRawContentUrl(info: RepositoryInfo, filePath: string): string {
    const path = info.path ? `${info.path}/` : '';
    return `${this.config.baseUrl || 'https://gitlab.com'}/${info.owner}/${info.repo}/-/raw/${info.ref}/${path}${filePath}`;
  }

  getArchiveUrl(info: RepositoryInfo, format: 'tar' | 'zip' = 'tar'): string {
    const ext = format === 'tar' ? 'tar.gz' : 'zip';
    return `${this.config.baseUrl || 'https://gitlab.com'}/${info.owner}/${info.repo}/-/archive/${info.ref}/${info.repo}-${info.ref}.${ext}`;
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const url = `${this.apiUrl}/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches/main`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        return 'main';
      }
    } catch {
      // Fallback to main
    }

    return 'main';
  }

  async listPackages(owner: string, repo: string, ref: string): Promise<string[]> {
    const encodedProject = encodeURIComponent(`${owner}/${repo}`);
    const url = `${this.apiUrl}/projects/${encodedProject}/repository/tree?ref=${ref}&per_page=100`;
    const headers = this.getHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to list repository contents: ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{ name: string; type: string }>;
    return data
      .filter(item => item.type === 'tree')
      .map(item => item.name);
  }

  async getPackageMetadata(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<Record<string, unknown>> {
    const packageJsonUrl = this.getRawContentUrl(
      { platform: 'gitlab', owner, repo, ref, path } as RepositoryInfo,
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
    return `https://gitlab.com/${info.owner}/${info.repo}//${path}${ref}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'gitpkg',
    };

    if (this.config.apiToken) {
      headers['PRIVATE-TOKEN'] = this.config.apiToken;
    }

    return headers;
  }
}
