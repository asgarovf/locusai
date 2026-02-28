/**
 * Docker sandbox availability detection and mode resolution.
 * Detects whether Docker Desktop with sandbox support (4.58+) is available.
 * Result is cached for the lifetime of the process.
 */

import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { bold, dim, red, yellow } from "../display/terminal.js";
import type { SandboxConfig } from "../types.js";
import { getLogger } from "./logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SandboxStatus {
  available: boolean;
  reason?: string;
}

export type SandboxMode = "auto" | "disabled" | "required";

// ─── Detection ───────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000;

let cachedStatus: SandboxStatus | null = null;

/**
 * Detect whether Docker Desktop with sandbox support is available.
 * Runs `docker sandbox ls` with a 5-second timeout.
 * Result is cached after the first call — no repeated subprocess spawns.
 */
export async function detectSandboxSupport(): Promise<SandboxStatus> {
  if (cachedStatus) return cachedStatus;

  const log = getLogger();
  log.debug("Detecting Docker sandbox support...");

  const status = await runDetection();
  cachedStatus = status;

  if (status.available) {
    log.verbose("Docker sandbox support detected");
  } else {
    log.verbose(`Docker sandbox not available: ${status.reason}`);
  }

  return status;
}

function runDetection(): Promise<SandboxStatus> {
  return new Promise((resolve) => {
    let settled = false;

    const child = execFile(
      "docker",
      ["sandbox", "ls"],
      { timeout: TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (settled) return;
        settled = true;

        if (!error) {
          resolve({ available: true });
          return;
        }

        const code = (error as NodeJS.ErrnoException).code;

        // docker binary not found
        if (code === "ENOENT") {
          resolve({ available: false, reason: "Docker is not installed" });
          return;
        }

        // Timeout (Node sets .killed when it kills the process)
        if (error.killed) {
          resolve({ available: false, reason: "Docker is not responding" });
          return;
        }

        // sandbox subcommand not recognized — check stderr for common indicators
        const stderrStr = (stderr ?? "").toLowerCase();
        if (
          stderrStr.includes("unknown") ||
          stderrStr.includes("not a docker command") ||
          stderrStr.includes("is not a docker command")
        ) {
          resolve({
            available: false,
            reason: "Docker Desktop 4.58+ with sandbox support required",
          });
          return;
        }

        // Any other failure — treat as sandbox subcommand not available
        resolve({
          available: false,
          reason: "Docker Desktop 4.58+ with sandbox support required",
        });
      }
    );

    // Safety: if spawn itself fails synchronously, child may be null
    child.on?.("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;

      if (err.code === "ENOENT") {
        resolve({ available: false, reason: "Docker is not installed" });
      } else {
        resolve({
          available: false,
          reason: "Docker Desktop 4.58+ with sandbox support required",
        });
      }
    });
  });
}

// ─── Mode Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the final sandbox mode from config and CLI flags.
 * CLI flags override config values.
 *
 * Priority: --no-sandbox > --sandbox=require > config.sandbox.enabled
 *
 * Throws if --sandbox has an invalid value.
 */
export function resolveSandboxMode(
  config: SandboxConfig,
  flags: { sandbox?: string; noSandbox?: boolean }
): SandboxMode {
  // CLI flags take precedence
  if (flags.noSandbox) {
    return "disabled";
  }

  if (flags.sandbox !== undefined) {
    if (flags.sandbox === "require") {
      return "required";
    }
    throw new Error(
      `Invalid --sandbox value: "${flags.sandbox}". Valid values: require`
    );
  }

  // Fall back to config
  if (!config.enabled) {
    return "disabled";
  }

  return "auto";
}

// ─── Safety Warning ──────────────────────────────────────────────────────────

/**
 * Display a sandbox safety warning based on the resolved mode and detection status.
 *
 * - **disabled** (explicit `--no-sandbox`): Interactive confirmation — waits for
 *   Enter before proceeding. Skipped when stdin is not a TTY (CI/piped input).
 * - **auto** with Docker unavailable: Non-blocking warning — prints and continues.
 * - **required** with Docker unavailable: Fatal error — exits with code 1.
 *
 * Returns `true` if execution should use sandbox, `false` otherwise.
 */
export async function displaySandboxWarning(
  mode: SandboxMode,
  status: SandboxStatus
): Promise<boolean> {
  // Case 3: Required mode, Docker unavailable
  if (mode === "required" && !status.available) {
    process.stderr.write(
      `\n${red("✖")}  Docker sandbox required but not available: ${bold(status.reason ?? "Docker Desktop 4.58+ with sandbox support required")}\n`
    );
    process.stderr.write(
      `   Install Docker Desktop 4.58+ or remove --sandbox=require to continue.\n\n`
    );
    process.exit(1);
  }

  // Case 1: Explicit opt-out (--no-sandbox)
  if (mode === "disabled") {
    process.stderr.write(
      `\n${yellow("⚠")}  ${bold("WARNING:")} Running without sandbox. The AI agent will have unrestricted\n`
    );
    process.stderr.write(
      `   access to your filesystem, network, and environment variables.\n`
    );

    // Interactive confirmation — skip in non-interactive environments
    if (process.stdin.isTTY) {
      process.stderr.write(
        `   Press ${bold("Enter")} to continue or ${bold("Ctrl+C")} to abort.\n`
      );
      await waitForEnter();
    }

    process.stderr.write("\n");
    return false;
  }

  // Case 2: Auto mode, Docker unavailable
  if (mode === "auto" && !status.available) {
    process.stderr.write(
      `\n${yellow("⚠")}  Docker sandbox not available. Install Docker Desktop 4.58+ for secure execution.\n`
    );
    process.stderr.write(
      `   Running without sandbox. Use ${dim("--no-sandbox")} to suppress this warning.\n\n`
    );
    return false;
  }

  // Docker available — sandbox will be used
  return true;
}

/** Wait for the user to press Enter. Resolves immediately if stdin is not a TTY. */
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    rl.once("line", () => {
      rl.close();
      resolve();
    });

    // Also resolve on close (e.g. Ctrl+C sends SIGINT which closes readline)
    rl.once("close", () => {
      resolve();
    });
  });
}
