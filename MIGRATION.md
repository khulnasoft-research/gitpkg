# GitPkg v1 to v2 Migration Guide

This guide helps you migrate from GitPkg v1 to v2 with all the new features.

## Overview of Changes

### Tech Stack
- **Node.js:** 8+ → 20 LTS
- **TypeScript:** 3.7 → 5.4
- **Lerna:** 3.20 → 8.1
- **ESLint:** 6.8 → 9.0 (flat config)

### New Features
1. Smart caching system
2. Performance optimizations (parallel downloads, connection pooling)
3. Multi-provider support (GitHub, GitLab, Gitee, Bitbucket)
4. Security & integrity verification
5. Dependency resolution & lock files
6. Advanced CLI with interactive mode
7. Monorepo introspection

### Breaking Changes
None! v2 maintains backward compatibility with v1 URLs and APIs.

## Upgrade Steps

### 1. Update Node.js Version

```bash
# Check your current version
node --version

# Install Node.js 20 LTS
# Using nvm:
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

### 2. Update Dependencies

```bash
# Update to v2
npm install gitpkg@2
# or
yarn upgrade gitpkg@2
```

### 3. Update Package.json

Your `package.json` should specify Node 20+:

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 4. Clear Old Caches

If you have any cached packages:

```bash
# Clear npm cache
npm cache clean --force

# Clear any gitpkg caches
rm -rf node_modules/.gitpkg-cache
```

### 5. Recompile ESLint Config (if customized)

If you have custom ESLint configuration, update to flat config format:

**Before (eslintrc.js):**
```javascript
module.exports = {
  extends: ['eslint:recommended'],
  rules: { /* ... */ }
}
```

**After (eslint.config.js):**
```javascript
import eslintJs from '@eslint/js';

export default [
  eslintJs.configs.recommended,
  {
    rules: { /* ... */ }
  }
];
```

## Using New Features

### Smart Caching

Automatically enabled. Monitor performance:

```bash
gitpkg info --stats
```

### Multi-Provider URLs

New format (all providers supported):

```bash
# GitHub (unchanged)
npm install https://github.com/owner/repo//packages/pkg@main

# GitLab (new)
npm install https://gitlab.com/group/repo//packages/pkg@main

# Gitee (new)
npm install https://gitee.com/owner/repo//packages/pkg@master

# Bitbucket (new)
npm install https://bitbucket.org/workspace/repo//packages/pkg@master
```

### Interactive Mode

Try the new interactive wizard:

```bash
gitpkg browse
# or
gitpkg --interactive
```

### Configuration

Create a `.gitpkg.json` in your project root:

```json
{
  "defaultProvider": "github",
  "defaultBranch": "main",
  "cacheDir": "./node_modules/.gitpkg-cache",
  "timeout": 30000,
  "verbose": false
}
```

Or generate with:
```bash
gitpkg config --init
```

### API Usage

**v1 (still works):**
```typescript
import gitpkg from '@gitpkg/core';

const pkg = await gitpkg('owner/repo//packages/pkg');
```

**v2 (new features):**
```typescript
import { createProviderFromUrl } from '@gitpkg/core/providers';
import { LRUCache } from '@gitpkg/core/cache';
import { IntegrityVerifier } from '@gitpkg/core/security';

// Auto-detect provider and parse URL
const provider = createProviderFromUrl(url);
const info = provider.parseUrl(url);

// Use caching
const cache = new LRUCache(100);
cache.set('key', data);

// Verify integrity
const hash = IntegrityVerifier.calculateSHA256(data);
```

## Performance Tips

### 1. Enable Caching
- Automatic with v2
- Hit rate typically 40-60% on repeated installs
- Monitor with `--verbose` flag

### 2. Use Parallel Downloads
- Enabled by default for multiple packages
- Configurable concurrency in `.gitpkg.json`:

```json
{
  "maxConcurrency": 10
}
```

### 3. Use Lock Files
- Generate with `gitpkg lock`
- Commit to version control
- Faster and more reproducible installs

### 4. Set Up Tab Completion

**Bash:**
```bash
gitpkg --completion bash | sudo tee /etc/bash_completion.d/gitpkg
```

**Zsh:**
```bash
gitpkg --completion zsh | sudo tee /usr/local/share/zsh/site-functions/_gitpkg
```

## Troubleshooting

### Issue: Cache not working

```bash
# Clear cache and try again
gitpkg cache --clear
npm install gitpkg-package
```

### Issue: Provider detection fails

```bash
# Specify provider explicitly
npm install package-url --provider github
```

### Issue: Rate limiting

```bash
# Configure API tokens in environment
export GITHUB_TOKEN=your_token
export GITLAB_TOKEN=your_token
export GITEE_TOKEN=your_token
export BITBUCKET_TOKEN=your_token

npm install package
```

### Issue: ESLint configuration errors

Update to flat config format in `eslint.config.js`:

```bash
gitpkg config --eslint-help
```

## Rollback Plan

If you need to revert to v1:

```bash
npm install gitpkg@1
node --version # Switch back to Node 16
```

## Getting Help

- **Documentation:** https://gitpkg.vercel.app
- **GitHub Issues:** https://github.com/khulnasoft-research/gitpkg/issues
- **Interactive Help:** `gitpkg help [command]`

## Changelog

For detailed list of changes, see [CHANGELOG.md](./CHANGELOG.md)

### v2.0.0 Highlights
- ✅ Node.js 20 LTS support
- ✅ TypeScript 5.4
- ✅ ESLint v9 with flat config
- ✅ Multi-provider support
- ✅ Smart caching system
- ✅ Performance optimizations
- ✅ Security improvements
- ✅ Advanced CLI
- ✅ Monorepo introspection
- ✅ Full backward compatibility

## Next Steps

1. Update to v2: `npm install gitpkg@2`
2. Review [FEATURES.md](./FEATURES.md) for new capabilities
3. Try interactive mode: `gitpkg browse`
4. Configure in `.gitpkg.json` if needed
5. Enjoy faster, more secure package installations!

---

**Questions?** Check our [FAQ](./FAQ.md) or open an issue on GitHub.
