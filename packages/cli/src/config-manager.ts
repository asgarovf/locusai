import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLocusPath,
  LOCUS_CONFIG,
  LOCUS_GITIGNORE_PATTERNS,
} from "@locusai/sdk/node";
import { DEFAULT_SKILLS } from "./templates/skills";

const LOCUS_GITIGNORE_MARKER = "# Locus AI";

/**
 * Updates or creates .gitignore with locus-specific patterns.
 * This function is idempotent - it won't add duplicate entries.
 */
function updateGitignore(projectPath: string): void {
  const gitignorePath = join(projectPath, ".gitignore");
  let content = "";

  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");

    // Check if locus patterns are already present
    if (content.includes(LOCUS_GITIGNORE_MARKER)) {
      return; // Already configured
    }

    // Ensure we have a newline at the end before appending
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }

    // Add an extra newline for separation if file has content
    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  // Append locus patterns
  content += `${LOCUS_GITIGNORE_PATTERNS.join("\n")}\n`;

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
      const template = `# Locus Project Context\n\n# Workflow\n- Run lint and typecheck before completion\n`;
      writeFileSync(claudeMdPath, template);
    }

    // 2. Create .locus directory and config
    if (!existsSync(locusConfigDir)) {
      mkdirSync(locusConfigDir, { recursive: true });
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
      const template = `# Locus Project Context\n\n# Workflow\n- Run lint and typecheck before completion\n`;
      writeFileSync(claudeMdPath, template);
      result.directoriesCreated.push("CLAUDE.md");
    }

    // 3. Ensure .locus directory and subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
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

    // 5. Update .gitignore with any missing patterns
    const gitignorePath = join(this.projectPath, ".gitignore");
    const hadLocusPatterns =
      existsSync(gitignorePath) &&
      readFileSync(gitignorePath, "utf-8").includes(LOCUS_GITIGNORE_MARKER);

    updateGitignore(this.projectPath);

    if (!hadLocusPatterns) {
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
