import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { c } from "@locusai/sdk/node";
import { SettingsManager } from "../settings-manager";
import { requireInitialization } from "../utils";
import {
  PLIST_LABEL,
  SERVICE_NAME,
  SYSTEMD_UNIT_PATH,
  buildServicePath,
  findBinDir,
  findTelegramBinary,
  getPlatform,
  getPlistPath,
  killOrphanedProcesses,
  runShell,
} from "../utils/process";

// ============================================================================
// Help
// ============================================================================

function showDaemonHelp(): void {
  console.log(`
  ${c.header(" DAEMON ")}
    ${c.primary("locus daemon")} ${c.dim("<subcommand>")}

  ${c.header(" SUBCOMMANDS ")}
    ${c.success("start")}     Install and start Locus as a background service
                ${c.dim("Sets up systemd (Linux) or launchd (macOS)")}
    ${c.success("stop")}      Stop and remove the background service
    ${c.success("restart")}   Restart the background service
    ${c.success("status")}    Check if the service is running

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus daemon start")}
    ${c.dim("$")} ${c.primary("locus daemon status")}
    ${c.dim("$")} ${c.primary("locus daemon restart")}
    ${c.dim("$")} ${c.primary("locus daemon stop")}
`);
}

// ============================================================================
// Shared helpers
// ============================================================================

interface DaemonBinaries {
  binaryPath: string;
  servicePath: string;
}

/** Resolve the telegram binary and build the service PATH. Exits on failure. */
async function resolveBinaries(): Promise<DaemonBinaries> {
  const binaryPath = await findTelegramBinary();
  if (!binaryPath) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold("Could not find locus-telegram binary.")}\n` +
        `  Install with: ${c.primary("npm install -g @locusai/telegram")}\n`
    );
    process.exit(1);
  }

  for (const bin of ["claude", "codex"]) {
    if (!(await findBinDir(bin))) {
      console.warn(
        `\n  ${c.secondary("⚠")} ${c.bold(`Could not find '${bin}' CLI in PATH.`)}\n` +
          `  The service may need it to execute tasks.\n`
      );
    }
  }

  const servicePath = await buildServicePath();
  return { binaryPath, servicePath };
}

function requirePlatform(): "linux" | "darwin" {
  const platform = getPlatform();
  if (!platform) {
    console.error(
      `\n  ${c.error("✖")} ${c.bold(`Unsupported platform: ${process.platform}`)}\n` +
        `  Daemon management is supported on Linux (systemd) and macOS (launchd).\n`
    );
    process.exit(1);
  }
  return platform;
}

function validateConfig(projectPath: string): void {
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
}

// ============================================================================
// Systemd (Linux)
// ============================================================================

function generateSystemdUnit(
  projectPath: string,
  user: string,
  bins: DaemonBinaries
): string {
  return `[Unit]
Description=Locus AI Agent (Telegram bot + proposal scheduler)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${projectPath}
ExecStart=${bins.binaryPath}
Restart=on-failure
RestartSec=10
Environment=PATH=${bins.servicePath}
Environment=HOME=${homedir()}

[Install]
WantedBy=multi-user.target
`;
}

async function startSystemd(
  projectPath: string,
  bins: DaemonBinaries
): Promise<void> {
  const user = process.env.USER || "root";
  const unit = generateSystemdUnit(projectPath, user, bins);

  console.log(
    `\n  ${c.info("▶")} Writing systemd unit to ${c.dim(SYSTEMD_UNIT_PATH)}`
  );
  writeFileSync(SYSTEMD_UNIT_PATH, unit, "utf-8");

  console.log(`  ${c.info("▶")} Reloading systemd daemon...`);
  await runShell("systemctl", ["daemon-reload"]);

  console.log(`  ${c.info("▶")} Enabling and starting ${SERVICE_NAME}...`);
  await runShell("systemctl", ["enable", SERVICE_NAME]);
  const result = await runShell("systemctl", ["start", SERVICE_NAME]);

  if (result.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to start service: ${result.stderr.trim()}`
    );
    console.error(
      `  ${c.dim("Check logs with:")} ${c.primary(`journalctl -u ${SERVICE_NAME} -f`)}`
    );
    return;
  }

  console.log(`
  ${c.success("✔")} ${c.bold("Locus daemon started!")}

  ${c.bold("Service:")} ${SERVICE_NAME}
  ${c.bold("Unit file:")} ${SYSTEMD_UNIT_PATH}

  ${c.bold("Useful commands:")}
    ${c.dim("$")} ${c.primary(`sudo systemctl status ${SERVICE_NAME}`)}
    ${c.dim("$")} ${c.primary(`journalctl -u ${SERVICE_NAME} -f`)}
`);
}

