import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOCUS_DIR = ".locus";
const CONFIG_FILE = "config.json";
const SETTINGS_FILE = "settings.json";

export interface LocusProjectConfig {
  $schema?: string;
  version: string;
  createdAt: string;
  projectPath: string;
  workspaceId?: string;
}

export interface LocusSettings {
  $schema?: string;
  apiKey?: string;
  apiUrl?: string;
  provider?: string;
  model?: string;
  workspaceId?: string;
}

/**
 * Check if the project has been initialized with Locus.
 */
export function isLocusInitialized(projectPath: string): boolean {
  const configPath = join(projectPath, LOCUS_DIR, CONFIG_FILE);
  return existsSync(configPath);
}

/**
 * Load the project config from .locus/config.json.
 */
export function loadProjectConfig(
  projectPath: string
): LocusProjectConfig | null {
  const configPath = join(projectPath, LOCUS_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Load settings from .locus/settings.json.
 */
export function loadSettings(projectPath: string): LocusSettings {
  const settingsPath = join(projectPath, LOCUS_DIR, SETTINGS_FILE);
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Check if an API key is configured.
 */
export function hasApiKey(projectPath: string): boolean {
  const settings = loadSettings(projectPath);
  return !!settings.apiKey;
}

/**
 * Get the sessions directory path.
 */
export function getSessionsDir(projectPath: string): string {
  return join(projectPath, LOCUS_DIR, "sessions");
}

/**
 * Get the configured API base URL.
 */
export function getApiBase(projectPath: string): string {
  const settings = loadSettings(projectPath);
  return settings.apiUrl || "https://api.locusai.dev/api";
}

/**
 * Get the configured workspace ID from config.json.
 */
export function getWorkspaceId(projectPath: string): string | undefined {
  const config = loadProjectConfig(projectPath);
  return config?.workspaceId;
}

/**
 * Save workspace ID to .locus/config.json.
 */
export function saveWorkspaceId(
  projectPath: string,
  workspaceId: string
): void {
  const configPath = join(projectPath, LOCUS_DIR, CONFIG_FILE);
  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      config = {};
    }
  }

  config.workspaceId = workspaceId;
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}
