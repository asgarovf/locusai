import { spawn } from "node:child_process";
import type { ValidatedCommand } from "./command-whitelist.js";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function log(id: string, message: string): void {
  console.log(`[${timestamp()}] [${id}] ${message}`);
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  killed: boolean;
}

/**
 * Execute a validated command using spawn (no shell).
 * The binary and args are passed directly to spawn, preventing shell injection.
 */
export function executeShellCommand(
  command: ValidatedCommand,
  options: { cwd: string; timeout: number }
): Promise<ShellResult> {
  const id = `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const display = `${command.binary} ${command.args.join(" ")}`;
  const startTime = Date.now();
  log(id, `Shell command started: ${display}`);

  return new Promise<ShellResult>((resolve) => {
    const proc = spawn(command.binary, command.args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
    }, options.timeout);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log(
        id,
        `Shell command exited (code: ${exitCode}, ${elapsed}s)${killed ? " [killed]" : ""}`
      );
      resolve({ stdout, stderr, exitCode, killed });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      log(id, `Shell command error: ${err.message}`);
      resolve({
        stdout,
        stderr: stderr || err.message,
        exitCode: 1,
        killed: false,
      });
    });
  });
}
