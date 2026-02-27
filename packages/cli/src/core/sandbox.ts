/**
 * Docker sandbox availability detection and mode resolution.
 * Detects whether Docker Desktop with sandbox support (4.58+) is available.
 * Result is cached for the lifetime of the process.
 */

import { execFile } from "node:child_process";
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

// ─── Stale Sandbox Cleanup ────────────────────────────────────────────────────

/**
 * Find and remove orphaned `locus-*` Docker sandboxes.
 * Called at startup to clean up sandboxes leaked by previous crashes.
 * Returns the number of sandboxes removed.
 */
export async function cleanupStaleSandboxes(): Promise<number> {
  const log = getLogger();

  try {
    const { stdout } = await execFileAsync("docker", ["sandbox", "ls"], {
      timeout: TIMEOUT_MS,
    });

    // Parse sandbox names from `docker sandbox ls` output.
    // Each line after the header contains a sandbox name as the first column.
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return 0; // Only header or empty

    const staleNames: string[] = [];
    for (const line of lines.slice(1)) {
      const name = line.trim().split(/\s+/)[0];
      if (name?.startsWith("locus-")) {
        staleNames.push(name);
      }
    }

    if (staleNames.length === 0) return 0;

    log.verbose(`Found ${staleNames.length} stale sandbox(es) to clean up`);

    let cleaned = 0;
    for (const name of staleNames) {
      try {
        await execFileAsync("docker", ["sandbox", "rm", name], {
          timeout: 10000,
        });
        log.debug(`Removed stale sandbox: ${name}`);
        cleaned++;
      } catch {
        log.debug(`Failed to remove stale sandbox: ${name}`);
      }
    }

    return cleaned;
  } catch {
    // docker sandbox ls failed — sandbox support not available, nothing to clean
    return 0;
  }
}

function execFileAsync(
  file: string,
  args: string[],
  options: { timeout: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
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
