import type { AiProvider, AiRunner } from "./runner.js";
import { ClaudeRunner } from "./claude-runner.js";
import { CodexRunner } from "./codex-runner.js";
import { DEFAULT_MODEL, PROVIDERS } from "../core/config.js";

export interface AiRunnerConfig {
  projectPath: string;
  model?: string;
}

export function createAiRunner(
  provider: AiProvider | undefined,
  config: AiRunnerConfig
): AiRunner {
  const resolvedProvider = provider ?? PROVIDERS.CLAUDE;
  const model = config.model ?? DEFAULT_MODEL[resolvedProvider];

  switch (resolvedProvider) {
    case PROVIDERS.CODEX:
      return new CodexRunner(config.projectPath, model);
    default:
      return new ClaudeRunner(config.projectPath, model);
  }
}
