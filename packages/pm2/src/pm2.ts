/**
 * PM2 programmatic wrapper for managing Locus package processes.
 *
 * Parameterized by Pm2Config so any platform package (telegram, slack, etc.)
 * can use the same PM2 lifecycle management.
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Pm2Config {
  /** PM2 process name (e.g. "locus-telegram"). */
  processName: string;
  /** Absolute path to the script to run, or an import.meta.url to resolve from. */
  scriptPath: string;
  /** Extra arguments passed after `--` to the script (e.g. ["bot"]). */
  scriptArgs?: string[];
}

export interface Pm2Status {
  name: string;
  status: string;
  pid: number | null;
  uptime: number | null;
  memory: number | null;
  restarts: number;
}

// ─── PM2 Binary Discovery ───────────────────────────────────────────────────

function getPm2Bin(): string {
  // Try to find pm2 on PATH (local node_modules/.bin or global)
  try {
    const result = execSync("which pm2", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (result) return result;
  } catch {
    // fall through
  }

  // Try npx as fallback
  return "npx pm2";
}

function pm2Exec(args: string): string {
  const pm2 = getPm2Bin();
  try {
    return execSync(`${pm2} ${args}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(err.stderr?.trim() || err.message || "PM2 command failed");
  }
}

// ─── PM2 Operations ─────────────────────────────────────────────────────────

export function pm2Start(config: Pm2Config): string {
  const { processName, scriptPath, scriptArgs = [] } = config;
  const pm2 = getPm2Bin();

  try {
    // Check if already running
    const list = pm2Exec("jlist");
    const processes = JSON.parse(list) as Array<{ name: string }>;
    const existing = processes.find((p) => p.name === processName);
    if (existing) {
      pm2Exec(`restart ${processName}`);
      return `Restarted ${processName}`;
    }
  } catch {
    // Not running, start fresh
  }

  const argsStr = scriptArgs.length > 0 ? ` -- ${scriptArgs.join(" ")}` : "";
  execSync(
    `${pm2} start ${JSON.stringify(scriptPath)} --name ${processName}${argsStr}`,
    {
      encoding: "utf-8",
      stdio: "inherit",
      env: process.env,
    }
  );

  return `Started ${processName}`;
}

export function pm2Stop(config: Pm2Config): string {
  pm2Exec(`stop ${config.processName}`);
  return `Stopped ${config.processName}`;
}

export function pm2Restart(config: Pm2Config): string {
  pm2Exec(`restart ${config.processName}`);
  return `Restarted ${config.processName}`;
}

export function pm2Delete(config: Pm2Config): string {
  pm2Exec(`delete ${config.processName}`);
  return `Deleted ${config.processName}`;
}

export function pm2Status(config: Pm2Config): Pm2Status | null {
  try {
    const list = pm2Exec("jlist");
    const processes = JSON.parse(list) as Array<{
      name: string;
      pm2_env?: {
        status?: string;
        pm_uptime?: number;
        restart_time?: number;
      };
      pid?: number;
      monit?: { memory?: number };
    }>;

    const proc = processes.find((p) => p.name === config.processName);
    if (!proc) return null;

    return {
      name: config.processName,
      status: proc.pm2_env?.status ?? "unknown",
      pid: proc.pid ?? null,
      uptime: proc.pm2_env?.pm_uptime ?? null,
      memory: proc.monit?.memory ?? null,
      restarts: proc.pm2_env?.restart_time ?? 0,
    };
  } catch {
    return null;
  }
}

export function pm2Logs(config: Pm2Config, lines = 50): string {
  try {
    return pm2Exec(`logs ${config.processName} --nostream --lines ${lines}`);
  } catch {
    return "No logs available.";
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Resolve the script path for a Locus package binary.
 *
 * Given an `import.meta.url` from the calling package, resolves to
 * `<packageRoot>/bin/<binName>.js`.
 */
export function resolvePackageScript(
  importMetaUrl: string,
  binName: string
): string {
  const currentFile = fileURLToPath(importMetaUrl);
  const packageRoot = dirname(dirname(currentFile));
  return join(packageRoot, "bin", `${binName}.js`);
}
