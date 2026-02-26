/**
 * Config management for locus-telegram.
 *
 * Token and settings are persisted in:
 *   ~/.locus/packages/locus-telegram/config.json
 *
 * The daemon PID is tracked in:
 *   ~/.locus/packages/locus-telegram/daemon.pid
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelegramConfig {
  /** Telegram Bot API token (from BotFather). */
  token?: string;
  /**
   * Optional list of chat IDs allowed to control the agent.
   * When empty, all chats are accepted (not recommended for production).
   */
  allowedChatIds?: number[];
}

// ─── Paths ────────────────────────────────────────────────────────────────────

function getStateDir(): string {
  const dir = join(homedir(), ".locus", "packages", "locus-telegram");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConfigPath(): string {
  return join(getStateDir(), "config.json");
}

export function getPidPath(): string {
  return join(getStateDir(), "daemon.pid");
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

export function readConfig(): TelegramConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as TelegramConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: TelegramConfig): void {
  writeFileSync(
    getConfigPath(),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf-8"
  );
}

export function setToken(token: string): void {
  const config = readConfig();
  config.token = token;
  writeConfig(config);
}
