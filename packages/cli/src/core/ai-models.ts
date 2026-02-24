import type { AIProvider } from "../types.js";

export const CLAUDE_MODELS = [
  "opus",
  "sonnet",
  "haiku",
  "opusplan",
  "claude-opus-4-6",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
] as const;

export const CODEX_MODELS = [
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.2-codex",
  "gpt-5.1-codex-max",
  "gpt-5.1-codex",
  "gpt-5.1-codex-mini",
  "gpt-5-codex",
  "codex-mini-latest",
] as const;

const CLAUDE_MODEL_SET = new Set<string>(CLAUDE_MODELS);
const CODEX_MODEL_SET = new Set<string>(CODEX_MODELS);
const ALL_MODEL_SET = new Set<string>([...CLAUDE_MODELS, ...CODEX_MODELS]);

export function inferProviderFromModel(model?: string): AIProvider | undefined {
  if (!model) return undefined;
  const normalized = model.trim().toLowerCase();
  if (!normalized) return undefined;

  if (CLAUDE_MODEL_SET.has(normalized)) return "claude";
  if (CODEX_MODEL_SET.has(normalized)) return "codex";
  if (normalized.startsWith("claude-")) return "claude";
  if (normalized.includes("codex")) return "codex";

  return undefined;
}

export function isKnownModel(model: string): boolean {
  return ALL_MODEL_SET.has(model.trim().toLowerCase());
}
