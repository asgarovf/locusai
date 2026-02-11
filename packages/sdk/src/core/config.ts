import { join } from "node:path";

export const PROVIDER = {
  CLAUDE: "claude",
  CODEX: "codex",
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const DEFAULT_MODEL: Record<Provider, string> = {
  [PROVIDER.CLAUDE]: "opus",
  [PROVIDER.CODEX]: "gpt-5.3-codex",
};

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
  artifactsDir: "artifacts",
  documentsDir: "documents",
  sessionsDir: "sessions",
  reviewsDir: "reviews",
  plansDir: "plans",
  projectDir: "project",
  projectContextFile: "context.md",
  projectProgressFile: "progress.md",
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
  "# Locus AI - Agent worktrees (parallel execution)",
  ".locus-worktrees/",
  "",
  "# Locus AI - Settings (contains API key, telegram config, etc.)",
  ".locus/settings.json",
  "",
  "# Locus AI - Configuration (contains project context, progress, etc.)",
  ".locus/config.json",
  "",
  "# Locus AI - Project progress (contains project progress, etc.)",
  ".locus/project/progress.md",
] as const;

export function getLocusPath(
  projectPath: string,
  fileName: keyof typeof LOCUS_CONFIG
): string {
  // Project knowledge base files live under .locus/project/
  if (fileName === "projectContextFile" || fileName === "projectProgressFile") {
    return join(
      projectPath,
      LOCUS_CONFIG.dir,
      LOCUS_CONFIG.projectDir,
      LOCUS_CONFIG[fileName]
    );
  }
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
