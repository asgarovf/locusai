/**
 * Docker sandbox availability detection and mode resolution.
 * Detects whether Docker Desktop with sandbox support (4.58+) is available.
 * Result is cached for the lifetime of the process.
 */

import { execFile, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { bold, dim, red, yellow } from "../display/terminal.js";
import type { AIProvider, SandboxConfig } from "../types.js";
import { inferProviderFromModel } from "./ai-models.js";
import { getLogger } from "./logger.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Container-local directory for sandbox dependencies.
 * Installed on the container's native filesystem (not the bind mount) to avoid
 * cross-platform binary conflicts between the host (macOS) and sandbox (Linux).
 * Platform-specific native binaries (biome, esbuild, swc, etc.) are installed
 * here so both host and sandbox have correct binaries without interference.
 */
export const SANDBOX_DEPS_DIR = "/tmp/sandbox-deps";

/**
 * Native binary overrides for tools whose Node.js wrappers use
 * require.resolve() to locate platform-specific binaries.
 *
 * When the host (macOS) bind-mounts node_modules into the Linux sandbox,
 * require.resolve() finds the macOS binary from the .bun/ cache → SIGILL.
 * These env vars tell each wrapper to use the Linux binary from sandbox-deps.
 *
 * Each entry: [envVar, [...candidatePaths relative to SANDBOX_DEPS_DIR]]
 */
export const SANDBOX_BINARY_OVERRIDES: [string, string[]][] = [
  [
    "BIOME_BINARY",
    [
      "node_modules/@biomejs/cli-linux-arm64/biome",
      "node_modules/@biomejs/cli-linux-x64/biome",
    ],
  ],
  [
    "ESBUILD_BINARY_PATH",
    [
      "node_modules/@esbuild/linux-arm64/bin/esbuild",
      "node_modules/@esbuild/linux-x64/bin/esbuild",
    ],
  ],
  [
    "TURBO_BINARY_PATH",
    [
      "node_modules/turbo-linux-arm64/bin/turbo",
      "node_modules/turbo-linux-64/bin/turbo",
    ],
  ],
];

/**
 * Generate shell snippet that probes and exports all binary overrides.
 * For each entry, tries candidates in order and exports the first executable found.
 */
export function buildBinaryOverrideSnippet(): string {
  return SANDBOX_BINARY_OVERRIDES.map(([envVar, candidates]) => {
    const paths = candidates.map((p) => `"${SANDBOX_DEPS_DIR}/${p}"`).join(" ");
    return `for _b in ${paths}; do [ -x "$_b" ] && ${envVar}="$_b" && export ${envVar} && break; done;`;
  }).join(" ");
}

/**
 * Build a shell wrapper that sets up PATH and NODE_PATH for sandbox deps,
 * then exec's the original command. Used with:
 *   sh -c '<wrapper>' _ <command> <args...>
 */
export function buildSandboxEnvWrapper(workdir: string): string {
  return (
    'PATH="' +
    SANDBOX_DEPS_DIR +
    "/node_modules/.bin:" +
    workdir +
    '/node_modules/.bin:$PATH"; export PATH; ' +
    'NODE_PATH="' +
    SANDBOX_DEPS_DIR +
    // biome-ignore lint/suspicious/noTemplateCurlyInString: We need a right formatting here
    '/node_modules${NODE_PATH:+:$NODE_PATH}"; export NODE_PATH; ' +
    // Probe and export all native binary overrides (biome, esbuild, turbo)
    buildBinaryOverrideSnippet() +
    " " +
    'exec "$@"'
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SandboxStatus {
  available: boolean;
  reason?: string;
}

export type SandboxMode = "auto" | "disabled" | "required";

export function getProviderSandboxName(
  config: SandboxConfig,
  provider: AIProvider
): string | undefined {
  return config.providers[provider];
}

export function getModelSandboxName(
  config: SandboxConfig,
  model: string,
  fallbackProvider: AIProvider
): string | undefined {
  const provider = inferProviderFromModel(model) ?? fallbackProvider;
  return getProviderSandboxName(config, provider);
}

// ─── Provider Mismatch Check ─────────────────────────────────────────────────

/**
 * Check whether sandbox mode is enabled but the target provider has no sandbox
 * configured. Returns a user-facing warning message if there's a mismatch,
 * or `null` if everything is fine.
 */
export function checkProviderSandboxMismatch(
  config: SandboxConfig,
  model: string,
  fallbackProvider: AIProvider
): string | null {
  if (!config.enabled) return null;

  const targetProvider = inferProviderFromModel(model) ?? fallbackProvider;
  const sandboxName = getProviderSandboxName(config, targetProvider);

  // Sandbox exists for this provider — all good
  if (sandboxName) return null;

  // Find which providers ARE configured
  const configured = (["claude", "codex"] as AIProvider[]).filter(
    (p) => config.providers[p]
  );

  if (configured.length > 0) {
    return (
      `Sandbox is configured for ${configured.join(", ")} but not for ${targetProvider}. ` +
      `Run "locus sandbox" and select ${targetProvider} to create its sandbox.`
    );
  }

  return (
    `No sandbox is configured for ${targetProvider}. ` +
    `Run "locus sandbox" to create one.`
  );
}

// ─── Detection ───────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000;

let cachedStatus: SandboxStatus | null = null;

/**
 * Detect whether Docker Desktop with sandbox support is available.
 * Runs `docker sandbox ls` with a 5-second timeout.
 * Result is cached after the first call — no repeated subprocess spawns.
 */
export async function detectSandboxSupport(): Promise<SandboxStatus> {
  if (cachedStatus) return cachedStatus;

  const log = getLogger();
  log.debug("Detecting Docker sandbox support...");

  const status = await runDetection();
  cachedStatus = status;

  if (status.available) {
    log.verbose("Docker sandbox support detected");
  } else {
    log.verbose(`Docker sandbox not available: ${status.reason}`);
  }

  return status;
}

function runDetection(): Promise<SandboxStatus> {
  return new Promise((resolve) => {
    let settled = false;

    const child = execFile(
      "docker",
      ["sandbox", "ls"],
      { timeout: TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (settled) return;
        settled = true;

        if (!error) {
          resolve({ available: true });
          return;
        }

        const code = (error as NodeJS.ErrnoException).code;

        // docker binary not found
        if (code === "ENOENT") {
          resolve({ available: false, reason: "Docker is not installed" });
          return;
        }

        // Timeout (Node sets .killed when it kills the process)
        if (error.killed) {
          resolve({ available: false, reason: "Docker is not responding" });
          return;
        }

        // sandbox subcommand not recognized — check stderr for common indicators
        const stderrStr = (stderr ?? "").toLowerCase();
        if (
          stderrStr.includes("unknown") ||
          stderrStr.includes("not a docker command") ||
          stderrStr.includes("is not a docker command")
        ) {
          resolve({
            available: false,
            reason: "Docker Desktop 4.58+ with sandbox support required",
          });
          return;
        }

        // Any other failure — treat as sandbox subcommand not available
        resolve({
          available: false,
          reason: "Docker Desktop 4.58+ with sandbox support required",
        });
      }
    );

    // Safety: if spawn itself fails synchronously, child may be null
    child.on?.("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;

      if (err.code === "ENOENT") {
        resolve({ available: false, reason: "Docker is not installed" });
      } else {
        resolve({
          available: false,
          reason: "Docker Desktop 4.58+ with sandbox support required",
        });
      }
    });
  });
}

// ─── Mode Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the final sandbox mode from config and CLI flags.
 * CLI flags override config values.
 *
 * Priority: --no-sandbox > --sandbox=require > config.sandbox.enabled
 *
 * Throws if --sandbox has an invalid value.
 */
export function resolveSandboxMode(
  config: SandboxConfig,
  flags: { sandbox?: string; noSandbox?: boolean }
): SandboxMode {
  // CLI flags take precedence
  if (flags.noSandbox) {
    return "disabled";
  }

  if (flags.sandbox !== undefined) {
    if (flags.sandbox === "require") {
      return "required";
    }
    throw new Error(
      `Invalid --sandbox value: "${flags.sandbox}". Valid values: require`
    );
  }

  // Fall back to config
  if (!config.enabled) {
    return "disabled";
  }

  return "auto";
}

// ─── Safety Warning ──────────────────────────────────────────────────────────

/**
 * Display a sandbox safety warning based on the resolved mode and detection status.
 *
 * - **disabled** (explicit `--no-sandbox`): Interactive confirmation — waits for
 *   Enter before proceeding. Skipped when stdin is not a TTY (CI/piped input).
 * - **auto** with Docker unavailable: Non-blocking warning — prints and continues.
 * - **required** with Docker unavailable: Fatal error — exits with code 1.
 *
 * Returns `true` if execution should use sandbox, `false` otherwise.
 */
export async function displaySandboxWarning(
  mode: SandboxMode,
  status: SandboxStatus
): Promise<boolean> {
  // Case 3: Required mode, Docker unavailable
  if (mode === "required" && !status.available) {
    process.stderr.write(
      `\n${red("✖")}  Docker sandbox required but not available: ${bold(status.reason ?? "Docker Desktop 4.58+ with sandbox support required")}\n`
    );
    process.stderr.write(
      `   Install Docker Desktop 4.58+ or remove --sandbox=require to continue.\n\n`
    );
    process.exit(1);
  }

  // Case 1: Explicit opt-out (--no-sandbox)
  if (mode === "disabled") {
    process.stderr.write(
      `\n${yellow("⚠")}  ${bold("WARNING:")} Running without sandbox. The AI agent will have unrestricted\n`
    );
    process.stderr.write(
      `   access to your filesystem, network, and environment variables.\n`
    );

    // Interactive confirmation — skip in non-interactive environments
    if (process.stdin.isTTY) {
      process.stderr.write(
        `   Press ${bold("Enter")} to continue or ${bold("Ctrl+C")} to abort.\n`
      );
      await waitForEnter();
    }

    process.stderr.write("\n");
    return false;
  }

  // Case 2: Auto mode, Docker unavailable
  if (mode === "auto" && !status.available) {
    process.stderr.write(
      `\n${yellow("⚠")}  Docker sandbox not available. Install Docker Desktop 4.58+ for secure execution.\n`
    );
    process.stderr.write(
      `   Running without sandbox. Use ${dim("--no-sandbox")} to suppress this warning.\n\n`
    );
    return false;
  }

  // Docker available — sandbox will be used
  return true;
}

// ─── Container Workdir Detection ──────────────────────────────────────────

/**
 * Detect the actual workspace path inside a Docker sandbox container.
 *
 * On macOS/Linux the host path is mounted at the same absolute path, so this
 * returns `null` (no translation needed). On Windows/WSL, Docker Desktop
 * translates the WSL path to a Windows UNC path (e.g.
 * `\\wsl.localhost\Ubuntu-24.04\home\user\project`) and may mount the project
 * at a deeply nested container path. This function probes the container to
 * find the actual mount point.
 *
 * Strategy:
 * 1. Fast path: `test -d <hostPath>` — if it exists, paths match (macOS/Linux).
 * 2. Mount table: parse `/proc/mounts` for non-system mount points and check
 *    each one for project markers (`.git`, `package.json`).
 * 3. Deep find: search for `.git` at depth up to 10 as a last resort.
 */
export function detectContainerWorkdir(
  sandboxName: string,
  hostProjectRoot: string
): string | null {
  const log = getLogger();

  // Fast path: check if the host path exists inside the container.
  // On macOS/Linux, Docker Desktop mounts at the same absolute path.
  try {
    execSync(
      `docker sandbox exec ${sandboxName} test -d ${JSON.stringify(hostProjectRoot)}`,
      { stdio: ["pipe", "pipe", "pipe"], timeout: 5000 }
    );
    log.debug("Container workdir matches host path", { hostProjectRoot });
    return null;
  } catch {
    log.debug("Host path not found in container, probing for mount point...");
  }

  // WSL/Windows: host path doesn't exist in container.
  // Strategy 1: Inspect /proc/mounts to find non-system mount points,
  // then check each one for project markers.
  try {
    const raw = execSync(
      `docker sandbox exec ${sandboxName} cat /proc/mounts`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 5000 }
    ).trim();

    if (raw) {
      const systemPrefixes = ["/proc", "/sys", "/dev", "/run"];
      const candidates = raw
        .split("\n")
        .map((line) => {
          const fields = line.split(" ");
          return fields[1]; // mount point is the second field
        })
        .filter(
          (mp): mp is string =>
            !!mp &&
            mp !== "/" &&
            !systemPrefixes.some((p) => mp === p || mp.startsWith(`${p}/`))
        );

      for (const candidate of candidates) {
        try {
          execSync(
            `docker sandbox exec ${sandboxName} sh -c "test -d ${JSON.stringify(`${candidate}/.git`)} || test -f ${JSON.stringify(`${candidate}/package.json`)}"`,
            { stdio: ["pipe", "pipe", "pipe"], timeout: 3000 }
          );
          log.debug("Detected container workdir from mount table", {
            hostProjectRoot,
            containerWorkdir: candidate,
          });
          return candidate;
        } catch {
          // Not a project mount, try next
        }
      }
    }
  } catch (err) {
    log.debug("Mount table probe failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Strategy 2: Deep find for .git directory (handles exotic mount points).
  try {
    const gitDir = execSync(
      `docker sandbox exec ${sandboxName} sh -c "find / -maxdepth 10 -name .git -type d ! -path '*/proc/*' ! -path '*/sys/*' ! -path '*/dev/*' ! -path '*/node_modules/*' 2>/dev/null | head -1"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 15000 }
    ).trim();

    if (gitDir) {
      const containerPath = gitDir.replace(/\/\.git$/, "") || "/";
      log.debug("Detected container workdir from .git marker (deep find)", {
        hostProjectRoot,
        containerWorkdir: containerPath,
      });
      return containerPath;
    }
  } catch (err) {
    log.debug("Container workdir detection via deep find failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.debug("Could not detect container workdir, falling back to host path");
  return null;
}

// ─── Symlink Support Probe ────────────────────────────────────────────────

/**
 * Test whether the sandbox bind-mount supports symlinks.
 *
 * Creates a temporary symlink in the workdir and removes it. If the operation
 * fails (ENOSYS on WSL/NTFS, or any other error), returns `false`.
 */
export function probeSymlinkSupport(
  sandboxName: string,
  workdir: string
): boolean {
  const log = getLogger();
  const probe = ".locus-symlink-probe";
  try {
    execSync(
      `docker sandbox exec --privileged ${sandboxName} sh -c ${JSON.stringify(
        `cd ${JSON.stringify(workdir)} && ln -s /tmp ${probe} && rm -f ${probe}`
      )}`,
      { stdio: ["pipe", "pipe", "pipe"], timeout: 5000 }
    );
    log.debug("Symlink probe succeeded — bind mount supports symlinks");
    return true;
  } catch {
    // Clean up in case ln succeeded but rm failed (unlikely)
    try {
      execSync(
        `docker sandbox exec --privileged ${sandboxName} rm -f ${JSON.stringify(
          `${workdir}/${probe}`
        )}`,
        { stdio: ["pipe", "pipe", "pipe"], timeout: 3000 }
      );
    } catch {
      // Best-effort cleanup
    }
    log.debug(
      "Symlink probe failed — bind mount does not support symlinks (ENOSYS)"
    );
    return false;
  }
}

/** Wait for the user to press Enter. Resolves immediately if stdin is not a TTY. */
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    rl.once("line", () => {
      rl.close();
      resolve();
    });

    // Also resolve on close (e.g. Ctrl+C sends SIGINT which closes readline)
    rl.once("close", () => {
      resolve();
    });
  });
}
