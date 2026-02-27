/**
 * Sandbox-ignore enforcement.
 *
 * Parses `.sandboxignore` patterns (gitignore-like syntax) and removes
 * matching files/directories inside a Docker sandbox via `docker sandbox exec`.
 *
 * Best-effort — never throws. No-ops when `.sandboxignore` is missing.
 */

import { exec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
