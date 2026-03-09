---
name: dependency-manager
description: Manage project dependencies — update packages, audit vulnerabilities, resolve conflicts, and keep dependencies healthy. Use when updating packages, fixing vulnerability alerts, or resolving dependency issues.
allowed-tools: [Read, Grep, Glob, Bash]
tags: [dependencies, npm, yarn, pip, packages, vulnerabilities, security, updates, audit]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Dependency Manager

## When to use this skill
- Updating outdated dependencies
- Fixing security vulnerability alerts (Dependabot, npm audit)
- Resolving dependency conflicts or version mismatches
- Adding new packages (choosing the right ones)
- Cleaning up unused dependencies
- Migrating between package managers

## Step 1: Assess current state

### Node.js / npm / yarn

```bash
# Check for outdated packages
npm outdated
yarn outdated

# Security audit
npm audit
yarn audit

# List installed packages
npm ls --depth=0
npm ls <package-name>  # Check specific package tree

# Find unused dependencies
npx depcheck
```

### Python / pip

```bash
# Check outdated
pip list --outdated

# Security audit
pip-audit
safety check

# Show dependency tree
pipdeptree
```

## Step 2: Update strategy

### Semantic versioning guide
```
MAJOR.MINOR.PATCH
^2.1.0  → allows 2.x.x (minor + patch updates)
~2.1.0  → allows 2.1.x (patch updates only)
2.1.0   → exact version (no updates)
```

### Safe update order

1. **Patch updates first** — bug fixes, lowest risk:
   ```bash
   npm update  # Updates within semver range
   ```

2. **Minor updates** — new features, backward compatible:
   ```bash
   npx npm-check-updates --target minor -u
   npm install
   npm test
   ```

3. **Major updates** — one at a time, may have breaking changes:
   ```bash
   npm install <package>@latest
   # Read CHANGELOG/migration guide
   # Run tests
   # Fix breaking changes
   # Commit
   ```

## Step 3: Handle vulnerabilities

```bash
# View audit details
npm audit

# Auto-fix where possible
npm audit fix

# Force fix (may include breaking changes — review carefully)
npm audit fix --force

# If a vulnerability is in a transitive dependency:
# 1. Check if parent package has a newer version
npm ls <vulnerable-package>
# 2. Override the transitive version
# In package.json:
```

```json
{
  "overrides": {
    "vulnerable-package": "^2.0.1"
  }
}
```

## Step 4: Resolve conflicts

### Peer dependency conflicts
```bash
# See the conflict
npm install --dry-run

# Option 1: Use --legacy-peer-deps (temporary)
npm install --legacy-peer-deps

# Option 2: Fix by aligning versions
# Read both packages' peerDependencies and find compatible range
```

### Lock file conflicts
```bash
# Delete and regenerate (when lock file is corrupted)
rm package-lock.json node_modules -rf
npm install

# Or for yarn
rm yarn.lock node_modules -rf
yarn install
```

## Step 5: Evaluate new packages

Before adding a dependency, check:

```bash
# Package stats
npm view <package> time.modified  # Last publish date
npm view <package> maintainers    # Active maintainers?

# Size impact
npx package-phobia <package>     # Install size
npx bundlephobia <package>       # Bundle size

# Alternatives
npx npm-compare <pkg1> <pkg2>
```

Decision criteria:
- **Maintenance**: Last published < 6 months ago?
- **Popularity**: Reasonable download count?
- **Size**: Justified for the functionality?
- **License**: Compatible with your project?
- **Dependencies**: Minimal transitive deps?
- **Alternatives**: Can you do this with existing deps or stdlib?

## Step 6: Clean up

```bash
# Find unused dependencies
npx depcheck

# Remove unused
npm uninstall <package>

# Clean up node_modules
rm -rf node_modules package-lock.json
npm install

# Deduplicate
npm dedupe
```

## Checklist

- [ ] Current dependency state assessed (outdated, vulnerabilities)
- [ ] Patch updates applied and tested
- [ ] Minor updates reviewed and applied
- [ ] Major updates applied one at a time with testing
- [ ] Security vulnerabilities addressed
- [ ] No unused dependencies
- [ ] Lock file committed
- [ ] CI/CD still passes
- [ ] No peer dependency warnings
