/**
 * Config module for @locusai/locus-linear.
 *
 * Loads the `packages.linear` section from `.locus/config.json`,
 * validates required fields, and provides typed accessors.
 * Also supports saving config updates back to `.locus/config.json`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLocusConfig } from "@locusai/sdk";
import type { LinearConfig, TokenInfo } from "./types.js";

const DEFAULT_LINEAR_CONFIG: LinearConfig = {
  auth: null,
  teamKey: null,
  projectId: null,
  syncInterval: "5m",
  userMapping: {},
  stateMapping: {},
  labelMapping: {},
  importFilter: {
    states: [],
    priorities: [],
  },
};

/**
 * Load the Linear config section from `.locus/config.json`.
 * Returns defaults for any missing fields.
 */
export function loadLinearConfig(cwd?: string): LinearConfig {
  const locusConfig = readLocusConfig(cwd);
  const pkg = locusConfig.packages?.linear as Partial<LinearConfig> | undefined;

  if (!pkg) {
    return { ...DEFAULT_LINEAR_CONFIG };
  }

  return {
    auth: pkg.auth ?? null,
    teamKey: pkg.teamKey ?? null,
    projectId: pkg.projectId ?? null,
    syncInterval: pkg.syncInterval ?? "5m",
    userMapping: pkg.userMapping ?? {},
    stateMapping: pkg.stateMapping ?? {},
    labelMapping: pkg.labelMapping ?? {},
    importFilter: {
      states: pkg.importFilter?.states ?? [],
      priorities: pkg.importFilter?.priorities ?? [],
    },
  };
}

/**
 * Validate that the Linear config has required fields for API operations.
 * Returns an error message if invalid, or null if valid.
 */
export function validateLinearConfig(config: LinearConfig): string | null {
  if (!config.auth) {
    return "Not authenticated. Run: locus pkg linear auth";
  }
  if (!config.auth.accessToken) {
    return "Invalid auth: missing access token. Run: locus pkg linear auth";
  }
  if (!config.teamKey) {
    return "No team configured. Run: locus pkg linear team <KEY>";
  }
  return null;
}

// ─── Raw Project Config I/O ──────────────────────────────────────────────────

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

function writeProjectConfig(
  config: Record<string, unknown>,
  cwd?: string
): void {
  const configPath = join(cwd ?? process.cwd(), ".locus", "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function getLinearSection(
  config: Record<string, unknown>
): Record<string, unknown> {
  if (!config.packages || typeof config.packages !== "object") {
    config.packages = {};
  }
  const packages = config.packages as Record<string, unknown>;
  if (!packages.linear || typeof packages.linear !== "object") {
    packages.linear = {};
  }
  return packages.linear as Record<string, unknown>;
}

// ─── Config Mutation ─────────────────────────────────────────────────────────

/**
 * Save the full Linear config section back to `.locus/config.json`.
 */
export function saveLinearConfig(
  linearConfig: LinearConfig,
  cwd?: string
): void {
  const config = readProjectConfig(cwd);
  if (!config.packages || typeof config.packages !== "object") {
    config.packages = {};
  }
  (config.packages as Record<string, unknown>).linear = linearConfig;
  writeProjectConfig(config, cwd);
}

/**
 * Update only the auth tokens in the Linear config section.
 */
export function saveTokens(tokens: TokenInfo, cwd?: string): void {
  const config = readProjectConfig(cwd);
  const linear = getLinearSection(config);
  linear.auth = tokens;
  writeProjectConfig(config, cwd);
}

/**
 * Clear auth tokens from the Linear config section.
 */
export function clearTokens(cwd?: string): void {
  const config = readProjectConfig(cwd);
  const linear = getLinearSection(config);
  linear.auth = null;
  writeProjectConfig(config, cwd);
}

/**
 * Set the active team key in the Linear config section.
 */
export function setTeamKey(teamKey: string, cwd?: string): void {
  const config = readProjectConfig(cwd);
  const linear = getLinearSection(config);
  linear.teamKey = teamKey;
  writeProjectConfig(config, cwd);
}

/**
 * Read the stored auth tokens from the Linear config section.
 */
export function loadTokens(cwd?: string): TokenInfo | null {
  const config = loadLinearConfig(cwd);
  return config.auth;
}
