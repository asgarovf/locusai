/**
 * Sandbox-ignore enforcement.
 *
 * Parses `.sandboxignore` patterns (gitignore-like syntax) and removes
 * matching files/directories inside a Docker sandbox via `docker sandbox exec`.
 *
 * Includes backup/restore to prevent bidirectional sync from deleting host files.
 *
 * Best-effort — never throws. No-ops when `.sandboxignore` is missing.
 */

import { exec } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import { getLogger } from "./logger.js";

const execAsync = promisify(exec);

interface IgnoreRule {
  pattern: string;
  negated: boolean;
  isDirectory: boolean;
}

/**
 * Parse a `.sandboxignore` file into structured rules.
 * Follows .gitignore syntax: one pattern per line, `#` for comments,
 * `!` prefix for negation, trailing `/` for directories.
 */
function parseIgnoreFile(filePath: string): IgnoreRule[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const rules: IgnoreRule[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const negated = line.startsWith("!");
    const raw = negated ? line.slice(1) : line;
    const isDirectory = raw.endsWith("/");
    const pattern = isDirectory ? raw.slice(0, -1) : raw;

    rules.push({ pattern, negated, isDirectory });
  }

  return rules;
}

/**
 * Shell-escape a string for use inside single quotes.
 * Replaces `'` with `'\''` (end quote, escaped quote, start quote).
 */
function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/**
 * Build a shell script that removes files/dirs matching .sandboxignore patterns.
 * Uses `find` with `-name` patterns and `-delete` / `rm -rf`.
 * Returns null if there are no actionable patterns.
 */
function buildCleanupScript(
  rules: IgnoreRule[],
  workspacePath: string
): string | null {
  const positive = rules.filter((r) => !r.negated);
  const negated = rules.filter((r) => r.negated);

  if (positive.length === 0) return null;

  // Build negation exclusions — applied to all find commands
  const exclusions = negated
    .map((r) => `! -name '${shellEscape(r.pattern)}'`)
    .join(" ");

  const commands: string[] = [];

  for (const rule of positive) {
    const parts = ["find", `'${shellEscape(workspacePath)}'`];

    if (rule.isDirectory) {
      parts.push("-type d");
    }

    parts.push(`-name '${shellEscape(rule.pattern)}'`);

    if (exclusions) {
      parts.push(exclusions);
    }

    if (rule.isDirectory) {
      parts.push("-exec rm -rf {} +");
    } else {
      parts.push("-delete");
    }

    commands.push(parts.join(" "));
  }

  // Use ; so one failed find doesn't abort the rest.
  // Redirect stderr to suppress "No such file or directory" noise.
  return `${commands.join(" 2>/dev/null ; ")} 2>/dev/null`;
}

// ─── Pattern matching helpers ────────────────────────────────────────────────

/** Convert a simple gitignore name pattern to a RegExp. Supports `*` and `?`. */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

/** Directories to skip when walking the project tree for backups. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".locus",
  "dist",
  "build",
  ".next",
  ".cache",
]);

/**
 * Walk the project tree and collect host paths matching .sandboxignore rules.
 * Returns absolute paths of files and directories to back up.
 */
function findIgnoredPaths(projectRoot: string, rules: IgnoreRule[]): string[] {
  const positive = rules.filter((r) => !r.negated);
  const negated = rules.filter((r) => r.negated);
  if (positive.length === 0) return [];

  const positiveMatchers = positive.map((r) => ({
    regex: patternToRegex(r.pattern),
    isDirectory: r.isDirectory,
  }));
  const negatedRegexes = negated.map((r) => patternToRegex(r.pattern));

  const matches: string[] = [];

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;

      const fullPath = join(dir, name);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      const isDir = stat.isDirectory();

      // Check positive match
      let matched = false;
      for (const m of positiveMatchers) {
        if (m.isDirectory && !isDir) continue;
        if (m.regex.test(name)) {
          matched = true;
          break;
        }
      }

      if (matched) {
        // Check negation — if negated, skip this match
        const isNegated = negatedRegexes.some((nr) => nr.test(name));
        if (!isNegated) {
          matches.push(fullPath);
          continue; // don't recurse into matched dirs — back up the whole thing
        }
      }

      if (isDir) {
        walk(fullPath);
      }
    }
  }

  walk(projectRoot);
  return matches;
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