async function stopSystemd(): Promise<void> {
  if (!existsSync(SYSTEMD_UNIT_PATH)) {
    console.log(
      `\n  ${c.dim("No systemd service found. Nothing to stop.")}\n`
    );
    await killOrphanedProcesses();
    return;
  }

  console.log(`  ${c.info("▶")} Stopping and disabling ${SERVICE_NAME}...`);
  await runShell("systemctl", ["stop", SERVICE_NAME]);
  await runShell("systemctl", ["disable", SERVICE_NAME]);
  unlinkSync(SYSTEMD_UNIT_PATH);
  await runShell("systemctl", ["daemon-reload"]);
  await killOrphanedProcesses();

  console.log(`\n  ${c.success("✔")} ${c.bold("Locus daemon stopped.")}\n`);
}

async function restartSystemd(): Promise<void> {
  if (!existsSync(SYSTEMD_UNIT_PATH)) {
    console.log(
      `\n  ${c.dim("No systemd service found. Use")} ${c.primary("locus daemon start")} ${c.dim("first.")}\n`
    );
    return;
  }

  console.log(`  ${c.info("▶")} Restarting ${SERVICE_NAME}...`);
  const result = await runShell("systemctl", ["restart", SERVICE_NAME]);

  if (result.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to restart: ${result.stderr.trim()}\n`
    );
    return;
  }

  console.log(
    `\n  ${c.success("✔")} ${c.bold("Locus daemon restarted.")}\n`
  );
}

async function statusSystemd(): Promise<void> {
  const result = await runShell("systemctl", ["is-active", SERVICE_NAME]);
  const state = result.stdout.trim();

  if (state === "active") {
    console.log(
      `\n  ${c.success("●")} ${c.bold("Locus daemon is running")} ${c.dim("(systemd)")}\n`
    );
  } else if (existsSync(SYSTEMD_UNIT_PATH)) {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold(`Locus daemon is ${state}`)} ${c.dim("(systemd)")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
  } else {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus daemon is not installed")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
  }
}

// ============================================================================
// Launchd (macOS)
// ============================================================================

function generatePlist(
  projectPath: string,
  bins: DaemonBinaries
): string {
  const logDir = join(homedir(), "Library/Logs/Locus");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${bins.binaryPath}</string>
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
    <string>${bins.servicePath}</string>
  </dict>
</dict>
</plist>
`;
}

async function startLaunchd(
  projectPath: string,
  bins: DaemonBinaries
): Promise<void> {
  const plistPath = getPlistPath();

  // Unload existing if present
  if (existsSync(plistPath)) {
    await runShell("launchctl", ["unload", plistPath]);
  }

  // Ensure directories exist
  const logDir = join(homedir(), "Library/Logs/Locus");
  mkdirSync(logDir, { recursive: true });
  mkdirSync(join(homedir(), "Library/LaunchAgents"), { recursive: true });

  const plist = generatePlist(projectPath, bins);

  console.log(`\n  ${c.info("▶")} Writing plist to ${c.dim(plistPath)}`);
  writeFileSync(plistPath, plist, "utf-8");

  console.log(`  ${c.info("▶")} Loading service...`);
  const result = await runShell("launchctl", ["load", plistPath]);

  if (result.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to load service: ${result.stderr.trim()}`
    );
    return;
  }

  const logPath = join(logDir, "locus.log");
  console.log(`
  ${c.success("✔")} ${c.bold("Locus daemon started!")}

  ${c.bold("Plist:")} ${plistPath}
  ${c.bold("Logs:")}  ${logPath}

  ${c.bold("Useful commands:")}
    ${c.dim("$")} ${c.primary(`launchctl list | grep ${PLIST_LABEL}`)}
    ${c.dim("$")} ${c.primary(`tail -f ${logPath}`)}
`);
}

async function stopLaunchd(): Promise<void> {
  const plistPath = getPlistPath();

  if (!existsSync(plistPath)) {
    console.log(
      `\n  ${c.dim("No launchd service found. Nothing to stop.")}\n`
    );
    await killOrphanedProcesses();
    return;
  }

  console.log(`  ${c.info("▶")} Unloading service...`);
  await runShell("launchctl", ["unload", plistPath]);
  unlinkSync(plistPath);
  await killOrphanedProcesses();

  console.log(`\n  ${c.success("✔")} ${c.bold("Locus daemon stopped.")}\n`);
}

async function restartLaunchd(): Promise<void> {
  const plistPath = getPlistPath();

  if (!existsSync(plistPath)) {
    console.log(
      `\n  ${c.dim("No launchd service found. Use")} ${c.primary("locus daemon start")} ${c.dim("first.")}\n`
    );
    return;
  }

  console.log(`  ${c.info("▶")} Restarting service...`);
  await runShell("launchctl", ["unload", plistPath]);

  const result = await runShell("launchctl", ["load", plistPath]);
  if (result.exitCode !== 0) {
    console.error(
      `\n  ${c.error("✖")} Failed to restart: ${result.stderr.trim()}\n`
    );
    return;
  }

  console.log(
    `\n  ${c.success("✔")} ${c.bold("Locus daemon restarted.")}\n`
  );
}

async function statusLaunchd(): Promise<void> {
  const plistPath = getPlistPath();

  if (!existsSync(plistPath)) {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus daemon is not installed")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
    return;
  }

  const result = await runShell("launchctl", ["list"]);
  const match = result.stdout
    .split("\n")
    .find((l) => l.includes(PLIST_LABEL));

  if (match) {
    const parts = match.trim().split(/\s+/);
    const pid = parts[0] === "-" ? null : parts[0];

    if (pid) {
      console.log(
        `\n  ${c.success("●")} ${c.bold("Locus daemon is running")} ${c.dim(`(PID ${pid}, launchd)`)}\n`
      );
    } else {
      console.log(
        `\n  ${c.secondary("●")} ${c.bold("Locus daemon is stopped")} ${c.dim("(launchd)")}\n`
      );
      console.log(
        `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
      );
    }
  } else {
    console.log(
      `\n  ${c.secondary("●")} ${c.bold("Locus daemon is not loaded")} ${c.dim("(plist exists but not loaded)")}\n`
    );
    console.log(
      `  ${c.dim("Start with:")} ${c.primary("locus daemon start")}\n`
    );
  }
}

// ============================================================================
// Entry point
// ============================================================================

export async function daemonCommand(args: string[]): Promise<void> {
  const projectPath = process.cwd();
  requireInitialization(projectPath, "daemon");

  const subcommand = args[0];
  const platform = subcommand ? requirePlatform() : null;
  const isLinux = platform === "linux";

  switch (subcommand) {
    case "start": {
      validateConfig(projectPath);
      const bins = await resolveBinaries();
      if (isLinux) await startSystemd(projectPath, bins);
      else await startLaunchd(projectPath, bins);
      break;
    }
    case "stop":
      if (isLinux) await stopSystemd();
      else await stopLaunchd();
      break;
    case "restart":
      if (isLinux) await restartSystemd();
      else await restartLaunchd();
      break;
    case "status":
      if (isLinux) await statusSystemd();
      else await statusLaunchd();
      break;
    default:
      showDaemonHelp();
  }
}
