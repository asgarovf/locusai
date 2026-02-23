import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLocusPath, LOCUS_CONFIG, LOCUS_SCHEMAS } from "@locusai/sdk/node";
import { ensureGitIdentity, updateGitignore } from "./git-helpers.js";
import { DEFAULT_LEARNINGS_MD, LOCUS_MD_TEMPLATE } from "./templates.js";

export interface LocusProjectConfig {
  $schema?: string;
  version: string;
  createdAt: string;
  projectPath: string;
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
      LOCUS_CONFIG.discussionsDir,
    ];

    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    }

    // Create LOCUS.md agent instructions file
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");
    if (!existsSync(locusMdPath)) {
      writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
    }

    // Create LEARNINGS.md for continuous learning
    const learningsMdPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsMdPath)) {
      writeFileSync(learningsMdPath, DEFAULT_LEARNINGS_MD);
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

    // 4. Ensure git identity is configured for commits
    ensureGitIdentity(this.projectPath);
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

    // 2. Update LOCUS.md with the latest template on every reinit
    const locusMdPath = getLocusPath(this.projectPath, "contextFile");
    const locusMdExisted = existsSync(locusMdPath);

    writeFileSync(locusMdPath, LOCUS_MD_TEMPLATE);
    if (!locusMdExisted) {
      result.directoriesCreated.push(".locus/LOCUS.md");
    }

    // 3. Ensure .locus directory and subdirectories exist
    const locusSubdirs = [
      LOCUS_CONFIG.artifactsDir,
      LOCUS_CONFIG.documentsDir,
      LOCUS_CONFIG.sessionsDir,
      LOCUS_CONFIG.reviewsDir,
      LOCUS_CONFIG.plansDir,
      LOCUS_CONFIG.discussionsDir,
    ];

    const locusConfigDir = join(this.projectPath, LOCUS_CONFIG.dir);
    for (const subdir of locusSubdirs) {
      const subdirPath = join(locusConfigDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
        result.directoriesCreated.push(`.locus/${subdir}`);
      }
    }

    // 3. Ensure LEARNINGS.md exists (non-destructive — never overwrite)
    const learningsMdPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsMdPath)) {
      writeFileSync(learningsMdPath, DEFAULT_LEARNINGS_MD);
      result.directoriesCreated.push(".locus/LEARNINGS.md");
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

    // 5. Ensure git identity is configured for commits
    ensureGitIdentity(this.projectPath);

    return result;
  }

  private saveConfig(config: LocusProjectConfig): void {
    const { $schema: _, ...rest } = config;
    const ordered = { $schema: LOCUS_SCHEMAS.config, ...rest };
    const path = getLocusPath(this.projectPath, "configFile");
    writeFileSync(path, JSON.stringify(ordered, null, 2));
  }
}
