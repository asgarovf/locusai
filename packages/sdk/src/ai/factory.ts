import { DEFAULT_MODEL, PROVIDERS } from "../core/config.js";
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
}

export function createAiRunner(
  provider: AiProvider | undefined,
  config: AiRunnerConfig
): AiRunner {
  const resolvedProvider = provider ?? PROVIDERS.CLAUDE;
  const model = config.model ?? DEFAULT_MODEL[resolvedProvider];

  switch (resolvedProvider) {
    case PROVIDERS.CODEX:
      return new CodexRunner(config.projectPath, model, config.log);
    default:
      return new ClaudeRunner(config.projectPath, model);
  }
}
