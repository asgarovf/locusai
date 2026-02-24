import { updateConfigValue } from "../core/config.js";
import type { LocusConfig } from "../types.js";

/**
 * Persist REPL model selection to project config and keep in-memory config in sync.
 */
export function persistReplModelSelection(
  projectRoot: string,
  config: LocusConfig,
  model: string
): void {
  const updated = updateConfigValue(projectRoot, "ai.model", model);
  config.ai.model = updated.ai.model;
  config.ai.provider = updated.ai.provider;
}
