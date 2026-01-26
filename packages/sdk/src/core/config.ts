import { join } from "node:path";

export const PROVIDERS = {
  CLAUDE: "claude",
  CODEX: "codex",
} as const;

export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export const DEFAULT_MODEL: Record<Provider, string> = {
  [PROVIDERS.CLAUDE]: "sonnet",
  [PROVIDERS.CODEX]: "gpt-5.1-codex-mini",
};

export const LOCUS_CONFIG = {
  dir: ".locus",
  configFile: "config.json",
  indexFile: "codebase-index.json",
  contextFile: "CLAUDE.md",
  artifactsDir: "artifacts",
};

export function getLocusPath(
  projectPath: string,
  fileName: keyof typeof LOCUS_CONFIG
): string {
  if (fileName === "contextFile") {
    return join(projectPath, LOCUS_CONFIG.contextFile);
  }
  return join(projectPath, LOCUS_CONFIG.dir, LOCUS_CONFIG[fileName]);
}
