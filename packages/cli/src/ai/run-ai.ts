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
import { createRunnerAsync, createUserManagedSandboxRunner } from "./runner.js";

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
  /** Run the AI agent inside a Docker sandbox for isolation. */
  sandboxed?: boolean;
  /** Name of a user-managed sandbox to exec into (from `locus sandbox`). */
  sandboxName?: string;
  /**
   * Pre-created runner instance to reuse (e.g., a persistent sandboxed runner).
   * When provided, `createRunnerAsync` is skipped and this runner is used directly.
   */
  runner?: AgentRunner;
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

function normalizeErrorMessage(error: string | undefined): string | undefined {
  if (!error) return undefined;
  const trimmed = error.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripAnsi(text: string): string {
  return text.replace(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Standard ANSI escape sequence matcher
    /\u001B\[[0-9;]*[A-Za-z]/g,
    ""
  );
}

function extractErrorFromStructuredLine(line: string): string | undefined {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const candidateValues = [
      parsed.error,
      parsed.message,
      parsed.text,
      typeof parsed.item === "object" && parsed.item
        ? (parsed.item as Record<string, unknown>).error
        : undefined,
      typeof parsed.item === "object" && parsed.item
        ? (parsed.item as Record<string, unknown>).message
        : undefined,
      typeof parsed.item === "object" && parsed.item
        ? (parsed.item as Record<string, unknown>).text
        : undefined,
    ];

    for (const value of candidateValues) {
      if (typeof value !== "string") continue;
      const normalized = normalizeErrorMessage(stripAnsi(value));
      if (normalized) return normalized;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function extractErrorFromOutput(output: string): string | undefined {
  if (!output) return undefined;

  const lines = output.split("\n");
  for (let index = lines.length - 1; index >= 0; index--) {
    const rawLine = lines[index] ?? "";
    const line = normalizeErrorMessage(stripAnsi(rawLine));
    if (!line) continue;

    const structured = extractErrorFromStructuredLine(line);
    if (structured) return structured.slice(0, 500);

    return line.slice(0, 500);
  }

  return undefined;
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

    // Create runner (sandboxed if requested), or reuse a provided one
    if (options.runner) {
      runner = options.runner;
    } else if (options.sandboxed ?? true) {
      if (!options.sandboxName) {
        indicator.stop();
        return {
          success: false,
          output: "",
          error:
            `Sandbox for provider "${resolvedProvider}" is not configured. ` +
            `Run "locus sandbox" and authenticate via "locus sandbox ${resolvedProvider}".`,
          interrupted: false,
          exitCode: 1,
        };
      }
      runner = createUserManagedSandboxRunner(resolvedProvider, options.sandboxName);
    } else {
      runner = await createRunnerAsync(resolvedProvider, false);
    }

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
      verbose: options.verbose,
      activity: options.activity,
      onOutput: (chunk) => {
        if (wasAborted) return;
        if (!hasOutput) {
          hasOutput = true;
          indicator.stop();
          if (!options.silent) process.stdout.write("\n");
        }
        renderer?.push(chunk);
        output += chunk;
      },
      onStatusChange: (message) => {
        indicator.setMessage(message);
      },
      onToolActivity: (() => {
        let lastActivityTime = 0;
        return (summary: string) => {
          if (wasAborted) return;
          const now = Date.now();
          if (now - lastActivityTime >= 2000) {
            lastActivityTime = now;
            indicator.setActivity(summary);
          }
        };
      })(),
    });

    // Stop renderer and indicator
    renderer?.stop();
    indicator.stop();

    // Add spacing after AI output
    if (hasOutput && !wasAborted && renderer) {
      process.stdout.write("\n");
    }

    if (wasAborted) {
      return {
        success: false,
        output,
        error: "Interrupted by user",
        interrupted: true,
        exitCode: result.exitCode,
      };
    }

    const normalizedRunnerError = normalizeErrorMessage(result.error);
    const extractedOutputError = extractErrorFromOutput(result.output);
    const fallbackError = `${runner.name} failed with exit code ${result.exitCode}.`;

    return {
      success: result.success,
      output,
      error: result.success
        ? undefined
        : (normalizedRunnerError ?? extractedOutputError ?? fallbackError),
      interrupted: false,
      exitCode: result.exitCode,
    };
  } catch (e) {
    indicator.stop();
    renderer?.stop();

    const normalizedCaughtError = normalizeErrorMessage(
      e instanceof Error ? e.message : String(e)
    );
    const fallbackError = `${resolvedProvider} runner failed unexpectedly.`;

    return {
      success: false,
      output,
      error: normalizedCaughtError ?? fallbackError,
      interrupted: wasAborted,
      exitCode: 1,
    };
  } finally {
    cleanupInterrupt();
  }
}
