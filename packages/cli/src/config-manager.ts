import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLocusPath,
  LOCUS_CONFIG,
  LOCUS_GITIGNORE_PATTERNS,
  LOCUS_SCHEMAS,
} from "@locusai/sdk/node";

const LOCUS_GITIGNORE_MARKER = "# Locus AI";

const DEFAULT_CONTEXT_MD = `# Project

## Mission
<!-- Describe your project's core purpose and value proposition -->

## Tech Stack
<!-- List your technologies -->

## Architecture
<!-- Describe your high-level architecture -->

## Key Decisions
<!-- Document important technical decisions and their rationale -->

## Feature Areas
<!-- List your main feature areas and their status -->
`;

const DEFAULT_PROGRESS_MD = `# Project Progress

No sprints started yet.
`;

const LOCUS_MD_TEMPLATE = `## Planning First

Complex tasks must be planned before writing code. Create \`.locus/plans/<task-name>.md\` with: goal, approach, affected files, and acceptance criteria. Delete the planning .md files after the execution.

## Code

- Follow the existing formatter, linter, and code style. Run them before finishing.
- Keep changes minimal and atomic. Separate refactors from behavioral changes.
- No new dependencies without explicit approval.
- Never put raw secrets or credentials in the codebase.

## Avoiding Hallucinated / Slop Code

- Ask before assuming. If requirements are ambiguous, incomplete, or could be interpreted multiple ways, stop and ask clarifying questions rather than guessing.
- Never invent APIs, libraries, functions, or config options.** Only use APIs and methods you can verify exist in the project's dependencies or documentation. If unsure whether something exists, ask or look it up first.
- No placeholder or stub logic unless explicitly requested. Every piece of code you write should be functional and intentional. Do not leave TODO blocks, fake return values, or mock implementations without flagging them clearly.
- Do not generate boilerplate "just in case." Only write code that is directly required by the task. No speculative utilities, unused helpers, or premature abstractions.
- If you're uncertain, say so. State your confidence level. "I believe this is correct but haven't verified X" is always better than silent guessing.
- Read before writing Before modifying a file, read the relevant existing code to match conventions, understand context, and avoid duplicating logic that already exists.
`;

/**
 * Updates or creates .gitignore with locus-specific patterns.
 * If locus patterns already exist, replaces them with the current set.
 * This ensures new patterns (e.g. reviews/, plans/) are added on reinit.
 */
function updateGitignore(projectPath: string): void {
  const gitignorePath = join(projectPath, ".gitignore");
  let content = "";
  const locusBlock = LOCUS_GITIGNORE_PATTERNS.join("\n");

  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");

    if (content.includes(LOCUS_GITIGNORE_MARKER)) {
      // Find the existing locus block and replace it.
      // The block starts at the first "# Locus AI" line and continues
      // through all consecutive comment/pattern lines until a blank line
      // followed by non-locus content or end of file.
      const lines = content.split("\n");
      const startIdx = lines.findIndex((l) =>
        l.includes(LOCUS_GITIGNORE_MARKER)
      );
      let endIdx = startIdx;

      // Walk forward past all lines that are part of the locus block:
      // comment lines starting with "# Locus AI", pattern lines, and empty separator lines
      for (let i = startIdx; i < lines.length; i++) {
        if (
          lines[i].startsWith(LOCUS_GITIGNORE_MARKER) ||
          lines[i].startsWith(".locus") ||
          lines[i].trim() === ""
        ) {
          endIdx = i;
        } else {
          break;
        }
      }

      // Replace the old block with the current patterns
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx + 1);

      content = [...before, locusBlock, ...after].join("\n");
      writeFileSync(gitignorePath, content);
      return;
    }

    // No existing locus block — append
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }

    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  content += `${locusBlock}\n`;
  writeFileSync(gitignorePath, content);
}

export interface LocusProjectConfig {
  $schema?: string;
  version: string;
  createdAt: string;
  projectPath: string;
  workspaceId?: string;
}

export class ConfigManager {
  constructor(private projectPath: string) {}

  async init(version: string): Promise<void> {
    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    const locusConfigPath = getLocusPath(this.projectPath, "configFile");
    // 1. Create .locus directory, subdirectories, and config
    if (!existsSync(locusConfigDir)) {
      mkdirSync(locusConfigDir, { recursive: true });
    }

    // Ensure required subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
      LOCUS_CONFIG.projectDir,
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    }

    // Create initial project knowledge base files
    const contextFilePath = getLocusPath(
      this.projectPath,
      "projectContextFile"
    );
    if (!existsSync(contextFilePath)) {
      writeFileSync(contextFilePath, DEFAULT_CONTEXT_MD);
    }

