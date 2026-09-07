/**
 * Monorepo Introspection & Metadata Module
 * Analyzes repository structure and generates metadata
 */

export interface PackageInfo {
  name: string;
  version?: string;
  description?: string;
  path: string;
  main?: string;
  types?: string;
  scripts?: Record<string, string>;
  keywords?: string[];
  author?: string;
  license?: string;
  repository?: Record<string, unknown>;
  homepage?: string;
  bugs?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface RepoMetadata {
  totalPackages: number;
  packages: PackageInfo[];
  workspaceRoot?: string;
  monorepoType?: 'lerna' | 'yarn-workspace' | 'npm-workspace' | 'pnpm' | 'unknown';
  publishedPackages?: string[];
}

export interface RepositoryStructure {
  folders: string[];
  files: string[];
  hasPackageJson: boolean;
  hasLernaJson: boolean;
  hasNpmWorkspace: boolean;
  hasYarnWorkspace: boolean;
}

/**
 * Repository analyzer
 */
export class RepositoryAnalyzer {
  /**
   * Analyze repository structure
   */
  static analyzeStructure(
    files: string[],
    folders: string[]
  ): RepositoryStructure {
    return {
      folders,
      files,
      hasPackageJson: files.includes('package.json'),
      hasLernaJson: files.includes('lerna.json'),
      hasNpmWorkspace: files.some(f => f === 'package.json'), // Check for workspaces field
      hasYarnWorkspace: files.some(f => f === 'package.json'), // Check for workspaces field
    };
  }

  /**
   * Detect monorepo type
   */
  static detectMonorepoType(
    hasLerna: boolean,
    hasYarnWorkspace: boolean,
    hasNpmWorkspace: boolean,
    hasPnpmWorkspace: boolean
  ): RepoMetadata['monorepoType'] {
    if (hasLerna) return 'lerna';
    if (hasYarnWorkspace) return 'yarn-workspace';
    if (hasNpmWorkspace) return 'npm-workspace';
    if (hasPnpmWorkspace) return 'pnpm';
    return 'unknown';
  }

  /**
   * Extract package metadata from package.json
   */
  static extractPackageMetadata(
    packageJson: Record<string, unknown>,
    path: string
  ): PackageInfo {
    return {
      name: (packageJson.name as string) || '',
      version: (packageJson.version as string) || '',
      description: (packageJson.description as string) || '',
      path,
      main: (packageJson.main as string) || '',
      types: (packageJson.types as string) || '',
      scripts: (packageJson.scripts as Record<string, string>) || {},
      keywords: (packageJson.keywords as string[]) || [],
      author: (packageJson.author as string) || '',
      license: (packageJson.license as string) || '',
      homepage: (packageJson.homepage as string) || '',
      dependencies: (packageJson.dependencies as Record<string, string>) || {},
      devDependencies: (packageJson.devDependencies as Record<string, string>) || {},
    };
  }

  /**
   * Find all packages in a monorepo
   */
  static findPackages(
    files: Map<string, Record<string, unknown>>,
    _workspacePatterns?: string[]
  ): PackageInfo[] {
    const packages: PackageInfo[] = [];

    for (const [path, content] of files) {
      if (path.endsWith('package.json')) {
        const packageDir = path.replace(/\/package\.json$/, '').replace(/^\.?\/?/, '');
        packages.push(this.extractPackageMetadata(content, packageDir || '.'));
      }
    }

    return packages.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate repository metadata
   */
  static generateMetadata(packages: PackageInfo[]): RepoMetadata {
    const metadata: RepoMetadata = {
      totalPackages: packages.length,
      packages,
      publishedPackages: packages
        .filter(p => p.name && !p.name.startsWith('@') && p.version)
        .map(p => p.name),
    };

    return metadata;
  }
}

/**
 * Package metadata analyzer
 */
export class PackageMetadataAnalyzer {
  /**
   * Get package statistics
   */
  static getStats(packages: PackageInfo[]): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      totalPackages: packages.length,
      withDescriptions: packages.filter(p => p.description).length,
      withScripts: packages.filter(p => Object.keys(p.scripts || {}).length > 0).length,
      withDependencies: packages.filter(p =>
        Object.keys(p.dependencies || {}).length > 0
      ).length,
    };

    // Common scripts
    const scripts = new Map<string, number>();
    packages.forEach(p => {
      Object.keys(p.scripts || {}).forEach(script => {
        scripts.set(script, (scripts.get(script) || 0) + 1);
      });
    });

    stats.commonScripts = Array.from(scripts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // License distribution
    const licenses = new Map<string, number>();
    packages.forEach(p => {
      const license = p.license || 'unknown';
      licenses.set(license, (licenses.get(license) || 0) + 1);
    });

    stats.licenses = Object.fromEntries(licenses);

    return stats;
  }

  /**
   * Find packages with specific script
   */
  static findPackagesWithScript(
    packages: PackageInfo[],
    scriptName: string
  ): PackageInfo[] {
    return packages.filter(
      p => p.scripts && scriptName in p.scripts
    );
  }

  /**
   * Find packages with dependency
   */
  static findPackagesWithDependency(
    packages: PackageInfo[],
    depName: string
  ): PackageInfo[] {
    return packages.filter(p => {
      const deps = { ...p.dependencies, ...p.devDependencies };
      return depName in deps;
    });
  }

  /**
   * Generate dependency matrix
   */
  static generateDependencyMatrix(
    packages: PackageInfo[]
  ): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    packages.forEach(pkg => {
      matrix[pkg.name] = {};
      packages.forEach(other => {
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        matrix[pkg.name][other.name] = other.name in deps;
      });
    });

    return matrix;
  }

  /**
   * Export metadata as JSON
   */
  static exportJson(packages: PackageInfo[], includeStats = true): string {
    const data: Record<string, unknown> = {
      packages,
      count: packages.length,
    };

    if (includeStats) {
      data.stats = this.getStats(packages);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export metadata as markdown
   */
  static exportMarkdown(packages: PackageInfo[]): string {
    let md = '# Repository Packages\n\n';
    md += `Total packages: ${packages.length}\n\n`;

    for (const pkg of packages) {
      md += `## ${pkg.name}`;
      if (pkg.version) md += `@${pkg.version}`;
      md += '\n\n';

      if (pkg.description) md += `${pkg.description}\n\n`;
      if (pkg.path !== '.') md += `**Path:** \`${pkg.path}\`\n\n`;
      
      const scripts = Object.keys(pkg.scripts || {});
      if (scripts.length > 0) {
        md += `**Scripts:** ${scripts.join(', ')}\n\n`;
      }

      md += '---\n\n';
    }

    return md;
  }
}
