import { existsSync } from "node:fs";
import { join } from "node:path";
import { type AiProvider, LOCUS_CONFIG, PROVIDER } from "@locusai/sdk/node";

/**
 * Check if a project has been initialized with Locus.
 */
export function isProjectInitialized(projectPath: string): boolean {
  const locusDir = join(projectPath, LOCUS_CONFIG.dir);
  const configPath = join(locusDir, LOCUS_CONFIG.configFile);
  return existsSync(locusDir) && existsSync(configPath);
}

/**
 * Resolve and validate AI provider from input string.
 * Returns the provider or throws an error for invalid input.
 */
export function resolveProvider(input?: string): AiProvider {
  if (!input) return PROVIDER.CLAUDE;
  if (input === PROVIDER.CLAUDE || input === PROVIDER.CODEX) return input;
  throw new Error(`Invalid provider '${input}'. Must be 'claude' or 'codex'.`);
}

/**
 * Mask a secret value for display (show first 4 + last 4 chars).
 */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
