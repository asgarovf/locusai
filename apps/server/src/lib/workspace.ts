import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export interface LocusConfig {
  repoPath?: string;
  docsPath?: string;
  ciPresetsPath: string;
}

export interface WorkspaceConfig {
  workspaceDir: string;
  repoDir: string;
  configPath: string;
  config: LocusConfig;
  dbPath: string;
}

/**
 * Resolves the workspace directory and loads workspace.config.json
 */
export function resolveWorkspace(
  projectPath: string | undefined
): WorkspaceConfig {
  if (!projectPath) {
    console.error("Usage: bun run dev -- --project <workspaceDir>");
    process.exit(1);
  }

  // Resolve to absolute path
  let workspaceDir = isAbsolute(projectPath)
    ? projectPath
    : join(process.cwd(), projectPath);

  // If path doesn't contain workspace.config.json, check if .locus subdir exists
  let configPath = join(workspaceDir, "workspace.config.json");
  if (!existsSync(configPath)) {
    const locusSubdir = join(workspaceDir, ".locus");
    const locusConfigPath = join(locusSubdir, "workspace.config.json");
    if (existsSync(locusConfigPath)) {
      workspaceDir = locusSubdir;
      configPath = locusConfigPath;
    } else {
      console.error(
        `Error: workspace.config.json not found in ${workspaceDir} or ${locusSubdir}`
      );
      process.exit(1);
    }
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8")) as LocusConfig;
  const dbPath = join(workspaceDir, "locus.db");

  // repoDir is config.repoPath, or the original project path,
  // or the parent of .locus if we moved into it
  const repoDir = isAbsolute(config.repoPath || "")
    ? (config.repoPath as string)
    : config.repoPath
      ? join(workspaceDir, config.repoPath)
      : workspaceDir.endsWith(".locus")
        ? join(workspaceDir, "..")
        : workspaceDir;

  return {
    workspaceDir,
    repoDir,
    configPath,
    config,
    dbPath,
  };
}
