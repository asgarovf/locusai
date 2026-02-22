import type {
  AutonomyRule,
  ChangeCategory,
  JobConfig,
  JobType,
  SuggestionType,
} from "@locusai/shared";
import type { LocusClient } from "../index.js";

// ============================================================================
// Context & Result Types
// ============================================================================

export interface JobContext {
  workspaceId: string;
  projectPath: string;
  config: JobConfig;
  autonomyRules: AutonomyRule[];
  client: LocusClient;
}

export interface JobSuggestion {
  type: SuggestionType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface JobResult {
  summary: string;
  suggestions: JobSuggestion[];
  filesChanged: number;
  prUrl?: string;
  errors?: string[];
}

// ============================================================================
// Base Job
// ============================================================================

export abstract class BaseJob {
  abstract readonly type: JobType;
  abstract readonly name: string;

  abstract run(context: JobContext): Promise<JobResult>;

  protected shouldAutoExecute(
    category: ChangeCategory,
    rules: AutonomyRule[]
  ): boolean {
    const rule = rules.find((r) => r.category === category);
    return rule ? rule.autoExecute : false;
  }
}
