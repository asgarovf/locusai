# Release Checklist

This document outlines the steps to verify before releasing packages to npm.

## Pre-Release Verification

### 1. Build Verification

Test that all publishable packages build correctly:

```bash
# Build all publishable packages (SDK, CLI)
bun run build:packages

# Or build individually:
bun run build:sdk       # Builds TypeScript SDK
bun run build:cli-only  # Builds CLI binary
```

**Note**: Web, API, and MCP apps are NOT published to npm and are excluded from the release build.

### 2. Lint & Type Check

Ensure code quality:

```bash
# Run linter
bun run lint

# Run type checker
bun run typecheck
```

All checks should pass with 0 errors.

### 3. Test Locally

#### Testing the CLI

To test the CLI as it will work in production:

```bash
# Build the packages
bun run build:packages

# Test the CLI binary directly
node packages/cli/bin/locus.js --help

# Test with actual agent run (requires API key)
node packages/cli/bin/locus.js run \
  --api-key YOUR_API_KEY \
  --workspace YOUR_WORKSPACE_ID
```

#### Testing the SDK

The SDK has dual exports for browser and Node.js environments:

```typescript
// Browser-safe imports (LocusClient only)
import { LocusClient } from '@locusai/sdk';

// Node.js imports (includes agent, AI, core modules)
import { AgentWorker, CodebaseIndexer } from '@locusai/sdk/node';
```

To test SDK imports:

```bash
# Create a test file
echo "import { LocusClient } from '@locusai/sdk';" > test-sdk.ts
echo "import { AgentWorker } from '@locusai/sdk/node';" >> test-sdk.ts

# Run type check
bun run typecheck
```

### 4. Package Configuration

Verify package.json files are correctly configured:

#### SDK Package (`packages/sdk/package.json`)

- ✅ `private: false` (allows publishing)
- ✅ `main` and `types` point to `src/index.ts` (development)
- ✅ `exports` configured for both browser (`.`) and Node.js (`./node`)
- ✅ `publishConfig` overrides to use `dist/` files (production)
- ✅ `files` includes `["dist", "src", "README.md"]`

#### CLI Package (`packages/cli/package.json`)

- ✅ `bin` points to `./bin/locus.js`
- ✅ Build script targets Node.js: `bun build ./index.ts --target=node`

#### Shared Package (`packages/shared/package.json`)

- ✅ Uses source files directly (no build step needed)
- ✅ `main` points to `src/index.ts`

### 5. GitHub Release Workflow

The release workflow (`.github/workflows/release.yml`) is configured to:

1. Install dependencies with Bun
2. Run `bun run release` which:
   - Builds packages with `bun run build:packages` (SDK + CLI only)
   - Publishes to npm with `changeset publish`

**Important**: The workflow does NOT build or publish web/api/mcp apps.

### 6. Changesets

Before releasing, ensure changesets are created:

```bash
# Create a changeset
bun changeset

# Follow the prompts to describe changes
# Select packages that changed
# Choose version bump (patch/minor/major)
```

## Release Process

### 1. Create Changesets

```bash
bun changeset
```

### 2. Commit Changesets

```bash
git add .changeset
git commit -m "chore: add changesets for release"
git push
```

### 3. Trigger Release

Go to GitHub Actions and manually trigger the "Release" workflow. This will:

1. Create a PR with version bumps and changelog updates
2. When the PR is merged, automatically publish to npm

### 4. Verify Publication

After the workflow completes, verify packages are published:

```bash
# Check SDK
npm view @locusai/sdk

# Check CLI
npm view @locusai/cli

# Check Shared
npm view @locusai/shared
```

### 5. Test Published Packages

Test the published CLI:

```bash
# Install globally
npm install -g @locusai/cli

# Or use npx
npx @locusai/cli --help

# Test agent run
npx @locusai/cli run \
  --api-key YOUR_API_KEY \
  --workspace YOUR_WORKSPACE_ID
```

## Troubleshooting

### Module Resolution Issues

If you encounter "Cannot find module" errors:

1. Check `package.json` `exports` field
2. Verify `publishConfig` is correct
3. Ensure `dist/` files exist after build
4. Test with `npm pack` to inspect package contents

### Build Failures

If builds fail:

1. Run `bun run typecheck` to find type errors
2. Run `bun run lint` to find code quality issues
3. Check that all dependencies are installed
4. Verify Node.js and Bun versions

### Orchestrator Worker Resolution

The orchestrator resolves the worker path using:

```typescript
const workerPath = join(__dirname, "agent", "worker.js");
```

This works in both development (with source maps) and production (compiled) because:
- In development: `__dirname` points to `packages/sdk/src/`
- In production: `__dirname` points to `packages/sdk/dist/`

### Next.js Bundling Issues

If Next.js tries to bundle Node.js modules:

1. Check `apps/web/next.config.js` has webpack externals configured
2. Verify SDK exports are split between browser (`.`) and Node.js (`./node`)
3. Ensure web app only imports from `@locusai/sdk` (not `/node`)

## Architecture Notes

### Dual Package Exports

The SDK uses a dual export strategy:

- **Browser Export** (`@locusai/sdk`): Only exports `LocusClient` and API modules
- **Node.js Export** (`@locusai/sdk/node`): Exports agent, AI, and core modules

This prevents Next.js from bundling Node.js-specific code (fs, child_process) for the browser.

### Build Targets

- **SDK**: TypeScript compilation (`tsc`) for proper type definitions
- **CLI**: Bun build with `--target=node` for Node.js compatibility

### Package Structure

```
packages/
├── sdk/           # Core SDK (published)
│   ├── src/       # TypeScript source
│   └── dist/      # Compiled output
├── cli/           # CLI tool (published)
│   ├── bin/       # Compiled binaries
│   └── public/    # Dashboard assets
└── shared/        # Shared types (published)
    └── src/       # Source files (no build)
```

## Summary

Before releasing:

1. ✅ Run `bun run build:packages`
2. ✅ Run `bun run lint`
3. ✅ Run `bun run typecheck`
4. ✅ Test CLI locally with `node packages/cli/bin/locus.js`
5. ✅ Create changesets with `bun changeset`
6. ✅ Commit and push
7. ✅ Trigger GitHub release workflow
8. ✅ Verify publication on npm
9. ✅ Test published packages with `npx @locusai/cli`
