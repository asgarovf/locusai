import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// ============================================================================
// Shell helpers
// ============================================================================

export function runShell(
  cmd: string,
  args: string[]
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
    proc.on("error", (err) =>
      resolve({ exitCode: 1, stdout, stderr: err.message })
    );
  });
}

// ============================================================================
// Binary resolution
// ============================================================================

/** Find the absolute path to the `locus-telegram` binary. */
export async function findTelegramBinary(): Promise<string | null> {
  const result = await runShell("which", ["locus-telegram"]);
  const p = result.stdout.trim();
  return p?.startsWith?.("/") ? p : null;
}

/** Find the directory containing a given binary. */
export async function findBinDir(binary: string): Promise<string | null> {
  const result = await runShell("which", [binary]);
  const p = result.stdout.trim();
  if (p?.startsWith?.("/")) return dirname(p);
  return null;
}

/**
 * Resolve the nvm node bin directory for the active/default version.
 * nvm does NOT create a `current` symlink — it uses versioned directories.
 */
export function resolveNvmBinDir(): string | null {
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
 * Build the PATH string for the service environment.
 * Includes all known binary directories and dynamically detected paths.
 */
export async function buildServicePath(): Promise<string> {
  const home = homedir();
  const dirs = new Set<string>();

  // Standard system dirs
  dirs.add("/usr/local/bin");
  dirs.add("/usr/bin");
  dirs.add("/bin");

  // Common user-installed binary dirs
  const candidates = [
    join(home, ".bun", "bin"),
    join(home, ".local", "bin"),
    join(home, ".npm", "bin"),
    join(home, ".npm-global", "bin"),
    join(home, ".yarn", "bin"),
  ];
  for (const d of candidates) {
    if (existsSync(d)) dirs.add(d);
  }

  // nvm — resolve actual version directory
  const nvmBin = resolveNvmBinDir();
  if (nvmBin) dirs.add(nvmBin);

  // fnm — uses a `current` symlink
  const fnmCurrent = join(home, ".fnm", "current", "bin");
  if (existsSync(fnmCurrent)) dirs.add(fnmCurrent);

  // Detect where `claude` and `codex` are installed
  for (const bin of ["claude", "codex"]) {
    const dir = await findBinDir(bin);
    if (dir) dirs.add(dir);
  }

  return Array.from(dirs).join(":");
}

// ============================================================================
// Service constants
// ============================================================================

export const SERVICE_NAME = "locus";
export const SYSTEMD_UNIT_PATH = `/etc/systemd/system/${SERVICE_NAME}.service`;
export const PLIST_LABEL = "com.locus.agent";

export function getPlistPath(): string {
  return join(homedir(), "Library/LaunchAgents", `${PLIST_LABEL}.plist`);
}

export function getPlatform(): "linux" | "darwin" | null {
  if (process.platform === "linux") return "linux";
  if (process.platform === "darwin") return "darwin";
  return null;
}

// ============================================================================
// Process management
// ============================================================================

/**
 * Force-kill any orphaned locus-telegram processes that survived
 * service unload/stop.
 */
export async function killOrphanedProcesses(): Promise<void> {
  const result = await runShell("pgrep", ["-f", "locus-telegram"]);
  const pids = result.stdout
    .trim()
    .split("\n")
    .filter((p) => p.length > 0);

  if (pids.length === 0) return;

  console.log(
    `  Killing ${pids.length} orphaned locus-telegram process${pids.length > 1 ? "es" : ""}...`
  );
  await runShell("pkill", ["-f", "locus-telegram"]);

  // Give processes a moment to exit, then force-kill any survivors
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const check = await runShell("pgrep", ["-f", "locus-telegram"]);
  if (check.stdout.trim().length > 0) {
    await runShell("pkill", ["-9", "-f", "locus-telegram"]);
  }
}

// ============================================================================
// Service status detection (cross-platform)
// ============================================================================

/** Check if the locus daemon service is currently running. */
export async function isDaemonRunning(): Promise<boolean> {
  const platform = getPlatform();

  if (platform === "linux") {
    const result = await runShell("systemctl", ["is-active", SERVICE_NAME]);
    return result.stdout.trim() === "active";
  }

  if (platform === "darwin") {
    const plistPath = getPlistPath();
    if (!existsSync(plistPath)) return false;

    const result = await runShell("launchctl", ["list"]);
    const match = result.stdout
      .split("\n")
      .find((l) => l.includes(PLIST_LABEL));
    if (!match) return false;

    const pid = match.trim().split(/\s+/)[0];
    return pid !== "-";
  }

  return false;
}

/** Restart the locus daemon service if it's running. */
export async function restartDaemonIfRunning(): Promise<boolean> {
  const platform = getPlatform();
  if (!platform) return false;

  const running = await isDaemonRunning();
  if (!running) return false;

  if (platform === "linux") {
    const result = await runShell("systemctl", ["restart", SERVICE_NAME]);
    return result.exitCode === 0;
  }

  if (platform === "darwin") {
    const plistPath = getPlistPath();
    // Unload + load to restart on macOS
    await runShell("launchctl", ["unload", plistPath]);
    const result = await runShell("launchctl", ["load", plistPath]);
    return result.exitCode === 0;
  }

  return false;
}
