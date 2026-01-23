import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLocusPath, LOCUS_CONFIG } from "@locusai/sdk/node";

export interface LocusProjectConfig {
  version: string;
  createdAt: string;
  projectPath: string;
}

export class ConfigManager {
  constructor(private projectPath: string) {}

  async init(version: string): Promise<void> {
    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    const locusConfigPath = getLocusPath(this.projectPath, "configFile");
    const claudeMdPath = getLocusPath(this.projectPath, "contextFile");

    // 1. Create CLAUDE.md if it doesn't exist
    if (!existsSync(claudeMdPath)) {
      const template = `# Locus Project Context\n\n`;
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
  }

  loadConfig(): LocusProjectConfig | null {
    const path = getLocusPath(this.projectPath, "configFile");
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
    return null;
  }
}
