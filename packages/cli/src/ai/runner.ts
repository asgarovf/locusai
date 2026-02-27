/**
 * AI Runner factory — creates the appropriate runner based on provider config.
 */

import type { AgentRunner, AIProvider } from "../types.js";
import { ClaudeRunner } from "./claude.js";
import { SandboxedClaudeRunner } from "./claude-sandbox.js";
import { CodexRunner } from "./codex.js";

/** Create an AI runner for the given provider. */
export function createRunner(
  provider: AIProvider,
  sandboxed?: boolean
): AgentRunner {
  switch (provider) {
    case "claude":
      return sandboxed ? new SandboxedClaudeRunner() : new ClaudeRunner();
    case "codex":
      return new CodexRunner();
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/** Lazily create a runner — avoids import overhead when not needed. */
export async function createRunnerAsync(
  provider: AIProvider,
  sandboxed?: boolean
): Promise<AgentRunner> {
  switch (provider) {
    case "claude":
      return sandboxed ? new SandboxedClaudeRunner() : new ClaudeRunner();
    case "codex":
      return new CodexRunner();
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
