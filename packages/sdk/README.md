# @locusai/sdk

[![npm version](https://img.shields.io/npm/v/@locusai/sdk?color=blue)](https://www.npmjs.com/package/@locusai/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/asgarovf/locusai/blob/master/LICENSE)

SDK for building [Locus](https://github.com/asgarovf/locusai)-compatible community packages. Provides configuration management, CLI invocation, structured logging, and TypeScript type definitions.

## Installation

```bash
npm install @locusai/sdk
```

## Quick Start

```ts
import {
  readLocusConfig,
  invokeLocus,
  invokeLocusStream,
  createLogger,
} from "@locusai/sdk";

// Read merged project + global config
const config = readLocusConfig();

// Run a Locus CLI command and capture output
const result = await invokeLocus(["status"]);
console.log(result.stdout);

// Stream output from a long-running command
const child = invokeLocusStream(["run", "42"]);
child.stdout?.pipe(process.stdout);

// Create a logger for your package
const log = createLogger("my-package");
log.info("Package initialized");
```

## API Reference

### Configuration

#### `readLocusConfig(cwd?: string): LocusConfig`

Reads and merges global (`~/.locus/config.json`) and project-level (`.locus/config.json`) configuration files. Project config takes precedence over global config.

```ts
import { readLocusConfig } from "@locusai/sdk";

const config = readLocusConfig();
console.log(config.ai.model);           // configured AI model
console.log(config.packages?.telegram);  // package-specific config
```

#### `DEFAULT_CONFIG`

Safe defaults for all configuration sections. Useful as a fallback.

### Invocation

#### `invokeLocus(args: string[], cwd?: string): Promise<LocusInvokeResult>`

Spawns the `locus` CLI binary and captures output. Returns stdout, stderr, and exit code.

```ts
import { invokeLocus } from "@locusai/sdk";

const result = await invokeLocus(["exec", "--non-interactive", "explain this code"]);
console.log(result.stdout);    // AI response
console.log(result.exitCode);  // 0 on success
```

#### `invokeLocusStream(args: string[], cwd?: string): ChildProcess`

Returns a raw `ChildProcess` for streaming output. Use this for long-running commands where you need real-time output.

```ts
import { invokeLocusStream } from "@locusai/sdk";

const child = invokeLocusStream(["run", "42"]);
child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
child.on("close", (code) => console.log("Exit:", code));
```

### Logging

#### `createLogger(name: string): LocusLogger`

Creates a named logger with consistent formatting matching Locus CLI output. All output goes to stderr to avoid polluting stdout.

```ts
import { createLogger } from "@locusai/sdk";

const log = createLogger("my-package");
log.info("Started");           // ● [my-package] Started
log.warn("Rate limited");      // ⚠ [my-package] Rate limited
log.error("Connection lost");  // ✗ [my-package] Connection lost
log.debug("Payload:", data);   // ⋯ [my-package] Payload: ... (only with LOCUS_DEBUG=1)
```

### Types

```ts
import type {
  LocusConfig,
  LocusPackageManifest,
  LocusInvokeResult,
  LocusLogger,
  AIProvider,
} from "@locusai/sdk";
```

| Type | Description |
|------|-------------|
| `LocusConfig` | Full configuration schema (AI, GitHub, agent, sprint, sandbox, packages) |
| `LocusPackageManifest` | Shape of the `"locus"` field in package.json |
| `LocusInvokeResult` | Return type from `invokeLocus()` — `{ stdout, stderr, exitCode }` |
| `LocusLogger` | Logger interface with `info`, `warn`, `error`, `debug` methods |
| `AIProvider` | Union type: `"claude" | "codex"` |

## Building a Package

See the [Package Author Guide](./PACKAGE_GUIDE.md) for a complete walkthrough covering:

- Package structure and naming conventions (`@locusai/locus-<name>`)
- Required `package.json` fields and the `"locus"` manifest
- Using the SDK for config, invocation, and logging
- Building, testing, and publishing
- Submitting a pull request

You can also scaffold a new package with:

```bash
locus create my-package
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@locusai/cli`](../cli) | Main Locus CLI |
| [`@locusai/locus-gateway`](../gateway) | Channel-agnostic message gateway for platform adapters |
| [`@locusai/locus-pm2`](../pm2) | PM2 process management for background workers |
| [`@locusai/locus-telegram`](../telegram) | Telegram adapter — reference implementation |
| [`@locusai/locus-cron`](../cron) | Cron scheduler package |
| [`@locusai/locus-linear`](../linear) | Linear integration package |
| [`@locusai/locus-jira`](../jira) | Jira integration package |
| [`@locusai/locus-mcp`](../mcp) | MCP server management |

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
