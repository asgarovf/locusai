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
  /** When running in a worktree, this is the path to the main repo for progress updates */
  mainProjectPath?: string;
  /** Whether to use per-task worktrees for isolation */
  useWorktrees?: boolean;
  /** Whether to push branches to remote after committing */
  autoPush?: boolean;
  /** Base branch for worktree creation and PR targeting (set by orchestrator for tier-based execution) */
  baseBranch?: string;
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
  prUrl?: string;
  prError?: string;
  noChanges?: boolean;
}
