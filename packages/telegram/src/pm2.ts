/**
 * PM2 programmatic wrapper for managing the Telegram bot process.
 *
 * Uses pm2 package API to start/stop/restart/status/logs the bot.
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROCESS_NAME = "locus-telegram";

function getPm2Bin(): string {
  // Try local node_modules first, then global
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

function getBotScriptPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = dirname(dirname(currentFile));
  return join(packageRoot, "bin", "locus-telegram.js");
}

export function pm2Start(): string {
  const script = getBotScriptPath();
  const pm2 = getPm2Bin();

  try {
    // Check if already running
    const list = pm2Exec("jlist");
    const processes = JSON.parse(list) as Array<{ name: string }>;
    const existing = processes.find((p) => p.name === PROCESS_NAME);
    if (existing) {
      pm2Exec(`restart ${PROCESS_NAME}`);
      return `Restarted ${PROCESS_NAME}`;
    }
  } catch {
    // Not running, start fresh
  }

  execSync(
    `${pm2} start ${JSON.stringify(script)} --name ${PROCESS_NAME} -- bot`,
    {
      encoding: "utf-8",
      stdio: "inherit",
      env: process.env,
    }
  );

  return `Started ${PROCESS_NAME}`;
}

export function pm2Stop(): string {
  pm2Exec(`stop ${PROCESS_NAME}`);
  return `Stopped ${PROCESS_NAME}`;
}

export function pm2Restart(): string {
  pm2Exec(`restart ${PROCESS_NAME}`);
  return `Restarted ${PROCESS_NAME}`;
}

export function pm2Delete(): string {
  pm2Exec(`delete ${PROCESS_NAME}`);
  return `Deleted ${PROCESS_NAME}`;
}

export interface Pm2Status {
  name: string;
  status: string;
  pid: number | null;
  uptime: number | null;
  memory: number | null;
  restarts: number;
}

export function pm2Status(): Pm2Status | null {
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

    const proc = processes.find((p) => p.name === PROCESS_NAME);
    if (!proc) return null;

    return {
      name: PROCESS_NAME,
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

export function pm2Logs(lines = 50): string {
  try {
    return pm2Exec(`logs ${PROCESS_NAME} --nostream --lines ${lines}`);
  } catch {
    return "No logs available.";
  }
}
