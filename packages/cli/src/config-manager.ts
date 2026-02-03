import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLocusPath,
  LOCUS_CONFIG,
  LOCUS_GITIGNORE_PATTERNS,
} from "@locusai/sdk/node";
import { DEFAULT_SKILLS } from "./templates/skills";

const LOCUS_GITIGNORE_MARKER = "# Locus AI";

const CLAUDE_MD_TEMPLATE = `# CLAUDE.md

## Planning First

Every task must be planned before writing code. Create \`.locus/plans/<task-name>.md\` with: goal, approach, affected files, and acceptance criteria. Update the plan if the approach changes. Mark complete when done.

## Code

- Follow the existing formatter, linter, and code style. Run them before finishing.
- Keep changes minimal and atomic. Separate refactors from behavioral changes.
- No new dependencies without explicit approval.
- Never put raw secrets or credentials in the codebase.

## Testing

- Every behavioral change needs a test. Bug fixes need a regression test.
- Run the relevant test suite before marking work complete.
- Don't modify tests just to make them pass — understand why they fail.

## Communication

- If the plan needs to change, update it and explain why before continuing.
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
      const startIdx = lines.findIndex((l) => l.includes(LOCUS_GITIGNORE_MARKER));
      let endIdx = startIdx;

      // Walk forward past all lines that are part of the locus block:
      // comment lines starting with "# Locus AI", pattern lines, and empty separator lines
      for (let i = startIdx; i < lines.length; i++) {
        if (
          lines[i].startsWith(LOCUS_GITIGNORE_MARKER) ||
          lines[i].startsWith(".locus/") ||
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
    const claudeMdPath = getLocusPath(this.projectPath, "contextFile");

    // 1. Create CLAUDE.md if it doesn't exist
    if (!existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, CLAUDE_MD_TEMPLATE);
    }

    // 2. Create .locus directory, subdirectories, and config
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
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    }

    if (!existsSync(locusConfigPath)) {
      const config: LocusProjectConfig = {
        version,
        createdAt: new Date().toISOString(),
        projectPath: ".",
      };
      writeFileSync(locusConfigPath, JSON.stringify(config, null, 2));
    }

    // 3. Create skills directories and default skills (non-destructive)
    const skillLocations = [
      LOCUS_CONFIG.agentSkillsDir, // .agent/skills
      ".cursor/skills",
      ".claude/skills",
      ".codex/skills",
      ".gemini/skills",
    ];

    for (const location of skillLocations) {
      const skillsDir = join(this.projectPath, location);
      if (!existsSync(skillsDir)) {
        mkdirSync(skillsDir, { recursive: true });
      }

      // Initialize default skills from templates if they don't already exist
      for (const skill of DEFAULT_SKILLS) {
        const skillPath = join(skillsDir, skill.name);
        if (!existsSync(skillPath)) {
          mkdirSync(skillPath, { recursive: true });
          writeFileSync(join(skillPath, "SKILL.md"), skill.content);
        }
      }
    }

    // 4. Update .gitignore with locus-specific patterns
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
   * - Creates any missing default skills
   * - Updates .gitignore with any missing patterns
   *
   * @returns Object indicating what was updated
   */
  async reinit(version: string): Promise<{
    versionUpdated: boolean;
    previousVersion: string | null;
    directoriesCreated: string[];
    skillsCreated: string[];
    gitignoreUpdated: boolean;
  }> {
    const result = {
      versionUpdated: false,
      previousVersion: null as string | null,
      directoriesCreated: [] as string[],
      skillsCreated: [] as string[],
      gitignoreUpdated: false,
    };

    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    const claudeMdPath = getLocusPath(this.projectPath, "contextFile");

    // 1. Update version in config
    const config = this.loadConfig();
    if (config) {
      result.previousVersion = config.version;
      if (config.version !== version) {
        config.version = version;
        this.saveConfig(config);
        result.versionUpdated = true;
      }
    }

    // 2. Ensure CLAUDE.md exists
    if (!existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, CLAUDE_MD_TEMPLATE);
      result.directoriesCreated.push("CLAUDE.md");
    }

    // 3. Ensure .locus directory and subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        result.directoriesCreated.push(`.locus/${subdir}`);
      }
    }

    // 4. Ensure skills directories exist and have default skills
    const skillLocations = [
      LOCUS_CONFIG.agentSkillsDir,
      ".cursor/skills",
      ".claude/skills",
      ".codex/skills",
      ".gemini/skills",
    ];

    for (const location of skillLocations) {
      const skillsDir = join(this.projectPath, location);
      if (!existsSync(skillsDir)) {
        mkdirSync(skillsDir, { recursive: true });
        result.directoriesCreated.push(location);
      }

      // Create missing default skills
      for (const skill of DEFAULT_SKILLS) {
        const skillPath = join(skillsDir, skill.name);
        if (!existsSync(skillPath)) {
          mkdirSync(skillPath, { recursive: true });
          writeFileSync(join(skillPath, "SKILL.md"), skill.content);
          result.skillsCreated.push(`${location}/${skill.name}`);
        }
      }
    }

    // 5. Update .gitignore with any missing or outdated patterns
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
    const path = getLocusPath(this.projectPath, "configFile");
    writeFileSync(path, JSON.stringify(config, null, 2));
  }
}
