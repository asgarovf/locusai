import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import { ClaudeRunner } from "./claude-runner.js";
import { CodexRunner } from "./codex-runner.js";
import type { AiProvider, AiRunner } from "./runner.js";

export type LogFn = (
  message: string,
  level?: "info" | "success" | "warn" | "error"
) => void;

export interface AiRunnerConfig {
  projectPath: string;
  model?: string;
  log?: LogFn;
  /** Maximum execution time in milliseconds (default: 30 minutes) */
  timeoutMs?: number;
  /** Reasoning effort level for Codex models (e.g. "low", "medium", "high") */
  reasoningEffort?: string;
}

export function createAiRunner(
  provider: AiProvider | undefined,
  config: AiRunnerConfig
): AiRunner {
  const resolvedProvider = provider ?? PROVIDER.CLAUDE;
  const model = config.model ?? DEFAULT_MODEL[resolvedProvider];

  switch (resolvedProvider) {
    case PROVIDER.CODEX:
      return new CodexRunner(
        config.projectPath,
        model,
        config.log,
        config.timeoutMs,
        config.reasoningEffort ?? "high"
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
