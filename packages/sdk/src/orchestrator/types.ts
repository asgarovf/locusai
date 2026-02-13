import type { ChildProcess } from "node:child_process";
import type { AiProvider } from "../ai/runner.js";
import type { WorktreeCleanupPolicy } from "../worktree/worktree-config.js";

export interface AgentConfig {
  id: string;
  maxConcurrentTasks: number;
}

export interface AgentState {
  id: string;
  status: "IDLE" | "WORKING" | "COMPLETED" | "FAILED";
  currentTaskId: string | null;
  tasksCompleted: number;
  tasksFailed: number;
  lastHeartbeat: Date;
  process?: ChildProcess;
  worktreePath?: string;
  worktreeBranch?: string;
}

export interface OrchestratorConfig {
  /** Workspace ID */
  workspaceId: string;
  /** Sprint ID */
  sprintId: string;
  /** API base URL */
  apiBase: string;
  /** Maximum number of iterations to run */
  maxIterations: number;
  /** Path to the project */
  projectPath: string;
  /** API key */
  apiKey: string;
  /** AI model (e.g. opus, sonnet, gpt-5.3-codex.) */
  model?: string;
  /** AI provider (e.g. codex, claude, etc.) */
  provider?: AiProvider;
  /** Number of agents to spawn */
  agentCount?: number;
  /** Whether to use worktrees for each agent */
  useWorktrees?: boolean;
  /** Worktree management */
  worktreeCleanupPolicy?: WorktreeCleanupPolicy;
  /** Whether to push agent branches to remote after committing */
  autoPush?: boolean;
}
