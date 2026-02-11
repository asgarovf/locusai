import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCUS_CONFIG, LOCUS_SCHEMAS } from "@locusai/sdk/node";

export interface TelegramSettings {
  botToken?: string;
  chatId?: number;
  testMode?: boolean;
}

export interface LocusSettings {
  $schema?: string;
  apiKey?: string;
  apiUrl?: string;
  provider?: string;
  model?: string;
  workspaceId?: string;
  telegram?: TelegramSettings;
}

function getSettingsPath(projectPath: string): string {
  return join(projectPath, LOCUS_CONFIG.dir, LOCUS_CONFIG.settingsFile);
}

export class SettingsManager {
  constructor(private projectPath: string) {}

  load(): LocusSettings {
    const settingsPath = getSettingsPath(this.projectPath);
    if (!existsSync(settingsPath)) {
      return {};
    }
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  }

  save(settings: LocusSettings): void {
    const { $schema: _, ...rest } = settings;
    const ordered = { $schema: LOCUS_SCHEMAS.settings, ...rest };
    const settingsPath = getSettingsPath(this.projectPath);
    writeFileSync(settingsPath, JSON.stringify(ordered, null, 2), "utf-8");
  }

  get<K extends keyof LocusSettings>(key: K): LocusSettings[K] {
    return this.load()[key];
  }

  set<K extends keyof LocusSettings>(key: K, value: LocusSettings[K]): void {
    const settings = this.load();
    settings[key] = value;
    this.save(settings);
  }

  remove(): void {
    const settingsPath = getSettingsPath(this.projectPath);
    if (existsSync(settingsPath)) {
      unlinkSync(settingsPath);
    }
  }

  exists(): boolean {
    return existsSync(getSettingsPath(this.projectPath));
  }
}
