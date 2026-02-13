import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

/**
 * Common directories where CLI tools get installed on Linux/macOS
 * but may not be in PATH when running from services, cron, or desktop launchers.
 */
const EXTRA_BIN_DIRS = [
  join(homedir(), ".local", "bin"),
  join(homedir(), ".npm", "bin"),
  join(homedir(), ".npm-global", "bin"),
  join(homedir(), ".yarn", "bin"),
  join(homedir(), ".bun", "bin"),
  join(homedir(), "Library", "pnpm"),
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
];

/**
 * Resolve the active nvm node bin directory.
 *
 * nvm does NOT create a `~/.nvm/current` symlink. Instead it uses
 * `~/.nvm/versions/node/<version>/bin/` and sets PATH in the shell.
 * When processes run outside of a shell (e.g. spawned by services,
 * cron, or desktop apps), that shell init never runs, so we need
 * to find the right version ourselves.
 *
 * Strategy:
 * 1. Match the current Node version to a versioned dir.
 * 2. Read ~/.nvm/alias/default to find the default version prefix.
 * 3. Fall back to the highest installed version.
 */
function getNvmNodeBinDir(): string | null {
  const nvmDir = process.env.NVM_DIR || join(homedir(), ".nvm");
  const versionsDir = join(nvmDir, "versions", "node");

  if (!existsSync(versionsDir)) return null;

  let versions: string[];
  try {
    versions = readdirSync(versionsDir).filter((d) => d.startsWith("v"));
  } catch {
    return null;
  }

  if (versions.length === 0) return null;

  // 1. Try to match the currently running Node version
  const currentNodeVersion = `v${process.versions.node}`;
  const currentBin = join(versionsDir, currentNodeVersion, "bin");
  if (versions.includes(currentNodeVersion) && existsSync(currentBin)) {
    return currentBin;
  }

  // 2. Try to read the default alias
  const aliasPath = join(nvmDir, "alias", "default");
  if (existsSync(aliasPath)) {
    try {
      const alias = readFileSync(aliasPath, "utf-8").trim();
      // alias can be a full version like "22.13.1" or a prefix like "22"
      const match = versions.find(
        (v) => v === `v${alias}` || v.startsWith(`v${alias}.`)
      );
      if (match) {
        const bin = join(versionsDir, match, "bin");
        if (existsSync(bin)) return bin;
      }
    } catch {
      // Ignore read errors
    }
  }

  // 3. Fall back to the highest semver version
  const sorted = versions.sort((a, b) => {
    const pa = a.slice(1).split(".").map(Number);
    const pb = b.slice(1).split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    }
    return 0;
  });

  const bin = join(versionsDir, sorted[0], "bin");
  return existsSync(bin) ? bin : null;
}

/**
 * Returns fnm node bin directories if they exist.
 */
function getFnmNodeBinDir(): string | null {
  const fnmDir = process.env.FNM_DIR || join(homedir(), ".fnm");

  // fnm uses a "current" symlink
  const currentBin = join(fnmDir, "current", "bin");
  if (existsSync(currentBin)) return currentBin;

  // Also check fnm's aliases directory
  const aliasDir = join(fnmDir, "aliases", "default");
  if (existsSync(aliasDir)) {
    const bin = join(aliasDir, "bin");
    if (existsSync(bin)) return bin;
  }

  return null;
}

/**
 * Build a PATH string that includes common CLI binary directories
 * in addition to the current process PATH. Existing entries take priority.
 */
export function getAugmentedPath(): string {
  const currentPath = process.env.PATH || "";
  const currentDirs = new Set(currentPath.split(delimiter));

  const extra: string[] = [];

  // Add static extra dirs
  for (const dir of EXTRA_BIN_DIRS) {
    if (!currentDirs.has(dir) && existsSync(dir)) {
      extra.push(dir);
    }
  }

  // Add nvm node bin
  const nvmBin = getNvmNodeBinDir();
  if (nvmBin && !currentDirs.has(nvmBin)) {
    extra.push(nvmBin);
  }

  // Add fnm node bin
  const fnmBin = getFnmNodeBinDir();
  if (fnmBin && !currentDirs.has(fnmBin)) {
    extra.push(fnmBin);
  }

  if (extra.length === 0) return currentPath;
  return currentPath + delimiter + extra.join(delimiter);
}

/**
 * Environment variables that must be removed when spawning CLI tools
 * to prevent issues like nested session detection or invalid API key
 * errors from externally set credentials.
 */
const ENV_VARS_TO_STRIP = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"];

/**
 * Returns a copy of the current process.env with an augmented PATH.
 * Use this when spawning CLI tools (claude, codex) to ensure they
 * can be found even when running from restricted environments.
 *
 * Strips environment variables that interfere with spawned CLI
 * processes (e.g. CLAUDECODE which triggers nested-session guards).
 */
export function getAugmentedEnv(
  overrides: Record<string, string> = {}
): NodeJS.ProcessEnv {
  const env = {
    ...process.env,
    ...overrides,
    PATH: getAugmentedPath(),
  };

  for (const key of ENV_VARS_TO_STRIP) {
    delete (env as Record<string, string>)[key];
  }

  return env;
}
