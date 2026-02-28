/**
 * Helpers for the Locus MCP server.
 *
 * Wraps the `locus` CLI binary so MCP tool calls delegate to the real
 * implementation without duplicating logic.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecResult {
  success: boolean;
  output: string;
  exitCode: number;
}

interface ExecOptions {
  /** Timeout in ms (default: 120_000) */
  timeout?: number;
  /** Data to write to stdin */
  stdin?: string;
}

// ─── CLI Execution ──────────────────────────────────────────────────────────

/**
 * Find the `locus` CLI binary. Checks:
 * 1. Sibling CLI package in monorepo (packages/cli/bin/locus.js)
 * 2. Global `locus` command on PATH
 */
function findLocusBin(): string {
  // Check monorepo sibling first
  const monorepoPath = resolve(import.meta.dirname ?? __dirname, "../../cli/bin/locus.js");
  if (existsSync(monorepoPath)) {
    return monorepoPath;
  }

  // Fall back to global CLI
  return "locus";
}

/**
 * Execute a `locus` CLI command and capture output.
 *
 * Locus writes UI to stderr and data to stdout. We capture both
 * and merge them for the MCP response since the user sees the
 * output as text content.
 */
export async function execLocus(
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { timeout = 120_000, stdin } = options;
  const bin = findLocusBin();
  const root = getProjectRoot();

  // If the binary is a .js file, run it with node/bun
  const isScript = bin.endsWith(".js");
  const command = isScript ? process.execPath : bin;
  const fullArgs = isScript ? [bin, ...args] : args;

  return new Promise((resolve) => {
    const child = execFile(
      command,
      fullArgs,
      {
        cwd: root,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          // Force non-interactive mode
          CI: "true",
          // Disable ANSI colors for clean MCP output
          NO_COLOR: "1",
          FORCE_COLOR: "0",
        },
      },
      (error, stdout, stderr) => {
        const exitCode = error && "code" in error ? (error.code as number) ?? 1 : 0;
        // Combine stderr (UI output) and stdout (data output)
        const output = [stderr, stdout].filter(Boolean).join("\n").trim();
        resolve({
          success: exitCode === 0,
          output: output || (exitCode === 0 ? "Command completed successfully." : `Command failed with exit code ${exitCode}.`),
          exitCode,
        });
      }
    );

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

// ─── Project Root Detection ─────────────────────────────────────────────────

/**
 * Determine the project root directory.
 *
 * Priority:
 * 1. LOCUS_PROJECT_ROOT environment variable
 * 2. Current working directory (typical for MCP stdio servers)
 */
export function getProjectRoot(): string {
  if (process.env.LOCUS_PROJECT_ROOT) {
    return process.env.LOCUS_PROJECT_ROOT;
  }
  return process.cwd();
}

// ─── File Reading ───────────────────────────────────────────────────────────

/**
 * Read a file relative to the project root, returning null if not found.
 */
export function readProjectFile(root: string, relativePath: string): string | null {
  const fullPath = join(root, relativePath);
  try {
    if (!existsSync(fullPath)) return null;
    return readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}
