import { join } from "node:path";

export const PROVIDER = {
  CLAUDE: "claude",
  CODEX: "codex",
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const DEFAULT_MODEL: Record<Provider, string> = {
  [PROVIDER.CLAUDE]: "opus",
  [PROVIDER.CODEX]: "gpt-5.2-codex",
};

export const LOCUS_CONFIG = {
  dir: ".locus",
  configFile: "config.json",
  indexFile: "codebase-index.json",
  contextFile: "CLAUDE.md",
  artifactsDir: "artifacts",
  documentsDir: "documents",
  agentSkillsDir: ".agent/skills",
  sessionsDir: "sessions",
  reviewsDir: "reviews",
  plansDir: "plans",
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
] as const;

export function getLocusPath(
  projectPath: string,
  fileName: keyof typeof LOCUS_CONFIG
): string {
  if (fileName === "contextFile") {
    return join(projectPath, LOCUS_CONFIG.contextFile);
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
