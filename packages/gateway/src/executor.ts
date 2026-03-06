/**
 * CommandExecutor — executes Locus CLI commands and git operations,
 * producing output that the gateway can route back to any platform.
 *
 * Handles both streaming (long-running, real-time output) and
 * buffered (collect-all-then-respond) command execution.
 */

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { invokeLocusStream } from "@locusai/sdk";
import { getCommandDefinition } from "./commands.js";
import { CommandTracker } from "./tracker.js";
import type { CommandResult, ConflictResult } from "./types.js";

const exec = promisify(execCb);

/** Minimum interval between streaming updates (ms). */
const STREAM_UPDATE_INTERVAL = 2000;

/** Callback for streaming updates. */
export interface StreamCallbacks {
  /** Called when a streaming message should be sent (initial). */
  onStart(text: string): Promise<string | undefined>;
  /** Called periodically as new output arrives. messageId is from onStart. */
  onUpdate(messageId: string, text: string): Promise<void>;
  /** Called when the command is complete. */
  onComplete(messageId: string, text: string, exitCode: number): Promise<void>;
}

export class CommandExecutor {
  private tracker: CommandTracker;

  constructor(tracker: CommandTracker) {
    this.tracker = tracker;
  }

  /** Get the tracker instance. */
  getTracker(): CommandTracker {
    return this.tracker;
  }

  /**
   * Execute a Locus CLI command.
   *
   * For streaming commands, uses callbacks to push incremental output.
   * For buffered commands, collects all output and returns it.
   */
  async executeLocusCommand(
    sessionId: string,
    command: string,
    args: string[],
    callbacks?: StreamCallbacks
  ): Promise<CommandResult & { exitCode: number }> {
    const definition = getCommandDefinition(command);
    if (!definition) {
      return {
        text: `Unknown command: /${command}`,
        format: "plain",
        exitCode: 1,
      };
    }

    // Check argument requirements
    if (definition.requiresArgs && args.length === 0) {
      return {
        text: definition.requiresArgs,
        format: "plain",
        exitCode: 1,
      };
    }

    // Check concurrency conflicts
    const conflict = this.tracker.checkExclusiveConflict(sessionId, command);
    if (conflict) {
      return {
        text: formatConflictText(command, conflict),
        format: "plain",
        exitCode: 1,
      };
    }

    const fullArgs = [...definition.cliArgs, ...args];

    if (definition.streaming && callbacks) {
      return this.executeStreaming(
        sessionId,
        command,
        args,
        fullArgs,
        callbacks
      );
    }

    return this.executeBuffered(sessionId, command, args, fullArgs);
  }

  /**
   * Execute a git command directly (not via the Locus CLI).
   */
  async executeGit(
    sessionId: string,
    command: string,
    args: string[],
    gitArgs: string
  ): Promise<CommandResult & { exitCode: number }> {
    // Check concurrency conflicts
    const conflict = this.tracker.checkExclusiveConflict(sessionId, command);
    if (conflict) {
      return {
        text: formatConflictText(command, conflict),
        format: "plain",
        exitCode: 1,
      };
    }

    const trackingId = this.tracker.track(sessionId, command, args);

    try {
      const { stdout } = await exec(`git ${gitArgs}`, { cwd: process.cwd() });
      return {
        text: stdout,
        format: "plain",
        exitCode: 0,
      };
    } catch (error: unknown) {
      const errStr = String(error);
      return {
        text: errStr,
        format: "plain",
        exitCode: 1,
      };
    } finally {
      this.tracker.untrack(sessionId, trackingId);
    }
  }

  /** Execute a streaming command with real-time output updates. */
  private async executeStreaming(
    sessionId: string,
    command: string,
    args: string[],
    fullArgs: string[],
    callbacks: StreamCallbacks
  ): Promise<CommandResult & { exitCode: number }> {
    const child = invokeLocusStream(fullArgs);
    const trackingId = this.tracker.track(sessionId, command, args, child);

    let output = "";
    let lastUpdateTime = 0;
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    let messageId = "";

    // Send initial message
    const displayCmd = `locus ${fullArgs.join(" ")}`;
    const startResult = await callbacks.onStart(
      formatStreamingText(displayCmd, "", false)
    );
    if (startResult) messageId = startResult;

    const pushUpdate = async () => {
      const now = Date.now();
      if (now - lastUpdateTime < STREAM_UPDATE_INTERVAL) return;
      lastUpdateTime = now;

      try {
        await callbacks.onUpdate(
          messageId,
          formatStreamingText(displayCmd, output, false)
        );
      } catch {
        // Edit can fail if content hasn't changed — ignore
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(pushUpdate, STREAM_UPDATE_INTERVAL);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    return new Promise((resolve) => {
      child.on("close", async (exitCode) => {
        this.tracker.untrack(sessionId, trackingId);
        if (updateTimer) clearTimeout(updateTimer);

        const code = exitCode ?? 0;

        await callbacks.onComplete(
          messageId,
          formatStreamingText(displayCmd, output, true),
          code
        );

        resolve({
          text: output,
          format: "plain",
          streaming: true,
          exitCode: code,
        });
      });
    });
  }

  /** Execute a buffered command — collect all output, then return. */
  private async executeBuffered(
    sessionId: string,
    command: string,
    args: string[],
    fullArgs: string[]
  ): Promise<CommandResult & { exitCode: number }> {
    const child = invokeLocusStream(fullArgs);
    const trackingId = this.tracker.track(sessionId, command, args, child);

    let output = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    return new Promise((resolve) => {
      child.on("close", (exitCode) => {
        this.tracker.untrack(sessionId, trackingId);
        const code = exitCode ?? 0;

        resolve({
          text: output,
          format: "plain",
          exitCode: code,
        });
      });
    });
  }
}

// ─── Formatting Helpers ────────────────────────────────────────────────────

/** Format a conflict message (plain text, platform-agnostic). */
function formatConflictText(
  blockedCommand: string,
  conflict: ConflictResult
): string {
  const running = conflict.runningCommand;
  const runningLabel = `/${running.command}${running.args.length ? ` ${running.args.join(" ")}` : ""}`;
  return `/${blockedCommand} cannot start — ${runningLabel} is already running.\n\nSend /cancel to abort it, or wait for it to finish.`;
}

/** Format streaming output text (plain text, platform-agnostic). */
function formatStreamingText(
  command: string,
  output: string,
  isComplete: boolean
): string {
  const status = isComplete ? "[DONE]" : "[RUNNING]";
  const header = `${status} ${command}`;

  if (!output.trim()) {
    return isComplete
      ? `${header}\n\nCompleted.`
      : `${header}\n\nRunning...\n\nSend /cancel to abort`;
  }

  // Take last N lines for streaming display
  const lines = output.trim().split("\n");
  const lastLines = lines.slice(-30).join("\n");

  const hint = isComplete ? "" : "\n\nSend /cancel to abort";
  return `${header}\n\n${lastLines}${hint}`;
}
