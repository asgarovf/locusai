import { join } from "node:path";

export const DEFAULT_MODEL = "sonnet";

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
