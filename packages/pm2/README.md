# @locusai/locus-pm2

[![npm version](https://img.shields.io/npm/v/@locusai/locus-pm2?color=blue)](https://www.npmjs.com/package/@locusai/locus-pm2)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/asgarovf/locusai/blob/master/LICENSE)

Unified PM2 process management for [Locus](https://github.com/asgarovf/locusai) platform packages. Wraps PM2 operations (start, stop, restart, delete, status, logs) into a reusable TypeScript API with intelligent binary discovery, so any platform adapter can manage long-running processes without dealing with PM2 internals.

## Installation

```bash
npm install @locusai/locus-pm2
```

## Quick Start

```ts
import { pm2Start, pm2Status, pm2Stop } from "@locusai/locus-pm2";

const config = {
  processName: "my-service",
  scriptPath: "/absolute/path/to/server.js",
};

// Start (or restart if already running)
pm2Start(config);

// Check status
const status = pm2Status(config);
console.log(status?.status); // "online"

// Stop
pm2Stop(config);
```

## API Reference

### `pm2Start(config: Pm2Config): string`

Starts a process with PM2. If a process with the same name already exists, it restarts it instead.

```ts
pm2Start({ processName: "locus-telegram", scriptPath: "/path/to/bot.js" });
// → "Started locus-telegram"  or  "Restarted locus-telegram"
```

### `pm2Stop(config: Pm2Config): string`

Stops a running PM2 process.

```ts
pm2Stop({ processName: "locus-telegram", scriptPath: "" });
// → "Stopped locus-telegram"
```

### `pm2Restart(config: Pm2Config): string`

Restarts a running PM2 process.

```ts
pm2Restart({ processName: "locus-telegram", scriptPath: "" });
// → "Restarted locus-telegram"
```

### `pm2Delete(config: Pm2Config): string`

Stops and removes a process from PM2 entirely.

```ts
pm2Delete({ processName: "locus-telegram", scriptPath: "" });
// → "Deleted locus-telegram"
```

### `pm2Status(config: Pm2Config): Pm2Status | null`

Returns the current status of a PM2 process, or `null` if the process is not found.

```ts
const status = pm2Status({ processName: "locus-telegram", scriptPath: "" });
// → { name: "locus-telegram", status: "online", pid: 12345, uptime: 3600000, memory: 52428800, restarts: 0 }
```

### `pm2Logs(config: Pm2Config, lines?: number): string`

Retrieves recent log output for a PM2 process.

```ts
pm2Logs(config);       // last 50 lines (default)
pm2Logs(config, 100);  // last 100 lines
```

Returns `"No logs available."` if the process has no logs or the command fails.

### `resolvePackageScript(importMetaUrl: string, binName: string): string`

Resolves the absolute path to a package binary. Given an `import.meta.url` from the calling module, returns `<packageRoot>/bin/<binName>.js`.

```ts
import { resolvePackageScript } from "@locusai/locus-pm2";

// From packages/telegram/src/pm2.ts
const scriptPath = resolvePackageScript(import.meta.url, "bot");
// → /path/to/packages/telegram/bin/bot.js
```

## Configuration

### `Pm2Config`

Configuration object passed to all PM2 operations.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `processName` | `string` | Yes | PM2 process name (e.g. `"locus-telegram"`) |
| `scriptPath` | `string` | Yes | Absolute path to the script to run |
| `scriptArgs` | `string[]` | No | Extra arguments passed after `--` to the script |

### `Pm2Status`

Status object returned by `pm2Status()`.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Process name |
| `status` | `string` | Current status (`"online"`, `"stopped"`, `"errored"`, etc.) |
| `pid` | `number \| null` | Process ID, or `null` if not running |
| `uptime` | `number \| null` | Uptime in milliseconds, or `null` if not running |
| `memory` | `number \| null` | Memory usage in bytes, or `null` if not running |
| `restarts` | `number` | Number of restarts |

## Usage in Platform Packages

Platform adapters (Telegram, Discord, etc.) use this package to manage their long-running processes. Here's how a typical adapter integrates:

```ts
// packages/telegram/src/pm2.ts
import type { Pm2Config } from "@locusai/locus-pm2";
import {
  pm2Start,
  pm2Stop,
  pm2Status,
  pm2Logs,
  pm2Delete,
  resolvePackageScript,
} from "@locusai/locus-pm2";

function getConfig(): Pm2Config {
  return {
    processName: "locus-telegram",
    scriptPath: resolvePackageScript(import.meta.url, "bot"),
    scriptArgs: ["bot"],
  };
}

// Start the Telegram bot as a background daemon
export function startBot() {
  return pm2Start(getConfig());
}

// Check if the bot is running
export function botStatus() {
  return pm2Status(getConfig());
}

// View recent logs
export function botLogs(lines?: number) {
  return pm2Logs(getConfig(), lines);
}

// Stop the bot
export function stopBot() {
  return pm2Stop(getConfig());
}

// Remove the bot process entirely
export function deleteBot() {
  return pm2Delete(getConfig());
}
```

The CLI then exposes these as subcommands (e.g., `locus pkg telegram start`, `locus pkg telegram status`).

## PM2 Binary Discovery

The package automatically finds the PM2 binary using a four-step fallback:

1. Walk up from `cwd` looking for `node_modules/.bin/pm2`
2. Walk up from the running script looking for `node_modules/.bin/pm2`
3. Check system `PATH` via `which pm2`
4. Fall back to `npx pm2`

No manual configuration is needed.

## Related Packages

| Package | Description |
|---------|-------------|
| [`@locusai/locus-gateway`](../gateway) | Channel-agnostic message gateway that platform adapters connect to |
| [`@locusai/locus-telegram`](../telegram) | Telegram adapter — primary consumer of this package |
| [`@locusai/sdk`](../sdk) | SDK for building community packages |

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
