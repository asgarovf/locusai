import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Context } from "telegraf";
import {
  escapeHtml,
  formatError,
  formatInfo,
  formatSuccess,
  stripAnsi,
  truncateOutput,
} from "../formatter.js";
import { UPGRADE_TIMEOUT } from "../timeouts.js";

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  killed: boolean;
}

function runCommand(
  cmd: string,
  args: string[],
  timeout: number
): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve) => {
    const proc = spawn(cmd, args, {
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
    }, timeout);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, killed });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr || err.message,
        exitCode: 1,
        killed: false,
      });
    });
  });
}

function getRestartInfo(): {
  label: string;
  commands: { cmd: string; args: string[] }[];
} | null {
  const platform = process.platform;

  if (platform === "linux") {
    return {
      label: "systemd (Linux)",
      commands: [
        { cmd: "sudo", args: ["systemctl", "restart", "locus-telegram"] },
      ],
    };
  }

  if (platform === "darwin") {
    const plistPath = join(
      homedir(),
      "Library/LaunchAgents/com.locus.telegram.plist"
    );
    return {
      label: "launchctl (macOS)",
      commands: [
        { cmd: "launchctl", args: ["unload", plistPath] },
        { cmd: "launchctl", args: ["load", plistPath] },
      ],
    };
  }

  return null;
}

export async function upgradeCommand(ctx: Context): Promise<void> {
  console.log("[upgrade] Starting upgrade");

  const restartInfo = getRestartInfo();
  if (!restartInfo) {
    await ctx.reply(
      formatError(
        `Unsupported platform: ${process.platform}. Upgrade is only supported on Linux (systemd) and macOS (launchctl).`
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  // Step 1: Run locus upgrade
  await ctx.reply(formatInfo("Running <code>sudo locus upgrade</code>..."), {
    parse_mode: "HTML",
  });

  const upgradeResult = await runCommand(
    "sudo",
    ["locus", "upgrade"],
    UPGRADE_TIMEOUT
  );

  const output = stripAnsi(
    (upgradeResult.stdout + upgradeResult.stderr).trim()
  );

  if (upgradeResult.killed) {
    await ctx.reply(formatError("Upgrade command timed out and was killed."), {
      parse_mode: "HTML",
    });
    return;
  }

  if (upgradeResult.exitCode !== 0) {
    const truncated = truncateOutput(output, 3000);
    await ctx.reply(
      `${formatError("Upgrade failed:")}\n\n<pre>${escapeHtml(truncated)}</pre>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Check if any packages were actually updated (not just "already at latest")
  const packagesUpdated = output.includes("updated to");

  // Show upgrade output
  if (output) {
    const truncated = truncateOutput(output, 3000);
    await ctx.reply(
      `${formatSuccess("Upgrade completed:")}\n\n<pre>${escapeHtml(truncated)}</pre>`,
      { parse_mode: "HTML" }
    );
  } else {
    await ctx.reply(formatSuccess("Upgrade completed."), {
      parse_mode: "HTML",
    });
  }

  // Step 2: Only restart if packages were actually updated
  if (!packagesUpdated) {
    await ctx.reply(
      formatInfo("All packages already at latest version. No restart needed."),
      { parse_mode: "HTML" }
    );
    return;
  }

  // Send this message before restarting since the process will terminate
  await ctx.reply(
    formatInfo(
      `Restarting locus-telegram via ${restartInfo.label}... The bot will be back shortly.`
    ),
    { parse_mode: "HTML" }
  );

  // Execute restart commands sequentially
  for (const { cmd, args } of restartInfo.commands) {
    console.log(`[upgrade] Running: ${cmd} ${args.join(" ")}`);
    const result = await runCommand(cmd, args, 30_000);

    if (result.exitCode !== 0) {
      const errOutput = stripAnsi((result.stdout + result.stderr).trim());
      console.error(
        `[upgrade] Restart command failed: ${cmd} ${args.join(" ")} — ${errOutput}`
      );
      // Try to notify user, but the process might already be stopping
      try {
        await ctx.reply(
          formatError(
            `Restart failed: <code>${escapeHtml(`${cmd} ${args.join(" ")}`)}</code>\n\n<pre>${escapeHtml(truncateOutput(errOutput, 2000))}</pre>`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        // Process may already be shutting down
      }
      return;
    }
  }

  // If we get here (unlikely since restart kills the process), confirm
  try {
    await ctx.reply(formatSuccess("Bot restarted successfully."), {
      parse_mode: "HTML",
    });
  } catch {
    // Process likely terminated by restart
  }
}
