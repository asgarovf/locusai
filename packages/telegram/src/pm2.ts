/**
 * Telegram-specific PM2 configuration and re-exports.
 *
 * Delegates to @locusai/locus-pm2 with telegram-specific process name and script.
 */

import type { Pm2Config } from "@locusai/locus-pm2";
import {
  pm2Delete as _pm2Delete,
  pm2Logs as _pm2Logs,
  pm2Restart as _pm2Restart,
  pm2Start as _pm2Start,
  pm2Status as _pm2Status,
  pm2Stop as _pm2Stop,
  resolvePackageScript,
} from "@locusai/locus-pm2";

export type { Pm2Status } from "@locusai/locus-pm2";

function getConfig(): Pm2Config {
  return {
    processName: "locus-telegram",
    scriptPath: resolvePackageScript(import.meta.url, "locus-telegram"),
    scriptArgs: ["bot"],
  };
}

export function pm2Start(): string {
  return _pm2Start(getConfig());
}

export function pm2Stop(): string {
  return _pm2Stop(getConfig());
}

export function pm2Restart(): string {
  return _pm2Restart(getConfig());
}

export function pm2Delete(): string {
  return _pm2Delete(getConfig());
}

export function pm2Status() {
  return _pm2Status(getConfig());
}

export function pm2Logs(lines = 50): string {
  return _pm2Logs(getConfig(), lines);
}
