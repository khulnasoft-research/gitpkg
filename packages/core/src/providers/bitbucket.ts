/**
 * Bitbucket Provider Implementation
 * Supports both Bitbucket Cloud and Server
 */

import { BaseProvider, RepositoryInfo, ProviderConfig } from './base';

export interface BitbucketConfig extends ProviderConfig {
  workspace?: string;
  isServer?: boolean; // true for Bitbucket Server, false for Cloud
}

export class BitbucketProvider extends BaseProvider {
  readonly platformName = 'bitbucket';
  private isServer: boolean;

  constructor(config: BitbucketConfig = {}) {
    super(config);
    this.isServer = config.isServer ?? false;
  }

  protected getDefaultApiUrl(): string {
    if (this.isServer && this.config.baseUrl) {
      return `${this.config.baseUrl}/rest/api/1.0`;
    }
    return 'https://api.bitbucket.org/2.0';
  }

  parseUrl(url: string): RepositoryInfo | null {
    // Matches: https://bitbucket.org/workspace/repo//path/to/subdir@ref
    const match = url.match(
      /https?:\/\/bitbucket\.org\/([^\/]+)\/([^\/]+)(?:\/\/(.+?))?(?:@(.+?))?$/
    );

    if (!match) {
      return null;
    }

    const [, workspace, repo, path = '', ref = 'master'] = match;

    return {
      platform: this.platformName,
      owner: workspace,
      repo,
      ref,
      path: path || '',
      apiUrl: this.apiUrl,
      rawUrl: `https://bitbucket.org/${workspace}/${repo}/raw/${ref}`,
    };
  }

  getRawContentUrl(info: RepositoryInfo, filePath: string): string {
    const path = info.path ? `${info.path}/` : '';
    return `https://bitbucket.org/${info.owner}/${info.repo}/raw/${info.ref}/${path}${filePath}`;
  }

  getArchiveUrl(info: RepositoryInfo, format: 'tar' | 'zip' = 'tar'): string {
    const ext = format === 'tar' ? 'tar.gz' : 'zip';
    return `https://bitbucket.org/${info.owner}/${info.repo}/get/${info.ref}.${ext}`;
  }

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    if (this.isServer) {
      return this.getDefaultBranchServer(owner, repo);
    }
    return this.getDefaultBranchCloud(owner, repo);
  }

  private async getDefaultBranchCloud(owner: string, repo: string): Promise<string> {
    const url = `${this.apiUrl}/repositories/${owner}/${repo}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = (await response.json()) as { mainbranch?: { name: string } };
        return data.mainbranch?.name || 'master';
      }
    } catch {
      // Fallback to master
    }

    return 'master';
  }

  private async getDefaultBranchServer(owner: string, repo: string): Promise<string> {
    const url = `${this.apiUrl}/projects/${owner}/repos/${repo}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = (await response.json()) as { links?: { [key: string]: unknown } };
        return 'master'; // Bitbucket Server default
      }
    } catch {
      // Fallback to master
    }

    return 'master';
  }

  async listPackages(owner: string, repo: string, ref: string): Promise<string[]> {
    const url = `${this.apiUrl}/repositories/${owner}/${repo}/src/${ref}`;
    const headers = this.getHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to list repository contents: ${response.statusText}`);
    }

    const data = (await response.json()) as { values?: Array<{ name: string; type: string }> };
    return (data.values || [])
      .filter(item => item.type === 'commit_directory')
      .map(item => item.name);
  }

  async getPackageMetadata(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<Record<string, unknown>> {
    const packageJsonUrl = this.getRawContentUrl(
      { platform: 'bitbucket', owner, repo, ref, path } as RepositoryInfo,
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
    return `https://bitbucket.org/${info.owner}/${info.repo}//${path}${ref}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'gitpkg',
    };

    if (this.config.apiToken) {
      const encoded = Buffer.from(`user:${this.config.apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    return headers;
  }
}
