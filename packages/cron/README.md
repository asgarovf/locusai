# @locusai/locus-cron

[![npm version](https://img.shields.io/npm/v/@locusai/locus-cron?color=blue)](https://www.npmjs.com/package/@locusai/locus-cron)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/asgarovf/locusai/blob/master/LICENSE)

Standalone cron job scheduler for [Locus](https://github.com/asgarovf/locusai). Define recurring shell commands with human-readable intervals, managed as a background PM2 process. Works independently of any platform adapter (Telegram, Discord, etc.).

## Installation

```bash
npm install @locusai/locus-cron
```

## Configuration

Add cron jobs to your `.locus/config.json` under `packages.cron`:

```json
{
  "packages": {
    "cron": {
      "enabled": true,
      "crons": [
        {
          "name": "disk-check",
          "schedule": "1h",
          "command": "df -h / | tail -1"
        },
        {
          "name": "health-ping",
          "schedule": "5m",
          "command": "curl -s http://localhost:3000/health"
        }
      ]
    }
  }
}
```

### Cron Job Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique name for the cron job |
| `schedule` | `string` | Yes | Human-readable interval (see below) |
| `command` | `string` | Yes | Shell command to execute |

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

## Output

All cron job output is written to `.locus/cron/output.log` in the project root. Each entry is timestamped and tagged with the job name:

```
[info] Cron scheduler started with 2 job(s)
[2026-03-06T10:00:00.000Z] [disk-check] /dev/sda1  50G  20G  28G  42% /
[2026-03-06T10:00:00.000Z] [health-ping] {"status":"ok"}
```

Errors are logged with an `ERROR` prefix:

```
[2026-03-06T10:05:00.000Z] [health-ping] ERROR: Command failed: curl -s http://localhost:3000/health
```

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
  ActiveCron,
  CronSchedulerStatus,
} from "@locusai/locus-cron";
```

## How It Works

1. The cron worker reads configuration from `packages.cron` in `.locus/config.json`
2. Each cron job runs immediately on startup, then repeats at the configured interval using `setInterval`
3. Shell commands execute with a 30-second timeout in the project root directory
4. Output (stdout/stderr) is appended to `.locus/cron/output.log`
5. The worker runs as a PM2 background process with graceful SIGINT/SIGTERM shutdown

## Related Packages

| Package | Description |
|---------|-------------|
| [`@locusai/locus-pm2`](../pm2) | PM2 process management used by this package |
| [`@locusai/sdk`](../sdk) | SDK for building community packages |
| [`@locusai/locus-gateway`](../gateway) | Channel-agnostic message gateway |
| [`@locusai/locus-telegram`](../telegram) | Telegram platform adapter |

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
