/**
 * Dependency Resolution Module
 * Handles package-lock.json, yarn.lock support and nested dependencies
 */

export interface PackageDependency {
  name: string;
  version: string;
  resolved?: string;
  integrity?: string;
  optional?: boolean;
  dev?: boolean;
}

export interface LockFileEntry {
  version: string;
  resolved: string;
  integrity?: string;
  dependencies?: Record<string, string>;
}

export interface LockFile {
  version: number;
  lockfileVersion: number;
  packages: Record<string, LockFileEntry>;
  dependencies: Record<string, PackageDependency>;
}

export interface DependencyGraph {
  root: string;
  dependencies: Map<string, Set<string>>;
  versions: Map<string, string>;
}

/**
 * Lock file parser and generator
 */
export class LockFileManager {
  /**
   * Parse package-lock.json
   */
  static parsePackageLock(content: string): LockFile {
    const data = JSON.parse(content);
    return {
      version: data.version,
      lockfileVersion: data.lockfileVersion,
      packages: data.packages || {},
      dependencies: data.dependencies || {},
    };
  }

  /**
   * Parse yarn.lock
   */
  static parseYarnLock(content: string): Record<string, LockFileEntry> {
    const entries: Record<string, LockFileEntry> = {};
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) {
        i++;
        continue;
      }

      // Parse package entry
      if (line.endsWith(':')) {
        const key = line.slice(0, -1);
        const entry: LockFileEntry = {
          version: '',
          resolved: '',
        };

        i++;
        while (i < lines.length) {
          const propLine = lines[i];
          if (!propLine.startsWith('  ')) {
            break;
          }

          const [prop, value] = propLine.trim().split(/:\s+/);
          if (prop === 'version') {
            entry.version = value?.replace(/^"(.*)"$/, '$1') || '';
          } else if (prop === 'resolved') {
            entry.resolved = value?.replace(/^"(.*)"$/, '$1') || '';
          } else if (prop === 'integrity') {
            entry.integrity = value?.replace(/^"(.*)"$/, '$1') || '';
          }

          i++;
        }

        entries[key] = entry;
      } else {
        i++;
      }
    }

    return entries;
  }

  /**
   * Generate package-lock.json content
   */
  static generatePackageLock(
    dependencies: PackageDependency[],
    version = 3
  ): string {
    const lockFile: Record<string, unknown> = {
      name: 'gitpkg-lock',
      version: '1.0.0',
      lockfileVersion: version,
      requires: true,
      packages: {},
      dependencies: {},
    };

    for (const dep of dependencies) {
      const key = `node_modules/${dep.name}`;
      (lockFile.packages as Record<string, unknown>)[key] = {
        version: dep.version,
        resolved: dep.resolved,
        integrity: dep.integrity,
      };

      (lockFile.dependencies as Record<string, unknown>)[dep.name] = {
        version: dep.version,
        resolved: dep.resolved,
        integrity: dep.integrity,
      };
    }

    return JSON.stringify(lockFile, null, 2);
  }

  /**
   * Detect lock file type from content
   */
  static detectLockFileType(content: string): 'package-lock' | 'yarn' | 'unknown' {
    if (content.includes('"lockfileVersion"')) {
      return 'package-lock';
    }
    if (content.includes('# yarn lockfile')) {
      return 'yarn';
    }
    return 'unknown';
  }
}

/**
 * Dependency graph analyzer
 */
export class DependencyGraphAnalyzer {
  /**
   * Build dependency graph from lock file
   */
  static buildGraph(lockFile: LockFile, rootPackage = 'root'): DependencyGraph {
    const graph: DependencyGraph = {
      root: rootPackage,
      dependencies: new Map(),
      versions: new Map(),
    };

    // Add root dependencies
    const rootDeps = new Set<string>();
    for (const [name, dep] of Object.entries(lockFile.dependencies || {})) {
      rootDeps.add(name);
      graph.versions.set(name, dep.version);
    }
    graph.dependencies.set(rootPackage, rootDeps);

    // Add nested dependencies
    for (const [path, entry] of Object.entries(lockFile.packages || {})) {
      const packageName = path.split('/').pop() || '';
      graph.versions.set(packageName, entry.version);

      if (entry.dependencies) {
        const deps = new Set(Object.keys(entry.dependencies));
        graph.dependencies.set(packageName, deps);
      }
    }

    return graph;
  }

  /**
   * Find circular dependencies
   */
  static findCircularDeps(graph: DependencyGraph): string[][] {
    const circles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const visit = (node: string, path: string[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const deps = graph.dependencies.get(node) || new Set();
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visit(dep, [...path]);
        } else if (recStack.has(dep)) {
          const circleStart = path.indexOf(dep);
          circles.push(path.slice(circleStart).concat(dep));
        }
      }

      recStack.delete(node);
    };

    for (const node of graph.dependencies.keys()) {
      if (!visited.has(node)) {
        visit(node, []);
      }
    }

    return circles;
  }

  /**
   * Check for version conflicts
   */
  static findVersionConflicts(graph: DependencyGraph): Map<string, Set<string>> {
    const conflicts = new Map<string, Set<string>>();

    for (const [pkg, version] of graph.versions) {
      const dependents = new Set<string>();
      for (const [dependent, deps] of graph.dependencies) {
        if (deps.has(pkg)) {
          dependents.add(dependent);
        }
      }

      if (dependents.size > 1) {
        conflicts.set(pkg, dependents);
      }
    }

    return conflicts;
  }

  /**
   * Get dependency tree as formatted string
   */
  static formatTree(graph: DependencyGraph, maxDepth = 5): string {
    let output = `${graph.root}\n`;
    const visited = new Set<string>();

    const formatNode = (name: string, indent = '', isLast = true, depth = 0): void => {
      if (depth > maxDepth || visited.has(name)) {
        return;
      }

      visited.add(name);
      const prefix = isLast ? '└── ' : '├── ';
      const version = graph.versions.get(name) || '?';
      output += `${indent}${prefix}${name}@${version}\n`;

      const deps = graph.dependencies.get(name) || new Set();
      const depsArray = Array.from(deps);
      depsArray.forEach((dep, idx) => {
        const isLastDep = idx === depsArray.length - 1;
        const newIndent = indent + (isLast ? '    ' : '│   ');
        formatNode(dep, newIndent, isLastDep, depth + 1);
      });
    };

    const rootDeps = graph.dependencies.get(graph.root) || new Set();
    Array.from(rootDeps).forEach((dep, idx) => {
      const isLast = idx === rootDeps.size - 1;
      formatNode(dep, '', isLast);
    });

    return output;
  }
}
