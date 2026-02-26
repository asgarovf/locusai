/**
 * Daemon lifecycle management for locus-telegram.
 *
 * The daemon is the detached background process that runs the Telegram bot's
 * long-polling loop. Its PID is persisted so `stop` and `status` commands can
 * find it after the parent process exits.
 *
 * Daemonisation strategy:
 *   1. `start` spawns a new copy of this binary with the `--daemon` flag,
 *      using { detached: true, stdio: 'ignore' } so it survives parent exit.
 *   2. The child writes its own PID and begins the polling loop (see bot.ts).
 *   3. `stop` reads the PID file and sends SIGTERM.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { getPidPath } from "./config.js";

// ─── PID helpers ──────────────────────────────────────────────────────────────

export function writePid(pid: number): void {
  writeFileSync(getPidPath(), String(pid), "utf-8");
}

export function readPid(): number | null {
  const path = getPidPath();
  if (!existsSync(path)) return null;
  try {
    const pid = parseInt(readFileSync(path, "utf-8").trim(), 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export function removePid(): void {
  const path = getPidPath();
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
}

// ─── Status check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the daemon is currently running.
 *
 * Uses signal 0 (probe) to test process liveness without sending a real signal.
 */
export function isDaemonRunning(): boolean {
  const pid = readPid();
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    // ESRCH = no such process; EPERM = exists but not owned (still alive)
    return error.code === "EPERM";
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export function startDaemon(): void {
  if (isDaemonRunning()) {
    const pid = readPid();
    process.stdout.write(
      `Telegram bot daemon is already running (PID ${pid ?? "??"}).\n`
    );
    process.stdout.write(`  Use: locus pkg telegram status\n`);
    return;
  }

  // Resolve the real path of this binary (handles .bin symlinks).
  let scriptPath: string;
  try {
    scriptPath = realpathSync(process.argv[1]);
  } catch {
    scriptPath = process.argv[1];
  }

  // Spawn a detached child that runs the daemon loop.
  const child = spawn(process.execPath, [scriptPath, "--daemon"], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    env: { ...process.env },
  });

  child.unref();

  if (!child.pid) {
    process.stderr.write("Failed to start daemon — could not obtain PID.\n");
    process.exit(1);
    return;
  }

  writePid(child.pid);
  process.stdout.write("Telegram bot started. Send /help to your bot.\n");
}

export function stopDaemon(): void {
  if (!isDaemonRunning()) {
    const stale = readPid();
    if (stale !== null) {
      // Stale PID file — clean it up.
      removePid();
      process.stdout.write(
        "Daemon was not running (stale PID file removed).\n"
      );
    } else {
      process.stdout.write("Telegram bot daemon is not running.\n");
    }
    return;
  }

  const pid = readPid()!;

  try {
    process.kill(pid, "SIGTERM");
    removePid();
    process.stdout.write(`Telegram bot stopped (PID ${pid}).\n`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ESRCH") {
      removePid();
      process.stdout.write("Daemon was not running (stale PID removed).\n");
    } else {
      process.stderr.write(`Failed to stop daemon: ${error.message}\n`);
      process.exit(1);
    }
  }
}

export function printStatus(): void {
  const running = isDaemonRunning();
  const pid = readPid();

  if (running && pid !== null) {
    process.stdout.write(`Telegram bot daemon is running (PID ${pid}).\n`);
  } else {
    process.stdout.write("Telegram bot daemon is not running.\n");
  }
}
