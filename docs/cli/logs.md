---
description: View, tail, and manage execution logs. Filter by level, follow in real time, and prune old log files.
---

# locus logs

View and manage Locus execution logs. Logs are stored as structured NDJSON files in `.locus/logs/` and capture events from all CLI operations.

## Usage

```bash
locus logs [options]
```

---

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--follow` | `-f` | Tail the log file in real time (Ctrl+C to stop) |
| `--level <level>` | | Filter entries by log level: `error`, `warn`, `info`, `verbose`, `debug` |
| `--lines` | `-n` | Maximum number of lines to display (default: 50) |
| `--clean` | | Remove old log files, keeping only the most recent one |

---

## Modes

### View Logs (default)

Without any flags, displays the most recent log file with up to 50 entries.

```bash
locus logs
```

Each entry shows timestamp, level (ERR, WRN, INF, VRB, DBG), message, and any additional structured data fields.

### Filter by Level

Show only entries at or below the specified severity. For example, `--level warn` shows only errors and warnings.

```bash
locus logs --level error
locus logs --level warn
locus logs --level debug
```

The level hierarchy from most to least severe: `error` > `warn` > `info` > `verbose` > `debug`.

### Follow Mode

Tail the log file in real time, printing new entries as they appear. Starts by showing the last 10 entries, then follows.

```bash
locus logs --follow
locus logs -f --level error
```

Press Ctrl+C to stop following.

### Limit Lines

Control how many lines to display.

```bash
locus logs --lines 100
locus logs -n 20
```

### Clean Old Logs

Remove all log files except the most recent one, freeing disk space.

```bash
locus logs --clean
```

Reports the number of files removed and disk space freed.

---

## Log File Format

Log files are named `locus-<timestamp>.log` and contain one JSON object per line (NDJSON format):

```json
{"ts":"2026-02-24T10:30:00.000Z","level":"info","msg":"Locus initialized","owner":"myorg","repo":"myapp"}
```

Each entry contains:

| Field | Description |
|-------|-------------|
| `ts` | ISO 8601 timestamp |
| `level` | Log level: `error`, `warn`, `info`, `verbose`, `debug` |
| `msg` | Human-readable message |
| (additional) | Context-specific key-value pairs |

---

## Examples

```bash
# View recent log entries
locus logs

# Show only errors
locus logs --level error

# View last 100 entries
locus logs -n 100

# Follow logs in real time
locus logs -f

# Follow only warnings and errors
locus logs -f --level warn

# Clean up old log files
locus logs --clean
```
