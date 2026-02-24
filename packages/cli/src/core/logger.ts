/**
 * Structured logging — NDJSON file + formatted terminal output.
 * Supports log levels, auto-rotation, and sensitive data filtering.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { bold, cyan, dim, gray, red, yellow } from "../display/terminal.js";
import type { LogEntry, LogLevel } from "../types.js";

// ─── Log Level Hierarchy ─────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  normal: 1,
  verbose: 2,
  debug: 3,
};

// ─── Sensitive Data Patterns ─────────────────────────────────────────────────

const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|token|secret|password|authorization)\s*[=:]\s*\S+/gi,
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
  /gho_[a-zA-Z0-9]{36}/g, // GitHub OAuth tokens
  /sk-[a-zA-Z0-9]{40,}/g, // Anthropic/OpenAI API keys
  /Bearer\s+\S+/gi,
];

function redactSensitive(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

// ─── Logger Class ────────────────────────────────────────────────────────────

export class Logger {
  private level: LogLevel;
  private logDir: string | null;
  private logFile: string | null = null;
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private maxFiles: number;
  private maxTotalSizeMB: number;

  constructor(
    options: {
      level?: LogLevel;
      logDir?: string;
      maxFiles?: number;
      maxTotalSizeMB?: number;
    } = {}
  ) {
    this.level = options.level ?? "normal";
    this.logDir = options.logDir ?? null;
    this.maxFiles = options.maxFiles ?? 20;
    this.maxTotalSizeMB = options.maxTotalSizeMB ?? 50;

    if (this.logDir) {
      this.initLogFile();
      this.startFlushTimer();
    }
  }

  private initLogFile(): void {
    if (!this.logDir) return;

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    this.logFile = join(this.logDir, `locus-${timestamp}.log`);

    // Auto-prune old logs
    this.pruneOldLogs();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), 5000);
    // Allow process to exit without waiting for timer
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /** Flush buffered log entries to file. */
  flush(): void {
    if (!this.logFile || this.buffer.length === 0) return;

    try {
      appendFileSync(this.logFile, this.buffer.join(""));
      this.buffer = [];
    } catch {
      // Silently ignore write errors — logging should never crash the app
    }
  }

  /** Clean up resources. Call on process exit. */
  destroy(): void {
    this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Set the log level. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** Get the current log level. */
  getLevel(): LogLevel {
    return this.level;
  }

  /** Get the current log file path. */
  getLogFile(): string | null {
    return this.logFile;
  }

  // ─── Log Methods ────────────────────────────────────────────────────────

  error(msg: string, data?: Record<string, unknown>): void {
    this.log("normal", msg, data, "error");
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log("normal", msg, data, "warn");
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log("normal", msg, data, "info");
  }

  verbose(msg: string, data?: Record<string, unknown>): void {
    this.log("verbose", msg, data, "verbose");
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log("debug", msg, data, "debug");
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private log(
    minLevel: LogLevel,
    msg: string,
    data: Record<string, unknown> | undefined,
    tag: string
  ): void {
    const numericLevel = LOG_LEVELS[this.level];
    const numericMinLevel = LOG_LEVELS[minLevel];

    if (numericLevel < numericMinLevel) return;

    // Write to file (NDJSON, always redacted)
    this.writeToFile(tag, msg, data);

    // Write to terminal (formatted)
    this.writeToTerminal(tag, msg, data);
  }

  private writeToFile(
    level: string,
    msg: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.logFile) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level: level as LogLevel,
      msg: redactSensitive(msg),
      ...(data ? redactData(data) : {}),
    };

    this.buffer.push(`${JSON.stringify(entry)}\n`);
  }

  private writeToTerminal(
    level: string,
    msg: string,
    _data?: Record<string, unknown>
  ): void {
    const prefix = formatTerminalPrefix(level);
    const formatted = redactSensitive(msg);

    switch (level) {
      case "error":
        process.stderr.write(`${prefix} ${red(formatted)}\n`);
        break;
      case "warn":
        process.stderr.write(`${prefix} ${yellow(formatted)}\n`);
        break;
      case "info":
        process.stderr.write(`${prefix} ${formatted}\n`);
        break;
      case "verbose":
        process.stderr.write(`${prefix} ${dim(formatted)}\n`);
        break;
      case "debug":
        process.stderr.write(`${prefix} ${gray(formatted)}\n`);
        break;
    }
  }

  // ─── Log Pruning ────────────────────────────────────────────────────────

  private pruneOldLogs(): void {
    if (!this.logDir || !existsSync(this.logDir)) return;

    try {
      const logDir = this.logDir;
      const files = readdirSync(logDir)
        .filter((f) => f.startsWith("locus-") && f.endsWith(".log"))
        .map((f) => ({
          name: f,
          path: join(logDir, f),
          stat: statSync(join(logDir, f)),
        }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

      // Prune by count
      while (files.length > this.maxFiles) {
        const oldest = files.pop();
        if (oldest) unlinkSync(oldest.path);
      }

      // Prune by total size
      let totalSize = files.reduce((sum, f) => sum + f.stat.size, 0);
      const maxBytes = this.maxTotalSizeMB * 1024 * 1024;

      while (totalSize > maxBytes && files.length > 1) {
        const oldest = files.pop();
        if (oldest) {
          totalSize -= oldest.stat.size;
          unlinkSync(oldest.path);
        }
      }
    } catch {
      // Silently ignore prune errors
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTerminalPrefix(level: string): string {
  switch (level) {
    case "error":
      return bold(red("✗"));
    case "warn":
      return bold(yellow("⚠"));
    case "info":
      return bold(cyan("●"));
    case "verbose":
      return dim("›");
    case "debug":
      return gray("⋯");
    default:
      return " ";
  }
}

function redactData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let globalLogger: Logger | null = null;

/** Get or create the global logger instance. */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/** Initialize the global logger with options. */
export function initLogger(options: {
  level?: LogLevel;
  logDir?: string;
  maxFiles?: number;
  maxTotalSizeMB?: number;
}): Logger {
  if (globalLogger) {
    globalLogger.destroy();
  }
  globalLogger = new Logger(options);

  // Flush on process exit
  process.on("exit", () => {
    globalLogger?.flush();
  });

  return globalLogger;
}
