import type { AiProvider } from "../ai/runner.js";

export interface WorkerConfig {
  /** Unique identifier for the agent */
  agentId: string;
  /** Unique identifier for the workspace */
  workspaceId: string;
  /** Unique identifier for the sprint */
  sprintId?: string;
  /** Base URL for the API */
  apiBase: string;
  /** Path to the project */
  projectPath: string;
  /** API key */
  apiKey: string;
  /** AI model */
  model?: string;
  /** AI provider */
  provider?: AiProvider;
}

export interface CommitPushResult {
  branch: string | null;
  pushed: boolean;
  pushFailed: boolean;
  pushError?: string;
  skipReason?: string;
  noChanges?: boolean;
}

export interface TaskResult {
  success: boolean;
  summary: string;
  branch?: string;
  noChanges?: boolean;
}
