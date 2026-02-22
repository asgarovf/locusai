import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Resolve the nvm node bin directory for the active/default version.
 * nvm does NOT create a `current` symlink — it uses versioned directories
 * under `~/.nvm/versions/node/<version>/bin/`.
 */
function resolveNvmBinDir(): string | null {
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

  // 1. Match the currently running Node version
  const currentNodeVersion = `v${process.versions.node}`;
  const currentBin = join(versionsDir, currentNodeVersion, "bin");
  if (versions.includes(currentNodeVersion) && existsSync(currentBin)) {
    return currentBin;
  }

  // 2. Read the default alias
  const aliasPath = join(nvmDir, "alias", "default");
  if (existsSync(aliasPath)) {
    try {
      const alias = readFileSync(aliasPath, "utf-8").trim();
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
 * Extra PATH directories to search for binaries like `bun`, `node`, `locus`, `claude`.
 *
 * When the Telegram bot runs as a systemd service (or any non-interactive context),
 * the inherited PATH is minimal and typically misses user-installed tools.
 * We augment PATH with the most common installation locations.
 */
function extraPathDirs(): string[] {
  const home = homedir();
  const dirs = [
    join(home, ".bun", "bin"),
    join(home, ".local", "bin"),
    join(home, ".npm", "bin"),
    join(home, ".npm-global", "bin"),
    "/usr/local/bin",
  ];

  // nvm — resolve actual versioned directory
  const nvmBin = resolveNvmBinDir();
  if (nvmBin) dirs.push(nvmBin);

  // fnm — uses a `current` symlink
  const fnmCurrent = join(home, ".fnm", "current", "bin");
  if (existsSync(fnmCurrent)) dirs.push(fnmCurrent);

  return dirs;
}

/**
 * Build the environment variables for spawned child processes.
 * Prepends common binary directories to PATH so that tools like `bun`
 * are found even when the bot runs outside an interactive shell.
 */
export function buildSpawnEnv(): Record<string, string | undefined> {
  const existing = process.env.PATH ?? "";
  const extras = extraPathDirs().filter((d) => !existing.includes(d));
  const augmentedPath = [...extras, existing].filter(Boolean).join(":");

  return {
    ...process.env,
    PATH: augmentedPath,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };
}