    const progressFilePath = getLocusPath(
      this.projectPath,
      "projectProgressFile"
    );
    if (!existsSync(progressFilePath)) {
      writeFileSync(progressFilePath, DEFAULT_PROGRESS_MD);
    }

    // Create LOCUS.md agent instructions file
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");
    if (!existsSync(locusMdPath)) {
      writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
    }

    if (!existsSync(locusConfigPath)) {
      const config: LocusProjectConfig = {
        $schema: LOCUS_SCHEMAS.config,
        version,
        createdAt: new Date().toISOString(),
        projectPath: ".",
      };
      writeFileSync(locusConfigPath, JSON.stringify(config, null, 2));
    }

    // 3. Update .gitignore with locus-specific patterns
    updateGitignore(this.projectPath);
  }

  loadConfig(): LocusProjectConfig | null {
    const path = getLocusPath(this.projectPath, "configFile");
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
    return null;
  }

  updateVersion(version: string): void {
    const config = this.loadConfig();
    if (config && config.version !== version) {
      config.version = version;
      this.saveConfig(config);
    }
  }

  /**
   * Reinitialize an existing project to ensure all configuration is up to date.
   * This is a non-destructive operation that:
   * - Updates the version in config.json
   * - Ensures all required directories exist
   * - Updates .gitignore with any missing patterns
   *
   * @returns Object indicating what was updated
   */
  async reinit(version: string): Promise<{
    versionUpdated: boolean;
    previousVersion: string | null;
    directoriesCreated: string[];
    gitignoreUpdated: boolean;
  }> {
    const result = {
      versionUpdated: false,
      previousVersion: null as string | null,
      directoriesCreated: [] as string[],
      gitignoreUpdated: false,
    };

    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");

    // 1. Update version and ensure $schema in config
    const config = this.loadConfig();
    if (config) {
      result.previousVersion = config.version;
      const needsSchemaUpdate = config.$schema !== LOCUS_SCHEMAS.config;
      if (config.version !== version) {
        config.version = version;
        result.versionUpdated = true;
      }
      if (result.versionUpdated || needsSchemaUpdate) {
        this.saveConfig(config);
      }
    }

    // 1b. Ensure $schema in settings.json if it exists
    const settingsPath = join(
      this.projectPath,
      LOCUS_CONFIG.dir,
      LOCUS_CONFIG.settingsFile
    );
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(raw);
      if (settings.$schema !== LOCUS_SCHEMAS.settings) {
        const { $schema: _, ...rest } = settings;
        const ordered = { $schema: LOCUS_SCHEMAS.settings, ...rest };
        writeFileSync(settingsPath, JSON.stringify(ordered, null, 2), "utf-8");
      }
    }

    // 2. Ensure LOCUS.md exists
    if (!existsSync(locusMdPath)) {
      writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
      result.directoriesCreated.push(".locus/LOCUS.md");
    }

    // 3. Ensure .locus directory and subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
      LOCUS_CONFIG.projectDir,
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        result.directoriesCreated.push(`.locus/${subdir}`);
      }
    }

    // 3b. Ensure project knowledge base files exist
    const contextFilePath = getLocusPath(
      this.projectPath,
      "projectContextFile"
    );
    if (!existsSync(contextFilePath)) {
      writeFileSync(contextFilePath, DEFAULT_CONTEXT_MD);
      result.directoriesCreated.push(".locus/project/context.md");
    }

    const progressFilePath = getLocusPath(
      this.projectPath,
      "projectProgressFile"
    );
    if (!existsSync(progressFilePath)) {
      writeFileSync(progressFilePath, DEFAULT_PROGRESS_MD);
      result.directoriesCreated.push(".locus/project/progress.md");
    }

    // 4. Update .gitignore with any missing or outdated patterns
    const gitignorePath = join(this.projectPath, ".gitignore");
    const gitignoreBefore = existsSync(gitignorePath)
      ? readFileSync(gitignorePath, "utf-8")
      : "";

    updateGitignore(this.projectPath);

    const gitignoreAfter = readFileSync(gitignorePath, "utf-8");
    if (gitignoreBefore !== gitignoreAfter) {
      result.gitignoreUpdated = true;
    }

    return result;
  }

  getWorkspaceId(): string | undefined {
    return this.loadConfig()?.workspaceId;
  }

  setWorkspaceId(workspaceId: string): void {
    const config = this.loadConfig();
    if (config) {
      config.workspaceId = workspaceId;
      this.saveConfig(config);
    }
  }

  private saveConfig(config: LocusProjectConfig): void {
    const { $schema: _, ...rest } = config;
    const ordered = { $schema: LOCUS_SCHEMAS.config, ...rest };
    const path = getLocusPath(this.projectPath, "configFile");
    writeFileSync(path, JSON.stringify(ordered, null, 2));
  }
}