export interface SandboxIgnoreBackup {
  /** Restore all backed-up files to their original host locations. */
  restore(): void;
}

/** No-op backup returned when there's nothing to back up. */
const NOOP_BACKUP: SandboxIgnoreBackup = { restore() {} };

/**
 * Back up host files that match `.sandboxignore` patterns to a temp directory.
 *
 * Returns a backup handle whose `restore()` method copies everything back.
 * Call `restore()` in a finally block to guarantee host files survive
 * the bidirectional Docker sandbox sync.
 *
 * Best-effort — never throws. Logs failures and returns a no-op backup.
 */
export function backupIgnoredFiles(projectRoot: string): SandboxIgnoreBackup {
  const log = getLogger();
  const ignorePath = join(projectRoot, ".sandboxignore");
  const rules = parseIgnoreFile(ignorePath);
  if (rules.length === 0) return NOOP_BACKUP;

  const paths = findIgnoredPaths(projectRoot, rules);
  if (paths.length === 0) return NOOP_BACKUP;

  let backupDir: string;
  try {
    backupDir = mkdtempSync(join(tmpdir(), "locus-sandbox-backup-"));
  } catch (err) {
    log.debug("Failed to create sandbox backup dir", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NOOP_BACKUP;
  }

  const backed: Array<{ src: string; dest: string }> = [];

  for (const src of paths) {
    const rel = relative(projectRoot, src);
    const dest = join(backupDir, rel);
    try {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest, { recursive: true, preserveTimestamps: true });
      backed.push({ src, dest });
    } catch (err) {
      log.debug("Failed to back up ignored file", {
        src,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (backed.length === 0) {
    rmSync(backupDir, { recursive: true, force: true });
    return NOOP_BACKUP;
  }

  log.debug("Backed up sandbox-ignored files", {
    count: backed.length,
    backupDir,
  });

  return {
    restore() {
      for (const { src, dest } of backed) {
        try {
          mkdirSync(dirname(src), { recursive: true });
          cpSync(dest, src, { recursive: true, preserveTimestamps: true });
        } catch (err) {
          // Critical — log as warning-level since this means potential data loss
          log.debug("Failed to restore ignored file (potential data loss)", {
            src,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      // Cleanup temp dir
      try {
        rmSync(backupDir, { recursive: true, force: true });
      } catch {
        // Non-critical — OS will clean up tmp eventually
      }
      log.debug("Restored sandbox-ignored files", { count: backed.length });
    },
  };
}

/**
 * Enforce `.sandboxignore` rules inside a Docker sandbox.
 *
 * Reads the ignore file from the host, translates patterns into
 * `find` + `rm` commands, and executes them inside the sandbox.
 *
 * Best-effort: never throws. Logs failures and moves on.
 * No-ops when `.sandboxignore` is missing or has no actionable rules.
 */
export async function enforceSandboxIgnore(
  sandboxName: string,
  projectRoot: string
): Promise<void> {
  const log = getLogger();
  const ignorePath = join(projectRoot, ".sandboxignore");

  const rules = parseIgnoreFile(ignorePath);
  if (rules.length === 0) return;

  const script = buildCleanupScript(rules, projectRoot);
  if (!script) return;

  log.debug("Enforcing .sandboxignore", {
    sandboxName,
    ruleCount: rules.length,
  });

  try {
    await execAsync(
      `docker sandbox exec ${sandboxName} sh -c ${JSON.stringify(script)}`,
      { timeout: 15000 }
    );
    log.debug("sandbox-ignore enforcement complete", { sandboxName });
  } catch (err) {
    // Best-effort — log and move on
    log.debug("sandbox-ignore enforcement failed (non-fatal)", {
      sandboxName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
