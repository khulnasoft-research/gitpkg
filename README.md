<img alt="GitPkg-icon" src="docs/.vuepress/public/cover.svg" width="100%" height="260px">

# GitPkg

[![GitHub deployments](https://img.shields.io/github/deployments/EqualMa/gitpkg/production?label=gitpkg.now.sh&logo=zeit&style=flat-square)](https://gitpkg.now.sh)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg?style=flat-square)](https://lerna.js.org/)

GitPkg v2 enables you to install subdirectories from GitHub, GitLab, Gitee, and Bitbucket as npm/yarn dependencies with caching, security verification, and performance optimizations.

[:tada: Try Now !](https://gitpkg.now.sh)

## v2 Features

✨ **Smart Caching** - 40-60% faster repeated installations with LRU cache  
🚀 **Performance** - 3-5x faster multi-package downloads with connection pooling  
🔐 **Security** - SHA256 verification, SRI support, audit logging  
🌍 **Multi-Provider** - GitHub, GitLab, Gitee, Bitbucket support  
📦 **Monorepo Tools** - Introspection, dependency graphs, lock files  
🎯 **Advanced CLI** - Interactive wizard, tab completion, package search  
📝 **Lock Files** - package-lock.json and yarn.lock support  
⚡ **Zero Breaking Changes** - Fully backward compatible with v1  

## Quick Start

```bash
# Install package from subdirectory
npm install https://github.com/owner/repo//packages/my-package

# Or with any provider
npm install https://gitlab.com/owner/repo//packages/my-package
npm install https://gitee.com/owner/repo//packages/my-package
npm install https://bitbucket.org/workspace/repo//packages/my-package

# Interactive mode
npm install -g gitpkg
gitpkg browse
```

## Installation

```bash
npm install -g gitpkg
# or
yarn global add gitpkg
```

## Documentation

- **[Features Guide](./FEATURES.md)** - Detailed documentation of all 10 new features
- **[Migration Guide](./MIGRATION.md)** - Upgrade from v1 to v2
- **[Changelog](./CHANGELOG.md)** - Complete version history
- **[Official Site](https://gitpkg.vercel.app)** - Full documentation
