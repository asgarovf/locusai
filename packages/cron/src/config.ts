/**
 * Configuration for the cron worker, read from the Locus config system.
 *
 * Users configure via .locus/config.json under packages.cron:
 * {
 *   "packages": {
 *     "cron": {
 *       "enabled": true,
 *       "crons": [
 *         { "name": "disk-check", "schedule": "1h", "command": "df -h / | tail -1" }
 *       ]
 *     }
 *   }
 * }
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Pm2Config } from "@locusai/locus-pm2";
import { resolvePackageScript } from "@locusai/locus-pm2";
import { readLocusConfig } from "@locusai/sdk";
import type { CronConfig, CronJobConfig } from "./types.js";

export function loadCronConfig(): CronConfig {
  const locusConfig = readLocusConfig();
  const pkg = locusConfig.packages?.cron as CronConfig | undefined;

  if (!pkg) {
    return { enabled: false, crons: [] };
  }

  return {
    enabled: pkg.enabled ?? false,
    crons: Array.isArray(pkg.crons) ? pkg.crons : [],
  };
}

/**
 * Read the raw project config JSON from .locus/config.json.
 */
function readProjectConfig(cwd?: string): Record<string, unknown> {
  const configPath = join(cwd ?? process.cwd(), ".locus", "config.json");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

/**
 * Write the project config JSON back to .locus/config.json.
 */
function writeProjectConfig(
  config: Record<string, unknown>,
  cwd?: string
): void {
  const configPath = join(cwd ?? process.cwd(), ".locus", "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Get the cron config section from the project config, ensuring structure exists.
 */
function getCronSection(
  config: Record<string, unknown>
): CronConfig & { crons: CronJobConfig[] } {
  if (!config.packages || typeof config.packages !== "object") {
    config.packages = {};
  }
  const packages = config.packages as Record<string, unknown>;
  if (!packages.cron || typeof packages.cron !== "object") {
    packages.cron = { enabled: false, crons: [] };
  }
  const cron = packages.cron as Record<string, unknown>;
  if (!Array.isArray(cron.crons)) {
    cron.crons = [];
  }
  return cron as unknown as CronConfig & { crons: CronJobConfig[] };
}

/**
 * Add a cron job to the project config. Returns error message or null on success.
 */
export function addCronJob(job: CronJobConfig): string | null {
  const config = readProjectConfig();
  const cron = getCronSection(config);

  if (cron.crons.some((c) => c.name === job.name)) {
    return `Cron job "${job.name}" already exists. Use a different name or remove it first.`;
  }

  cron.crons.push(job);
  writeProjectConfig(config);
  return null;
}

/**
 * Remove a cron job by name. Returns error message or null on success.
 */
export function removeCronJob(name: string): string | null {
  const config = readProjectConfig();
  const cron = getCronSection(config);

  const idx = cron.crons.findIndex((c) => c.name === name);
  if (idx === -1) {
    return `Cron job "${name}" not found.`;
  }

  cron.crons.splice(idx, 1);
  writeProjectConfig(config);
  return null;
}

/**
 * Set the cron enabled/disabled state.
 */
export function setCronEnabled(enabled: boolean): void {
  const config = readProjectConfig();
  const cron = getCronSection(config);
  cron.enabled = enabled;
  writeProjectConfig(config);
}

export function getCronPm2Config(): Pm2Config {
  return {
    processName: "locus-cron",
    scriptPath: resolvePackageScript(import.meta.url, "locus-cron"),
    scriptArgs: ["worker"],
  };
}
