import { existsSync } from "node:fs";
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
  "/usr/local/bin",
];

/**
 * Returns nvm/fnm node bin directories if they exist.
 */
function getNodeManagerDirs(): string[] {
  const dirs: string[] = [];

  // nvm
  const nvmDir = process.env.NVM_DIR || join(homedir(), ".nvm");
  const nvmCurrent = join(nvmDir, "current", "bin");
  if (existsSync(nvmCurrent)) {
    dirs.push(nvmCurrent);
  }

  // fnm
  const fnmDir = process.env.FNM_DIR || join(homedir(), ".fnm");
  const fnmCurrent = join(fnmDir, "current", "bin");
  if (existsSync(fnmCurrent)) {
    dirs.push(fnmCurrent);
  }

  return dirs;
}

/**
 * Build a PATH string that includes common CLI binary directories
 * in addition to the current process PATH. Existing entries take priority.
 */
export function getAugmentedPath(): string {
  const currentPath = process.env.PATH || "";
  const currentDirs = new Set(currentPath.split(delimiter));

  const extra = [...EXTRA_BIN_DIRS, ...getNodeManagerDirs()].filter(
    (dir) => !currentDirs.has(dir) && existsSync(dir)
  );

  if (extra.length === 0) return currentPath;
  return currentPath + delimiter + extra.join(delimiter);
}

/**
 * Returns a copy of the current process.env with an augmented PATH.
 * Use this when spawning CLI tools (claude, codex) to ensure they
 * can be found even when running from restricted environments.
 */
export function getAugmentedEnv(
  overrides: Record<string, string> = {}
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides,
    PATH: getAugmentedPath(),
  };
}
