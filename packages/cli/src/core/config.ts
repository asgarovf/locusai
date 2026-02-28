/**
 * Configuration loading, saving, defaults, and version migration.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LocusConfig } from "../types.js";
import { inferProviderFromModel } from "./ai-models.js";

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: LocusConfig = {
  version: "3.2.0",
  github: {
    owner: "",
    repo: "",
    defaultBranch: "main",
  },
  ai: {
    provider: "claude",
    model: "claude-sonnet-4-6",
  },
  agent: {
    maxParallel: 3,
    autoLabel: true,
    autoPR: true,
    baseBranch: "main",
    rebaseBeforeTask: true,
  },
  sprint: {
    active: null,
    stopOnFailure: true,
  },
  logging: {
    level: "normal",
    maxFiles: 20,
    maxTotalSizeMB: 50,
  },
  sandbox: {
    enabled: true,
    providers: {},
    extraWorkspaces: [],
    readOnlyPaths: [],
  },
};

// ─── Config Operations ───────────────────────────────────────────────────────

/** Get the config file path for a project. */
export function getConfigPath(projectRoot: string): string {
  return join(projectRoot, ".locus", "config.json");
}

/** Load config from disk, applying migrations and defaults for missing fields. */
export function loadConfig(projectRoot: string): LocusConfig {
  const configPath = getConfigPath(projectRoot);

  if (!existsSync(configPath)) {
    throw new Error(
      `No Locus config found at ${configPath}. Run "locus init" first.`
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (e) {
    throw new Error(`Failed to parse config at ${configPath}: ${e}`);
  }

  // Merge with defaults (deep merge for nested objects)
  const config = deepMerge(DEFAULT_CONFIG, raw) as LocusConfig;

  const inferredProvider = inferProviderFromModel(config.ai.model);
  if (inferredProvider) {
    config.ai.provider = inferredProvider;
  }

  // If migration changed the version, save it back
  if (raw.version !== config.version) {
    saveConfig(projectRoot, config);
  }

  return config;
}

/** Save config to disk. */
export function saveConfig(projectRoot: string, config: LocusConfig): void {
  const configPath = getConfigPath(projectRoot);
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

/** Update a specific config value using a dotted path (e.g., "ai.provider"). */
export function updateConfigValue(
  projectRoot: string,
  path: string,
  value: unknown
): LocusConfig {
  const config = loadConfig(projectRoot);
  setNestedValue(config, path, value);

  if (path === "ai.model" && typeof value === "string") {
    const inferredProvider = inferProviderFromModel(value);
    if (inferredProvider) {
      config.ai.provider = inferredProvider;
    }
  }

  saveConfig(projectRoot, config);
  return config;
}

/** Check if a .locus/ directory exists (project is initialized). */
export function isInitialized(projectRoot: string): boolean {
  return existsSync(join(projectRoot, ".locus", "config.json"));
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/** Deep merge source into target, preserving unknown keys from source. */
function deepMerge(target: unknown, source: unknown): unknown {
  if (
    typeof target !== "object" ||
    target === null ||
    typeof source !== "object" ||
    source === null
  ) {
    return source ?? target;
  }

  const result: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };
  const src = source as Record<string, unknown>;

  for (const key of Object.keys(src)) {
    if (
      key in result &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      typeof src[key] === "object" &&
      src[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], src[key]);
    } else if (src[key] !== undefined) {
      result[key] = src[key];
    }
  }

  return result;
}

/** Set a value at a dotted path (e.g., "ai.provider" → config.ai.provider). */
function setNestedValue(obj: unknown, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];

  // Auto-coerce common types
  let coerced: unknown = value;
  if (value === "true") coerced = true;
  else if (value === "false") coerced = false;
  else if (typeof value === "string" && /^\d+$/.test(value))
    coerced = Number.parseInt(value, 10);

  current[lastKey] = coerced;
}

/** Get a value at a dotted path. */
export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current = obj as Record<string, unknown>;

  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = current[key] as Record<string, unknown>;
  }

  return current;
}
