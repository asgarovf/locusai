import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCUS_CONFIG, LOCUS_SCHEMAS } from "@locusai/sdk/node";
import {
  type AutonomyRule,
  DEFAULT_AUTONOMY_RULES,
  type JobConfig,
  JobSeverity,
  JobType,
} from "@locusai/shared";

export interface TelegramSettings {
  botToken?: string;
  chatId?: number;
  testMode?: boolean;
}

export interface JobsSettings {
  enabled: boolean;
  schedule?: string;
  configs?: Array<Partial<JobConfig> & { type: JobType }>;
}

export interface AutonomySettings {
  rules?: AutonomyRule[];
}

export interface LocusSettings {
  $schema?: string;
  apiKey?: string;
  apiUrl?: string;
  provider?: string;
  model?: string;
  workspaceId?: string;
  telegram?: TelegramSettings;
  jobs?: JobsSettings;
  autonomy?: AutonomySettings;
}

const DEFAULT_SCHEDULE = "0 2 * * *"; // 2 AM nightly

const DEFAULT_JOB_CONFIGS: JobConfig[] = [
  {
    type: JobType.LINT_SCAN,
    schedule: { cronExpression: DEFAULT_SCHEDULE, enabled: true },
    severity: JobSeverity.AUTO_EXECUTE,
    enabled: true,
    options: {},
  },
  {
    type: JobType.DEPENDENCY_CHECK,
    schedule: { cronExpression: DEFAULT_SCHEDULE, enabled: true },
    severity: JobSeverity.AUTO_EXECUTE,
    enabled: true,
    options: {},
  },
  {
    type: JobType.TODO_CLEANUP,
    schedule: { cronExpression: DEFAULT_SCHEDULE, enabled: true },
    severity: JobSeverity.AUTO_EXECUTE,
    enabled: true,
    options: {},
  },
  {
    type: JobType.FLAKY_TEST_DETECTION,
    schedule: { cronExpression: DEFAULT_SCHEDULE, enabled: true },
    severity: JobSeverity.REQUIRE_APPROVAL,
    enabled: true,
    options: {},
  },
];

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

  getJobConfigs(): JobConfig[] {
    const settings = this.load();
    const userConfigs = settings.jobs?.configs ?? [];
    const globalSchedule = settings.jobs?.schedule ?? DEFAULT_SCHEDULE;

    return DEFAULT_JOB_CONFIGS.map((defaultConfig) => {
      const userOverride = userConfigs.find(
        (c) => c.type === defaultConfig.type
      );
      if (!userOverride) {
        return {
          ...defaultConfig,
          schedule: {
            ...defaultConfig.schedule,
            cronExpression: globalSchedule,
          },
        };
      }
      return {
        ...defaultConfig,
        ...userOverride,
        schedule: {
          ...defaultConfig.schedule,
          cronExpression: globalSchedule,
          ...userOverride.schedule,
        },
        options: { ...defaultConfig.options, ...userOverride.options },
      };
    });
  }

  getAutonomyRules(): AutonomyRule[] {
    const settings = this.load();
    const userRules = settings.autonomy?.rules ?? [];

    if (userRules.length === 0) {
      return DEFAULT_AUTONOMY_RULES;
    }

    const ruleMap = new Map(DEFAULT_AUTONOMY_RULES.map((r) => [r.category, r]));
    for (const rule of userRules) {
      ruleMap.set(rule.category, rule);
    }
    return Array.from(ruleMap.values());
  }

  isJobEnabled(jobType: JobType): boolean {
    const settings = this.load();

    // Master toggle — defaults to true when not set
    if (settings.jobs?.enabled === false) {
      return false;
    }

    const configs = this.getJobConfigs();
    const config = configs.find((c) => c.type === jobType);
    return config?.enabled ?? true;
  }
}
