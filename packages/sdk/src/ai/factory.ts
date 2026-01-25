import type { AiProvider, AiRunner } from "./runner.js";
import { ClaudeRunner } from "./claude-runner.js";
import { CodexRunner } from "./codex-runner.js";

export interface AiRunnerConfig {
  projectPath: string;
  model?: string;
}

export function createAiRunner(
  provider: AiProvider | undefined,
  config: AiRunnerConfig
): AiRunner {
  switch (provider) {
    case "codex":
      return new CodexRunner(config.projectPath, config.model);
    default:
      return new ClaudeRunner(config.projectPath, config.model);
  }
}
