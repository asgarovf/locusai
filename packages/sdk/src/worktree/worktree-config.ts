/**
 * Worktree configuration types and constants.
 * Defines the directory layout, branch naming, and cleanup policies
 * for agent worktrees used in parallel task execution.
 */

/** Root directory for all agent worktrees, relative to project root */
export const WORKTREE_ROOT_DIR = ".locus-worktrees";

/** Branch prefix for agent worktrees */
export const WORKTREE_BRANCH_PREFIX = "agent";

/** Cleanup policy for completed worktrees */
export type WorktreeCleanupPolicy = "auto" | "retain-on-failure" | "manual";

/** Configuration for worktree management */
export interface WorktreeConfig {
  /** Root directory for worktrees (default: `.locus-worktrees/`) */
  rootDir: string;
  /** Branch naming prefix (default: `agent`) */
  branchPrefix: string;
  /** Cleanup policy (default: `retain-on-failure`) */
  cleanupPolicy: WorktreeCleanupPolicy;
  /** Base branch to create worktrees from (default: current HEAD) */
  baseBranch?: string;
}

/** Metadata for a single worktree */
export interface WorktreeInfo {
  /** Absolute path to the worktree directory */
  path: string;
  /** Branch name checked out in this worktree */
  branch: string;
  /** HEAD commit hash */
  head: string;
  /** Whether this is the main worktree */
  isMain: boolean;
  /** Whether the worktree directory is missing (prunable) */
  isPrunable: boolean;
}

/** Options for creating a worktree */
export interface CreateWorktreeOptions {
  /** Task ID associated with this worktree */
  taskId: string;
  /** Task slug for branch naming */
  taskSlug: string;
  /** Agent ID that will use this worktree */
  agentId: string;
  /** Base branch to create from (defaults to config.baseBranch or current HEAD) */
  baseBranch?: string;
}

/** Result of creating a worktree */
export interface CreateWorktreeResult {
  /** Absolute path to the created worktree */
  worktreePath: string;
  /** Branch name created */
  branch: string;
  /** Base branch used to create the task branch */
  baseBranch: string;
  /** Commit hash of the base branch at worktree creation time */
  baseCommitHash: string;
}

/** Default worktree configuration */
export const DEFAULT_WORKTREE_CONFIG: WorktreeConfig = {
  rootDir: WORKTREE_ROOT_DIR,
  branchPrefix: WORKTREE_BRANCH_PREFIX,
  cleanupPolicy: "retain-on-failure",
};
