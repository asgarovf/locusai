/**
 * `locus logs` — View, tail, and manage execution logs.
 *
 * Usage:
 *   locus logs                  — View most recent log
 *   locus logs --follow         — Tail logs in real-time
 *   locus logs --level error    — Filter by level
 *   locus logs --clean          — Remove old logs
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
  bold,
  cyan,
  dim,
  gray,
  green,
  red,
  yellow,
} from "../display/terminal.js";
import type { LogEntry, LogLevel } from "../types.js";

interface LogsOptions {
  follow?: boolean;
  level?: LogLevel;
  clean?: boolean;
  lines?: number;
}

export async function logsCommand(
  cwd: string,
  options: LogsOptions
): Promise<void> {
  const logsDir = join(cwd, ".locus", "logs");

  if (!existsSync(logsDir)) {
    process.stderr.write(`${dim("No logs found.")}\n`);
    return;
  }

  if (options.clean) {
    return cleanLogs(logsDir);
  }

  const logFiles = getLogFiles(logsDir);

  if (logFiles.length === 0) {
    process.stderr.write(`${dim("No log files found.")}\n`);
    return;
  }

  if (options.follow) {
    return tailLog(logFiles[0], options.level);
  }

  return viewLog(logFiles[0], options.level, options.lines ?? 50);
}

// ─── View ────────────────────────────────────────────────────────────────────

function viewLog(
  logFile: string,
  levelFilter?: LogLevel,
  maxLines?: number
): void {
  const content = readFileSync(logFile, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  process.stderr.write(`\n${bold("Log:")} ${dim(logFile)}\n\n`);

  let count = 0;
  for (const line of lines) {
    if (maxLines && count >= maxLines) break;

    try {
      const entry = JSON.parse(line) as LogEntry;
      if (levelFilter && !shouldShow(entry.level, levelFilter)) continue;
      process.stderr.write(formatEntry(entry));
      count++;
    } catch {
      // Non-JSON line — print as-is
      process.stderr.write(`  ${dim(line)}\n`);
      count++;
    }
  }

  if (lines.length > (maxLines ?? lines.length)) {
    process.stderr.write(
      `\n${dim(`... ${lines.length - (maxLines ?? lines.length)} more lines. Use --lines to see more.`)}\n`
    );
  }
  process.stderr.write("\n");
}

// ─── Tail ────────────────────────────────────────────────────────────────────

async function tailLog(logFile: string, levelFilter?: LogLevel): Promise<void> {
  process.stderr.write(
    `${bold("Tailing:")} ${dim(logFile)} ${dim("(Ctrl+C to stop)")}\n\n`
  );

  let lastSize = existsSync(logFile) ? statSync(logFile).size : 0;

  // Print last 10 lines first
  if (existsSync(logFile)) {
    const content = readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const recent = lines.slice(-10);
    for (const line of recent) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        if (levelFilter && !shouldShow(entry.level, levelFilter)) continue;
        process.stderr.write(formatEntry(entry));
      } catch {
        process.stderr.write(`  ${dim(line)}\n`);
      }
    }
  }

  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (!existsSync(logFile)) return;

      const currentSize = statSync(logFile).size;
      if (currentSize <= lastSize) return;

      // Read only new content
      const content = readFileSync(logFile, "utf-8");
      const allLines = content.trim().split("\n").filter(Boolean);

      // Approximate: count bytes of previous content
      const oldContent = content.slice(0, lastSize);
      const oldLineCount = oldContent.trim().split("\n").filter(Boolean).length;
      const newLines = allLines.slice(oldLineCount);

      for (const line of newLines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (levelFilter && !shouldShow(entry.level, levelFilter)) continue;
          process.stderr.write(formatEntry(entry));
        } catch {
          process.stderr.write(`  ${dim(line)}\n`);
        }
      }

      lastSize = currentSize;
    }, 500);

    process.on("SIGINT", () => {
      clearInterval(interval);
      process.stderr.write("\n");
      resolve();
    });
  });
}

// ─── Clean ───────────────────────────────────────────────────────────────────

function cleanLogs(logsDir: string): void {
  const files = getLogFiles(logsDir);

  if (files.length === 0) {
    process.stderr.write(`${dim("No logs to clean.")}\n`);
    return;
  }

  let _totalSize = 0;
  for (const f of files) {
    _totalSize += statSync(f).size;
  }

  // Keep the most recent log, delete the rest
  const toDelete = files.slice(1);

  if (toDelete.length === 0) {
    process.stderr.write(`${dim("Only one log file — nothing to clean.")}\n`);
    return;
  }

  let freedBytes = 0;
  for (const f of toDelete) {
    freedBytes += statSync(f).size;
    unlinkSync(f);
  }

  const freedMB = (freedBytes / 1024 / 1024).toFixed(1);
  process.stderr.write(
    `${green("✓")} Cleaned ${toDelete.length} log file${toDelete.length === 1 ? "" : "s"} (freed ${freedMB} MB)\n`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLogFiles(logsDir: string): string[] {
  return readdirSync(logsDir)
    .filter((f) => f.startsWith("locus-") && f.endsWith(".log"))
    .map((f) => join(logsDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function formatEntry(entry: LogEntry): string {
  const time = dim(new Date(entry.ts).toLocaleTimeString());
  const level = formatLevel(entry.level);
  const msg = entry.msg;

  // Extract extra data fields (excluding ts, level, msg)
  const extra: string[] = [];
  for (const [key, value] of Object.entries(entry)) {
    if (["ts", "level", "msg"].includes(key)) continue;
    extra.push(
      `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`
    );
  }

  const extraStr = extra.length > 0 ? ` ${dim(extra.join(" "))}` : "";

  return `  ${time} ${level} ${msg}${extraStr}\n`;
}

function formatLevel(level: LogLevel | string): string {
  switch (level) {
    case "error":
      return red(bold("ERR"));
    case "warn":
      return yellow("WRN");
    case "info":
      return cyan("INF");
    case "verbose":
      return dim("VRB");
    case "debug":
      return gray("DBG");
    default:
      return dim(level.toUpperCase().slice(0, 3));
  }
}

const LOG_LEVEL_HIERARCHY: Record<string, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  normal: 3,
  verbose: 4,
  debug: 5,
};

function shouldShow(
  entryLevel: LogLevel | string,
  filterLevel: LogLevel
): boolean {
  const entryNum = LOG_LEVEL_HIERARCHY[entryLevel] ?? 3;
  const filterNum = LOG_LEVEL_HIERARCHY[filterLevel] ?? 3;
  return entryNum <= filterNum;
}
