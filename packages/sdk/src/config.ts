/**
 * Locus config reader for community package authors.
 *
 * Reads `~/.locus/config.json` (global overrides) and
 * `{cwd}/.locus/config.json` (project config), merges them, and returns
 * a single {@link LocusConfig} object. Never throws — missing files are
 * treated as empty and a safe default config is returned instead.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { LocusConfig } from "./types.js";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LocusConfig = {
  version: "3.0.0",
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
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJsonFile(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read and merge the Locus configuration.
 *
 * Looks in two places (in priority order, lowest to highest):
 * 1. `~/.locus/config.json` — global user overrides
 * 2. `{cwd}/.locus/config.json` — project-level config
 *
 * Missing files are silently ignored. If neither file exists the returned
 * object contains only the built-in defaults.
 *
 * @param cwd - Working directory to look for `.locus/config.json`.
 *              Defaults to `process.cwd()`.
 */
export function readLocusConfig(cwd?: string): LocusConfig {
  const workingDir = cwd ?? process.cwd();

  const globalPath = join(homedir(), ".locus", "config.json");
  const projectPath = join(workingDir, ".locus", "config.json");

  const globalRaw = readJsonFile(globalPath) ?? {};
  const projectRaw = readJsonFile(projectPath) ?? {};

  const merged = deepMerge(
    deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, globalRaw),
    projectRaw
  );

  return merged as unknown as LocusConfig;
}
