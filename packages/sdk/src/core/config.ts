import { join } from "node:path";

export const PROVIDER = {
  CLAUDE: "claude",
  CODEX: "codex",
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const CLAUDE_MODELS = {
  OPUS: "opus",
  SONNET: "sonnet",
  HAIKU: "haiku",
  OPUS_PLAN: "opusplan",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5-20251001",
} as const;
export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

export const CODEX_MODELS = {
  GPT_5_3_CODEX: "gpt-5.3-codex",
  GPT_5_3_CODEX_SPARK: "gpt-5.3-codex-spark",
  GPT_5_CODEX_MINI: "gpt-5-codex-mini",
  GPT_5_2_CODEX: "gpt-5.2-codex",
} as const;
export type CodexModel = (typeof CODEX_MODELS)[keyof typeof CODEX_MODELS];

export type ModelId = ClaudeModel | CodexModel;

export const PROVIDER_MODELS: Record<Provider, readonly ModelId[]> = {
  [PROVIDER.CLAUDE]: Object.values(CLAUDE_MODELS),
  [PROVIDER.CODEX]: Object.values(CODEX_MODELS),
} as const;

export const DEFAULT_MODEL: Record<Provider, ModelId> = {
  [PROVIDER.CLAUDE]: CLAUDE_MODELS.OPUS,
  [PROVIDER.CODEX]: CODEX_MODELS.GPT_5_3_CODEX,
};

export function isValidModelForProvider(
  provider: Provider,
  model: string
): boolean {
  return (PROVIDER_MODELS[provider] as readonly string[]).includes(model);
}

export function getModelsForProvider(provider: Provider): readonly ModelId[] {
  return PROVIDER_MODELS[provider];
}

export const LOCUS_SCHEMA_BASE_URL = "https://locusai.dev/schemas";

export const LOCUS_SCHEMAS = {
  config: `${LOCUS_SCHEMA_BASE_URL}/config.schema.json`,
  settings: `${LOCUS_SCHEMA_BASE_URL}/settings.schema.json`,
} as const;

export const LOCUS_CONFIG = {
  dir: ".locus",
  configFile: "config.json",
  settingsFile: "settings.json",
  indexFile: "codebase-index.json",
  contextFile: "LOCUS.md",
  learningsFile: "LEARNINGS.md",
  artifactsDir: "artifacts",
  documentsDir: "documents",
  sessionsDir: "sessions",
  reviewsDir: "reviews",
  plansDir: "plans",
  discussionsDir: "discussions",
};

// Patterns to add to .gitignore for locus projects
// Each pattern has a comment explaining its purpose
export const LOCUS_GITIGNORE_PATTERNS = [
  "# Locus AI - Session data (user-specific, can grow large)",
  ".locus/sessions/",
  "",
  "# Locus AI - Artifacts (local-only, user-specific)",
  ".locus/artifacts/",
  "",
  "# Locus AI - Review reports (generated per sprint)",
  ".locus/reviews/",
  "",
  "# Locus AI - Plans (generated per task)",
  ".locus/plans/",
  "",
  "# Locus AI - Discussions (AI discussion sessions)",
  ".locus/discussions/",
  "",
  "# Locus AI - Settings (contains API key, telegram config, etc.)",
  ".locus/settings.json",
  "",
  "# Locus AI - Configuration (contains project context, etc.)",
  ".locus/config.json",
] as const;

export function getLocusPath(
  projectPath: string,
  fileName: keyof typeof LOCUS_CONFIG
): string {
  return join(projectPath, LOCUS_CONFIG.dir, LOCUS_CONFIG[fileName]);
}

/**
 * Gets the artifacts directory path for a specific agent.
 * Artifacts are organized by agent ID to avoid conflicts and improve organization.
 * @param projectPath - The project root path
 * @param agentId - The agent ID (can be full ID or short form)
 * @returns Path to the agent-specific artifacts directory
 */
export function getAgentArtifactsPath(
  projectPath: string,
  agentId: string
): string {
  // Use last 8 characters of agent ID for brevity
  const shortId = agentId.slice(-8);
  return join(
    projectPath,
    LOCUS_CONFIG.dir,
    LOCUS_CONFIG.artifactsDir,
    shortId
  );
}
