# Fix: Node.js Module Import Error - FINAL SOLUTION

## Problem

When running the web app, webpack tried to bundle Node.js modules (`node:child_process`), which don't exist in browsers:

```
Module build failed: UnhandledSchemeError: Reading from "node:child_process" is not handled by plugins
```

## Root Cause

The SDK's `index.ts` was importing and re-exporting `AgentOrchestrator`, which uses Node.js APIs. When the web app imported from `@locusai/sdk`, webpack would evaluate the entire module including Node.js code.

## Solution: Separate Entry Points

Created two entry points:

### 1. Browser-Safe Entry Point (`index.ts`)
```typescript
// packages/sdk/src/index.ts - NO imports from orchestrator
export * from "./events";
export * from "./modules/*";
export class LocusClient { ... }
// Note: AgentOrchestrator NOT exported
```

This is what the web app imports:
```typescript
// apps/web/src/lib/api-client.ts
import { LocusClient, LocusEvent } from "@locusai/sdk"; // ✅ No Node.js code
```

### 2. Node.js-Only Entry Point (`index-node.ts`)
```typescript
// packages/sdk/src/index-node.ts - ONLY orchestrator
export { AgentOrchestrator, type OrchestratorConfig } from "./orchestrator";
```

This is what the CLI imports:
```typescript
// packages/cli/src/cli.ts
const { AgentOrchestrator } = require("@locusai/sdk/src/index-node"); // ✅ Node.js only
```

## Files Changed

| File | Change |
|------|--------|
| `packages/sdk/src/index.ts` | Removed orchestrator import/export, kept LocusClient only |
| `packages/sdk/src/index-node.ts` | **NEW** - Exports orchestrator for CLI only |
| `packages/cli/src/cli.ts` | Updated to import from index-node |

## How It Works

1. **Web App Path**
   - `apps/web/src/lib/api-client.ts` imports `@locusai/sdk` (index.ts)
   - Only gets LocusClient and modules
   - No Node.js code is bundled
   - Webpack builds successfully ✅

2. **CLI Path**
   - `packages/cli/src/cli.ts` requires `@locusai/sdk/src/index-node`
   - Gets AgentOrchestrator with Node.js APIs
   - CLI runs successfully ✅

## Verification

```bash
✓ bun lint    - 0 errors
✓ bun typecheck - 0 errors
✓ Web app builds without Node.js module errors
✓ CLI can still import orchestrator
```

## Key Principles

1. **Separation of Concerns**: Browser code and Node.js code use different entry points
2. **No Pollution**: Node.js modules never reach browser builds
3. **Clean Imports**: Each environment imports what it needs
4. **Type Safety**: Full TypeScript support in both environments

---

**Status**: ✅ FIXED  
**Test**: Run `bun run dev` in apps/web - should work now
