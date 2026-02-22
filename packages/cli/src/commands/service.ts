import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { c } from "@locusai/sdk/node";
import { SettingsManager } from "../settings-manager";
import { requireInitialization } from "../utils";

// ============================================================================
// Binary resolution
// ============================================================================

async function findBinary(): Promise<string | null> {
  const result = await runShell("which", ["locus-telegram"]);
  const p = result.stdout.trim();
  return p?.startsWith?.("/") ? p : null;
}

/**
 * Find the directory containing a given binary.
 * Returns the directory path or null if not found.
 */
async function findBinDir(binary: string): Promise<string | null> {
  const result = await runShell("which", [binary]);
  const p = result.stdout.trim();
  if (p?.startsWith?.("/")) return dirname(p);
  return null;
}

/**
 * Resolve the nvm node bin directory for the active/default version.
 * nvm does NOT create a `current` symlink — it uses versioned directories.
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
async function buildServicePath(): Promise<string> {
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

  // nvm — resolve actual version directory (not the nonexistent `current` symlink)
  const nvmBin = resolveNvmBinDir();
  if (nvmBin) dirs.add(nvmBin);

  // fnm — uses a `current` symlink
  const fnmCurrent = join(home, ".fnm", "current", "bin");
  if (existsSync(fnmCurrent)) dirs.add(fnmCurrent);

  // Detect where `claude` and `codex` are installed and include their directories
  for (const bin of ["claude", "codex"]) {
    const dir = await findBinDir(bin);
    if (dir) dirs.add(dir);
  }

  return Array.from(dirs).join(":");
}

// ============================================================================
// Constants
// ============================================================================

const SERVICE_NAME = "locus";
const SYSTEMD_UNIT_PATH = `/etc/systemd/system/${SERVICE_NAME}.service`;
const PLIST_LABEL = "com.locus.agent";

function getPlistPath(): string {
  return join(homedir(), "Library/LaunchAgents", `${PLIST_LABEL}.plist`);
}

// ============================================================================
// Help
// ============================================================================

function showServiceHelp(): void {
  console.log(`
  ${c.header(" SERVICE ")}
    ${c.primary("locus service")} ${c.dim("<subcommand>")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("install")}           Install Locus as a system service
                      ${c.dim("Sets up systemd (Linux) or launchd (macOS)")}
                      ${c.dim("to run the Telegram bot + proposal scheduler")}
    ${c.success("uninstall")}         Remove the system service
    ${c.success("status")}            Check if the service is running

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus service install")}
    ${c.dim("$")} ${c.primary("locus service status")}
    ${c.dim("$")} ${c.primary("locus service uninstall")}
`);
}

// ============================================================================
// Shell helpers
// ============================================================================

function runShell(
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
// Systemd (Linux)
// ============================================================================

function generateSystemdUnit(
  projectPath: string,
  user: string,
  binaryPath: string,
  servicePath: string
): string {
  return `[Unit]
Description=Locus AI Agent (Telegram bot + proposal scheduler)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${projectPath}
ExecStart=${binaryPath}
Restart=on-failure
RestartSec=10
Environment=PATH=${servicePath}
Environment=HOME=${homedir()}

[Install]
WantedBy=multi-user.target
`;
}

async function installSystemd(projectPath: string): Promise<void> {
  const user = process.env.USER || "root";

  const binaryPath = await findBinary();
  if (!binaryPath) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Could not find locus-telegram binary.")}\n` +
        `  Install with: ${c.primary("npm install -g @locusai/telegram")}\n`
    );
    process.exit(1);
  }

  // Warn if CLI tools are not found — they're required at runtime
  if (!(await findBinDir("claude"))) {
    console.warn(
      `\n  ${c.secondary("⚠")} ${c.bold("Could not find 'claude' CLI in PATH.")}\n` +
        `  The service needs the Claude Code CLI to execute tasks.\n` +
        `  Install with: ${c.primary("npm install -g @anthropic-ai/claude-code")}\n`
    );
  }
  if (!(await findBinDir("codex"))) {
    console.warn(
      `\n  ${c.secondary("⚠")} ${c.bold("Could not find 'codex' CLI in PATH.")}\n` +
        `  The service needs the Codex CLI if using the Codex provider.\n` +
        `  Install with: ${c.primary("npm install -g @openai/codex")}\n`
    );
  }

  const servicePath = await buildServicePath();
  const unit = generateSystemdUnit(projectPath, user, binaryPath, servicePath);

  console.log(
    `\n  ${c.info("▶")} Writing systemd unit to ${c.dim(SYSTEMD_UNIT_PATH)}`
  );
  writeFileSync(SYSTEMD_UNIT_PATH, unit, "utf-8");

  console.log(`  ${c.info("▶")} Reloading systemd daemon...`);
  await runShell("systemctl", ["daemon-reload"]);

  console.log(`  ${c.info("▶")} Enabling and starting ${SERVICE_NAME}...`);
  await runShell("systemctl", ["enable", SERVICE_NAME]);
  const startResult = await runShell("systemctl", ["start", SERVICE_NAME]);

  if (startResult.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to start service: ${startResult.stderr.trim()}`
    );
    console.error(
      `  ${c.dim("Check logs with:")} ${c.primary(`journalctl -u ${SERVICE_NAME} -f`)}`
    );
    return;
  }

  console.log(`
  ${c.success("✔")} ${c.bold("Locus service installed and running!")}

  ${c.bold("Service:")} ${SERVICE_NAME}
  ${c.bold("Unit file:")} ${SYSTEMD_UNIT_PATH}

  ${c.bold("Useful commands:")}
    ${c.dim("$")} ${c.primary(`sudo systemctl status ${SERVICE_NAME}`)}
    ${c.dim("$")} ${c.primary(`sudo systemctl restart ${SERVICE_NAME}`)}
    ${c.dim("$")} ${c.primary(`journalctl -u ${SERVICE_NAME} -f`)}
`);
}

async function uninstallSystemd(): Promise<void> {
  if (!existsSync(SYSTEMD_UNIT_PATH)) {
    console.log(
      `\n  ${c.dim("No systemd service found. Nothing to remove.")}\n`
    );
    return;
  }

  console.log(`  ${c.info("▶")} Stopping and disabling ${SERVICE_NAME}...`);
  await runShell("systemctl", ["stop", SERVICE_NAME]);
  await runShell("systemctl", ["disable", SERVICE_NAME]);

  const { unlinkSync } = await import("node:fs");
  unlinkSync(SYSTEMD_UNIT_PATH);
  await runShell("systemctl", ["daemon-reload"]);

  console.log(`\n  ${c.success("✔")} ${c.bold("Locus service removed.")}\n`);
}

async function statusSystemd(): Promise<void> {
  const result = await runShell("systemctl", ["is-active", SERVICE_NAME]);
  const state = result.stdout.trim();

  if (state === "active") {
    console.log(
      `\n  ${c.success("●")} ${c.bold("Locus service is running")} ${c.dim("(systemd)")}\n`
    );
  } else if (existsSync(SYSTEMD_UNIT_PATH)) {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold(`Locus service is ${state}`)} ${c.dim("(systemd)")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary(`sudo systemctl start ${SERVICE_NAME}`)}\n`
    );
  } else {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus service is not installed")}\n`
    );
    console.log(
      `  ${c.dim("Install with:")} ${c.primary("locus service install")}\n`
    );
  }
}

// ============================================================================
// Launchd (macOS)
// ============================================================================

function generatePlist(
  projectPath: string,
  binaryPath: string,
  binaryArgs: string[],
  servicePath: string
): string {
  const argsXml = [binaryPath, ...binaryArgs]
    .map((a) => `    <string>${a}</string>`)
    .join("\n");

  const logDir = join(homedir(), "Library/Logs/Locus");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>WorkingDirectory</key>
  <string>${projectPath}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(logDir, "locus.log")}</string>
  <key>StandardErrorPath</key>
  <string>${join(logDir, "locus-error.log")}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${servicePath}</string>
  </dict>
</dict>
</plist>
`;
}

async function installLaunchd(projectPath: string): Promise<void> {
  const plistPath = getPlistPath();

  // Unload existing if present
  if (existsSync(plistPath)) {
    await runShell("launchctl", ["unload", plistPath]);
  }

  const binaryPath = await findBinary();
  if (!binaryPath) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Could not find locus-telegram binary.")}\n` +
        `  Install with: ${c.primary("npm install -g @locusai/telegram")}\n`
    );
    process.exit(1);
  }
  const binaryArgs: string[] = [];

  // Warn if CLI tools are not found — they're required at runtime
  if (!(await findBinDir("claude"))) {
    console.warn(
      `\n  ${c.secondary("⚠")} ${c.bold("Could not find 'claude' CLI in PATH.")}\n` +
        `  The service needs the Claude Code CLI to execute tasks.\n` +
        `  Install with: ${c.primary("npm install -g @anthropic-ai/claude-code")}\n`
    );
  }
  if (!(await findBinDir("codex"))) {
    console.warn(
      `\n  ${c.secondary("⚠")} ${c.bold("Could not find 'codex' CLI in PATH.")}\n` +
        `  The service needs the Codex CLI if using the Codex provider.\n` +
        `  Install with: ${c.primary("npm install -g @openai/codex")}\n`
    );
  }

  // Ensure log directory exists
  const logDir = join(homedir(), "Library/Logs/Locus");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(logDir, { recursive: true });

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = join(homedir(), "Library/LaunchAgents");
  mkdirSync(launchAgentsDir, { recursive: true });

  const servicePath = await buildServicePath();
  const plist = generatePlist(projectPath, binaryPath, binaryArgs, servicePath);

  console.log(`\n  ${c.info("▶")} Writing plist to ${c.dim(plistPath)}`);
  writeFileSync(plistPath, plist, "utf-8");

  console.log(`  ${c.info("▶")} Loading service...`);
  const loadResult = await runShell("launchctl", ["load", plistPath]);

  if (loadResult.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to load service: ${loadResult.stderr.trim()}`
    );
    return;
  }

  const logPath = join(logDir, "locus.log");
  console.log(`
  ${c.success("✔")} ${c.bold("Locus service installed and running!")}

  ${c.bold("Plist:")} ${plistPath}
  ${c.bold("Logs:")}  ${logPath}

  ${c.bold("Useful commands:")}
    ${c.dim("$")} ${c.primary(`launchctl list | grep ${PLIST_LABEL}`)}
    ${c.dim("$")} ${c.primary(`tail -f ${logPath}`)}
`);
}

async function uninstallLaunchd(): Promise<void> {
  const plistPath = getPlistPath();

  if (!existsSync(plistPath)) {
    console.log(
      `\n  ${c.dim("No launchd service found. Nothing to remove.")}\n`
    );
    return;
  }

  console.log(`  ${c.info("▶")} Unloading service...`);
  await runShell("launchctl", ["unload", plistPath]);

  const { unlinkSync } = await import("node:fs");
  unlinkSync(plistPath);

  console.log(`\n  ${c.success("✔")} ${c.bold("Locus service removed.")}\n`);
}

async function statusLaunchd(): Promise<void> {
  const plistPath = getPlistPath();

  if (!existsSync(plistPath)) {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus service is not installed")}\n`
    );
    console.log(
      `  ${c.dim("Install with:")} ${c.primary("locus service install")}\n`
    );
    return;
  }

  const result = await runShell("launchctl", ["list"]);
  const lines = result.stdout.split("\n");
  const match = lines.find((l) => l.includes(PLIST_LABEL));

  if (match) {
    // Format: PID  Status  Label
    const parts = match.trim().split(/\s+/);
    const pid = parts[0] === "-" ? null : parts[0];

    if (pid) {
      console.log(
        `\n  ${c.success("●")} ${c.bold("Locus service is running")} ${c.dim(`(PID ${pid}, launchd)`)}\n`
      );
    } else {
      console.log(
        `\n  ${c.secondary("●")} ${c.bold("Locus service is stopped")} ${c.dim("(launchd)")}\n`
      );
      console.log(
        `  ${c.dim("Start with:")} ${c.primary(`launchctl load ${plistPath}`)}\n`
      );
    }
  } else {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus service is not loaded")} ${c.dim("(plist exists but not loaded)")}\n`
    );
    console.log(
      `  ${c.dim("Load with:")} ${c.primary(`launchctl load ${plistPath}`)}\n`
    );
  }
}

// ============================================================================
// Platform router
// ============================================================================

function getPlatform(): "linux" | "darwin" | null {
  if (process.platform === "linux") return "linux";
  if (process.platform === "darwin") return "darwin";
  return null;
}

// ============================================================================
// Subcommands
// ============================================================================

async function installCommand(projectPath: string): Promise<void> {
  const platform = getPlatform();

  if (!platform) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unsupported platform: ${process.platform}`)}\n` +
        `  Service management is supported on Linux (systemd) and macOS (launchd).\n`
    );
    process.exit(1);
  }

  // Validate Telegram is configured
  const manager = new SettingsManager(projectPath);
  const settings = manager.load();

  if (!settings.telegram?.botToken || !settings.telegram?.chatId) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Telegram is not configured.")}\n` +
        `  Run ${c.primary("locus telegram setup")} first.\n`
    );
    process.exit(1);
  }

  if (!settings.apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("API key is not configured.")}\n` +
        `  Run ${c.primary("locus config setup --api-key <key>")} first.\n`
    );
    process.exit(1);
  }

  if (platform === "linux") {
    await installSystemd(projectPath);
  } else {
    await installLaunchd(projectPath);
  }
}

async function uninstallCommand(): Promise<void> {
  const platform = getPlatform();
  if (!platform) {
    console.error(
      `\n  ${c.error("✖")} Unsupported platform: ${process.platform}\n`
    );
    process.exit(1);
  }

  if (platform === "linux") {
    await uninstallSystemd();
  } else {
    await uninstallLaunchd();
  }
}

async function statusCommandHandler(): Promise<void> {
  const platform = getPlatform();
  if (!platform) {
    console.error(
      `\n  ${c.error("✖")} Unsupported platform: ${process.platform}\n`
    );
    process.exit(1);
  }

  if (platform === "linux") {
    await statusSystemd();
  } else {
    await statusLaunchd();
  }
}

// ============================================================================
// Entry point
// ============================================================================

export async function serviceCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  requireInitialization(projectPath, "service");

  const subcommand = args[0];

  switch (subcommand) {
    case "install":
      await installCommand(projectPath);
      break;
    case "uninstall":
      await uninstallCommand();
      break;
    case "status":
      await statusCommandHandler();
      break;
    default:
      showServiceHelp();
  }
}
