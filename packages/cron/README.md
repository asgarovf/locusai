# @locusai/locus-cron

[![npm version](https://img.shields.io/npm/v/@locusai/locus-cron?color=blue)](https://www.npmjs.com/package/@locusai/locus-cron)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/asgarovf/locusai/blob/master/LICENSE)

Standalone cron job scheduler for [Locus](https://github.com/asgarovf/locusai). Define recurring tasks with human-readable intervals, route output to multiple destinations (local files, Telegram, webhooks), and manage everything as a background PM2 process. Works independently of any platform adapter.

## Installation

```bash
locus install cron
```

Or install directly:

```bash
npm install @locusai/locus-cron
```

## Quick Start

```bash
# Add a cron job using natural language (AI-powered)
locus pkg cron add "check disk usage every hour"

# Or add with output routing
locus pkg cron add "run linter every 30 minutes" --route telegram

# Enable the scheduler
locus pkg cron enable

# Start the background worker
locus pkg cron start
```

## Configuration

Cron jobs are stored in `.locus/config.json` under `packages.cron`:

```json
{
  "packages": {
    "cron": {
      "enabled": true,
      "batchWindowSeconds": 60,
      "crons": [
        {
          "name": "disk-check",
          "schedule": "1h",
          "command": "df -h / | tail -1"
        },
        {
          "name": "health-ping",
          "schedule": "5m",
          "command": "curl -s http://localhost:3000/health",
          "routes": ["local", "telegram"]
        },
        {
          "name": "code-review",
          "schedule": "1d",
          "command": "locus exec 'review recent changes and suggest improvements'",
          "routes": ["telegram", "webhook:https://hooks.example.com/locus"]
        }
      ]
    }
  }
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Global on/off switch for the scheduler |
| `batchWindowSeconds` | `number` | `60` | Batch window for co-scheduled notifications (seconds) |
| `crons` | `CronJobConfig[]` | `[]` | Array of cron job definitions |

### Cron Job Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier (alphanumeric + hyphens) |
| `schedule` | `string` | Yes | Human-readable interval (see below) |
| `command` | `string` | Yes | Shell command or `locus exec '<prompt>'` for AI tasks |
| `routes` | `string[]` | No | Output destinations (defaults to `["local"]`) |

### Schedule Format

Instead of cron expressions, schedules use simple human-readable intervals:

| Format | Meaning | Example |
|--------|---------|---------|
| `<n>s` | Every n seconds | `30s` |
| `<n>m` | Every n minutes | `5m` |
| `<n>h` | Every n hours | `1h` |
| `<n>d` | Every n days | `1d` |

Minimum interval is **10 seconds**.

## CLI Usage

### Job Management

```bash
# Add a job from natural language (AI interprets schedule + command)
locus pkg cron add "check linter errors every hour"

# Add with output routing
locus pkg cron add "monitor API health every 5 minutes" --route telegram

# List all configured cron jobs
locus pkg cron list

# Remove a job by name
locus pkg cron remove disk-check

# Enable/disable the scheduler globally
locus pkg cron enable
locus pkg cron disable
```

### Service Management

```bash
# Start cron worker in background (via PM2)
locus pkg cron start

# Stop the cron worker
locus pkg cron stop

# Restart the cron worker
locus pkg cron restart

# Remove the cron worker from PM2
locus pkg cron delete

# Check worker process status
locus pkg cron status

# View last 50 lines of logs (default)
locus pkg cron logs

# View last 100 lines of logs
locus pkg cron logs 100

# Run worker in foreground (useful for development)
locus pkg cron worker
```

### AI-Powered Job Creation

The `add` command uses AI to interpret natural language into structured cron jobs:

```bash
locus pkg cron add "check disk usage every hour"
# → name: "disk-check", schedule: "1h", command: "df -h /"

locus pkg cron add "run tests every 30 minutes"
# → name: "run-tests", schedule: "30m", command: "npm test"

locus pkg cron add "review code quality daily" --route telegram
# → name: "code-review", schedule: "1d", command: "locus exec 'review code quality...'"
```

Development-oriented tasks (review, check, analyze, lint, test) automatically use `locus exec '<prompt>'` to leverage AI.

## Output Routing

Cron job results can be routed to multiple destinations simultaneously. Each job can specify its own `routes` array.

### Local (default)

Writes output to `.locus/cron/<job-name>/output.log`:

```
[2026-03-08T10:00:00.000Z] [OK] /dev/sda1  50G  20G  28G  42% /
[2026-03-08T10:05:00.000Z] [EXIT 1] curl: (7) Failed to connect
```

### Telegram

Sends formatted messages to configured Telegram chats:

```json
{
  "routes": ["telegram"]
}
```

Requires `packages.telegram.botToken` and `packages.telegram.chatIds` in your Locus config. Messages are formatted with MarkdownV2 and include job name, command, status, schedule, and output. Long output is truncated at 3500 characters.

### Webhook

POSTs results as JSON to any URL:

```json
{
  "routes": ["webhook:https://hooks.example.com/locus"]
}
```

Payload format:

```json
{
  "jobId": "disk-check",
  "command": "df -h /",
  "output": "/dev/sda1  50G  20G  28G  42% /",
  "exitCode": 0,
  "timestamp": "2026-03-08T10:00:00.000Z",
  "schedule": "1h"
}
```

### Multiple Routes

Combine routes to send results to multiple destinations:

```json
{
  "routes": ["local", "telegram", "webhook:https://hooks.example.com/locus"]
}
```

## Result Batching

When multiple cron jobs fire at similar times, the batcher groups their results to prevent notification spam. This applies to external adapters (Telegram, webhook) — local file logging always writes immediately.

- **Batch window**: Configurable via `batchWindowSeconds` (default: 60 seconds)
- **Per-route batching**: Results for the same route are combined into a single message
- **Retry logic**: Automatic retry after 5 seconds on adapter failure, with fallback to local logging
- **Graceful degradation**: One adapter failure doesn't block others

## Programmatic API

The package exports its scheduler and utilities for use in other packages:

```ts
import { CronScheduler, parseSchedule, formatInterval } from "@locusai/locus-cron";

// Parse a human-readable schedule to milliseconds
parseSchedule("30m"); // → 1800000
parseSchedule("1h");  // → 3600000
parseSchedule("bad"); // → null

// Format milliseconds back to human-readable
formatInterval(1800000); // → "30m"

// Use the scheduler directly
const scheduler = new CronScheduler(
  {
    enabled: true,
    crons: [
      { name: "my-job", schedule: "5m", command: "echo hello" }
    ],
  },
  process.cwd()
);

scheduler.start();
scheduler.getStatus(); // → { running: true, cronCount: 1, crons: [...] }
scheduler.stop();
```

### Exported Types

```ts
import type {
  CronJobConfig,
  CronConfig,
  CronJobResult,
  ActiveCron,
  CronSchedulerStatus,
  OutputAdapter,
} from "@locusai/locus-cron";
```

## How It Works

1. The cron worker reads configuration from `packages.cron` in `.locus/config.json`
2. Each cron job runs immediately on startup, then repeats at the configured interval
3. Shell commands execute with a 30-second timeout in the project root directory
4. Results are routed through the configured output adapters
5. The result batcher groups co-scheduled notifications to prevent spam
6. The worker runs as a PM2 background process with graceful SIGINT/SIGTERM shutdown
7. PM2 heartbeat integration monitors worker health

## Related Packages

| Package | Description |
|---------|-------------|
| [`@locusai/locus-pm2`](../pm2) | PM2 process management used by this package |
| [`@locusai/sdk`](../sdk) | SDK for building community packages |
| [`@locusai/locus-gateway`](../gateway) | Channel-agnostic message gateway |
| [`@locusai/locus-telegram`](../telegram) | Telegram platform adapter |

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
