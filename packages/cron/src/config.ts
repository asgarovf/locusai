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

import type { Pm2Config } from "@locusai/locus-pm2";
import { resolvePackageScript } from "@locusai/locus-pm2";
import { readLocusConfig } from "@locusai/sdk";
import type { CronConfig } from "./types.js";

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

export function getCronPm2Config(): Pm2Config {
  return {
    processName: "locus-cron",
    scriptPath: resolvePackageScript(import.meta.url, "locus-cron"),
    scriptArgs: ["worker"],
  };
}
