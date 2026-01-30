import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLocusPath, LOCUS_CONFIG } from "@locusai/sdk/node";
import { DEFAULT_SKILLS } from "./templates/skills";

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
