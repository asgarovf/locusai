import {
  DEFAULT_MODEL,
  getModelsForProvider,
  isValidModelForProvider,
  PROVIDER,
} from "../core/config.js";
import { c } from "../utils/colors.js";
import { ClaudeRunner } from "./claude-runner.js";
import { CodexRunner } from "./codex-runner.js";
import type { AiProvider, AiRunner } from "./runner.js";

export type LogFn = (
  message: string,
  level?: "info" | "success" | "warn" | "error"
) => void;

/**
 * Silent no-op logger. Use as default when logging is optional.
 */
export const noopLogger: LogFn = () => {
  // Empty noop logger
};

/**
 * Creates a worker-style logger with timestamps and agent ID prefix.
 * Used by SDK agent workers for structured log output.
 *
 * Output format: `[HH:mm:ss] [agent-id] ℹ message`
 */
export function createWorkerLogger(agentId: string, prefix?: string): LogFn {
  const tag = prefix ? `${prefix}:${agentId.slice(-8)}` : agentId.slice(-8);

  return (
    message: string,
    level: "info" | "success" | "warn" | "error" = "info"
  ) => {
    const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
    const colorFn = {
      info: c.cyan,
      success: c.green,
      warn: c.yellow,
      error: c.red,
    }[level];
    const icon = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" }[level];

    console.log(
      `${c.dim(`[${timestamp}]`)} ${c.bold(`[${tag}]`)} ${colorFn(`${icon} ${message}`)}`
    );
  };
}

export interface AiRunnerConfig {
  projectPath: string;
  model?: string;
  log?: LogFn;
  /** Maximum execution time in milliseconds (default: 30 minutes) */
  timeoutMs?: number;
  /** Reasoning effort level for Codex models (e.g. "low", "medium", "high") */
  reasoningEffort?: string;
  /** Maximum number of agentic turns before stopping (print mode only) */
  maxTurns?: number;
}

export function createAiRunner(
  provider: AiProvider | undefined,
  config: AiRunnerConfig
): AiRunner {
  const resolvedProvider = provider ?? PROVIDER.CLAUDE;
  const model = config.model ?? DEFAULT_MODEL[resolvedProvider];

  // Validate model is compatible with provider
  if (!isValidModelForProvider(resolvedProvider, model)) {
    const validModels = getModelsForProvider(resolvedProvider);
    throw new Error(
      `Model "${model}" is not valid for provider "${resolvedProvider}". ` +
        `Valid models: ${validModels.join(", ")}`
    );
  }

  switch (resolvedProvider) {
    case PROVIDER.CODEX:
      return new CodexRunner(
        config.projectPath,
        model,
        config.log,
        config.reasoningEffort ?? "high",
        config.timeoutMs
      );
    default:
      return new ClaudeRunner(
        config.projectPath,
        model,
        config.log,
        config.timeoutMs
      );
  }
}
