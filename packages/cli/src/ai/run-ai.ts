/**
 * Shared AI execution utility with ESC interrupt support.
 * Provides a single entry point for running AI with:
 * - Status indicator (thinking → working)
 * - Stream renderer (markdown formatting)
 * - ESC/Ctrl+C interrupt (abort running execution)
 * - Partial output preservation on interrupt
 */

import { inferProviderFromModel } from "../core/ai-models.js";
import { getStatusIndicator } from "../display/status-indicator.js";
import { StreamRenderer } from "../display/stream-renderer.js";
import { dim, red, yellow } from "../display/terminal.js";
import { listenForInterrupt } from "../repl/input-handler.js";
import type { AgentRunner, RunnerResult } from "../types.js";
import { createRunnerAsync } from "./runner.js";

export interface RunAIOptions {
  /** The prompt to send to the AI. */
  prompt: string;
  /** AI provider name (e.g., "claude"). */
  provider: string;
  /** Model name. */
  model: string;
  /** Working directory for the runner. */
  cwd: string;
  /** Activity label shown in the status indicator. */
  activity?: string;
  /** If true, suppress streaming output to terminal (collect silently). */
  silent?: boolean;
  /** If true, don't listen for ESC interrupts (e.g., non-TTY mode). */
  noInterrupt?: boolean;
  /** Enable verbose output (thinking blocks, tool details). */
  verbose?: boolean;
}

export interface RunAIResult {
  /** Whether the execution completed successfully. */
  success: boolean;
  /** The full output text (may be partial if interrupted). */
  output: string;
  /** Error message, if any. */
  error?: string;
  /** Whether the execution was interrupted by the user. */
  interrupted: boolean;
  /** Exit code from the runner. */
  exitCode: number;
}

/**
 * Run an AI prompt with full terminal UX:
 * - Shows a thinking indicator
 * - Streams output with markdown formatting
 * - Supports ESC/Ctrl+C to interrupt
 * - Preserves partial output on interrupt
 */
export async function runAI(options: RunAIOptions): Promise<RunAIResult> {
  const indicator = getStatusIndicator();
  const renderer = options.silent ? null : new StreamRenderer();

  let output = "";
  let wasAborted = false;
  let runner: AgentRunner | null = null;
  const resolvedProvider =
    inferProviderFromModel(options.model) ||
    (options.provider as "claude" | "codex");

  // Set up abort controller for ESC/Ctrl+C interruption
  const abortController = new AbortController();

  const cleanupInterrupt = options.noInterrupt
    ? () => {
        /* noop when interrupts disabled */
      }
    : listenForInterrupt(
        // First ESC/Ctrl+C: abort the current AI execution
        () => {
          if (wasAborted) return;
          wasAborted = true;
          indicator.stop();
          renderer?.stop();
          process.stderr.write(
            `\r\n${yellow("⚡")} ${dim("Interrupting...")}\r\n`
          );
          abortController.abort();
          if (runner) runner.abort();
        },
        // Second ESC/Ctrl+C within 2s: force exit
        () => {
          indicator.stop();
          renderer?.stop();
          process.stderr.write(`\r\n${red("✗")} ${dim("Force exit.")}\r\n`);
          process.exit(0);
        }
      );

  try {
    // Show thinking indicator
    indicator.start("Thinking...", {
      activity: options.activity,
    });

    // Create runner
    runner = await createRunnerAsync(resolvedProvider);

    // Check availability
    const available = await runner.isAvailable();
    if (!available) {
      indicator.stop();
      return {
        success: false,
        output: "",
        error: `${resolvedProvider} CLI is not installed. Install it and try again.`,
        interrupted: false,
        exitCode: 1,
      };
    }

    // Switch to working state once output starts
    let hasOutput = false;

    // Start streaming renderer
    renderer?.start();

    // Execute with abort signal
    const result: RunnerResult = await runner.execute({
      prompt: options.prompt,
      model: options.model,
      cwd: options.cwd,
      signal: abortController.signal,
      onOutput: (chunk) => {
        if (wasAborted) return;
        if (!hasOutput) {
          hasOutput = true;
          indicator.stop();
        }
        renderer?.push(chunk);
        output += chunk;
      },
    });

    // Stop renderer and indicator
    renderer?.stop();
    indicator.stop();

    if (wasAborted) {
      return {
        success: false,
        output,
        error: "Interrupted by user",
        interrupted: true,
        exitCode: result.exitCode,
      };
    }

    return {
      success: result.success,
      output,
      error: result.error,
      interrupted: false,
      exitCode: result.exitCode,
    };
  } catch (e) {
    indicator.stop();
    renderer?.stop();

    return {
      success: false,
      output,
      error: e instanceof Error ? e.message : String(e),
      interrupted: wasAborted,
      exitCode: 1,
    };
  } finally {
    cleanupInterrupt();
  }
}
