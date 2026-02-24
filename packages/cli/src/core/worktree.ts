/**
 * Git worktree lifecycle management — for parallel standalone issue execution.
 * Worktrees are stored in `.locus/worktrees/issue-<N>` with branches `locus/issue-<N>`.
 *
 * IMPORTANT: Worktrees are ONLY used for standalone (non-sprint) issues.
 * Sprint tasks always run sequentially on a single branch.
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { getLogger } from "./logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorktreeInfo {
  issueNumber: number;
  path: string;
  branch: string;
  status: "active" | "stale";
}

// ─── Git Helpers ─────────────────────────────────────────────────────────────

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function gitSafe(args: string, cwd: string): string | null {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

// ─── Path Helpers ────────────────────────────────────────────────────────────

/** Get the worktree directory for the project. */
function getWorktreeDir(projectRoot: string): string {
  return join(projectRoot, ".locus", "worktrees");
}

/** Get the worktree path for a specific issue. */
export function getWorktreePath(
  projectRoot: string,
  issueNumber: number
): string {
  return join(getWorktreeDir(projectRoot), `issue-${issueNumber}`);
}

/** Get the branch name for a worktree issue. */
function getBranchName(issueNumber: number): string {
  return `locus/issue-${issueNumber}`;
}

// ─── Worktree Lifecycle ──────────────────────────────────────────────────────

/**
 * Create a new git worktree for an issue.
 * Creates `.locus/worktrees/issue-<N>` with branch `locus/issue-<N>` based on `baseBranch`.
 */
export function createWorktree(
  projectRoot: string,
  issueNumber: number,
  baseBranch: string
): WorktreeInfo {
  const log = getLogger();
  const worktreePath = getWorktreePath(projectRoot, issueNumber);
  const branch = getBranchName(issueNumber);

  // If worktree already exists, return it
  if (existsSync(worktreePath)) {
    log.verbose(`Worktree already exists for issue #${issueNumber}`);
    return {
      issueNumber,
      path: worktreePath,
      branch,
      status: "active",
    };
  }

  // Delete the branch if it already exists (leftover from a previous run)
  gitSafe(`branch -D ${branch}`, projectRoot);

  // Create the worktree with a new branch based on baseBranch
  git(
    `worktree add ${JSON.stringify(worktreePath)} -b ${branch} ${baseBranch}`,
    projectRoot
  );

  log.info(`Created worktree for issue #${issueNumber}`, {
    path: worktreePath,
    branch,
    baseBranch,
  });

  return {
    issueNumber,
    path: worktreePath,
    branch,
    status: "active",
  };
}

/**
 * Remove a worktree for an issue.
 * Cleans up both the worktree directory and the branch.
 */
export function removeWorktree(projectRoot: string, issueNumber: number): void {
  const log = getLogger();
  const worktreePath = getWorktreePath(projectRoot, issueNumber);
  const branch = getBranchName(issueNumber);

  if (!existsSync(worktreePath)) {
    log.verbose(`Worktree for issue #${issueNumber} does not exist`);
    return;
  }

  // Remove the worktree
  try {
    git(`worktree remove ${JSON.stringify(worktreePath)} --force`, projectRoot);
    log.info(`Removed worktree for issue #${issueNumber}`);
  } catch (e) {
    log.warn(`Failed to remove worktree: ${e}`);
    // Try force cleanup
    gitSafe(
      `worktree remove ${JSON.stringify(worktreePath)} --force`,
      projectRoot
    );
  }

  // Clean up the branch
  gitSafe(`branch -D ${branch}`, projectRoot);
}

/**
 * List all active worktrees managed by Locus.
 */
export function listWorktrees(projectRoot: string): WorktreeInfo[] {
  const log = getLogger();
  const worktreeDir = getWorktreeDir(projectRoot);

  if (!existsSync(worktreeDir)) {
    return [];
  }

  // Read worktree directories
  const entries = readdirSync(worktreeDir).filter((entry) =>
    entry.startsWith("issue-")
  );

  // Parse git worktree list for status verification
  const gitWorktreeList = gitSafe("worktree list --porcelain", projectRoot);
  const activeWorktrees = new Set<string>();

  if (gitWorktreeList) {
    for (const line of gitWorktreeList.split("\n")) {
      if (line.startsWith("worktree ")) {
        activeWorktrees.add(line.replace("worktree ", "").trim());
      }
    }
  }

  const worktrees: WorktreeInfo[] = [];

  for (const entry of entries) {
    const match = entry.match(/^issue-(\d+)$/);
    if (!match) continue;

    const issueNumber = Number.parseInt(match[1], 10);
    const path = join(worktreeDir, entry);
    const branch = getBranchName(issueNumber);

    // Check if git recognizes it as an active worktree
    // Use realpathSync to handle macOS /var → /private/var symlinks
    let resolvedPath: string;
    try {
      resolvedPath = realpathSync(path);
    } catch {
      resolvedPath = path;
    }
    const isActive =
      activeWorktrees.has(path) || activeWorktrees.has(resolvedPath);

    worktrees.push({
      issueNumber,
      path,
      branch,
      status: isActive ? "active" : "stale",
    });
  }

  log.debug(`Found ${worktrees.length} worktrees`, {
    active: worktrees.filter((w) => w.status === "active").length,
    stale: worktrees.filter((w) => w.status === "stale").length,
  });

  return worktrees;
}

/**
 * Clean up stale worktrees — those that exist on disk but are no longer
 * recognized by git, or whose issues are already closed/merged.
 */
export function cleanupStaleWorktrees(projectRoot: string): number {
  const log = getLogger();
  const worktrees = listWorktrees(projectRoot);
  let cleaned = 0;

  for (const wt of worktrees) {
    if (wt.status === "stale") {
      log.info(`Cleaning up stale worktree for issue #${wt.issueNumber}`);
      removeWorktree(projectRoot, wt.issueNumber);
      cleaned++;
    }
  }

  // Also prune git's worktree records
  if (cleaned > 0) {
    gitSafe("worktree prune", projectRoot);
  }

  return cleaned;
}

/**
 * Push a worktree branch to origin and return the branch name.
 */
export function pushWorktreeBranch(
  projectRoot: string,
  issueNumber: number
): string {
  const worktreePath = getWorktreePath(projectRoot, issueNumber);
  const branch = getBranchName(issueNumber);

  if (!existsSync(worktreePath)) {
    throw new Error(`Worktree for issue #${issueNumber} does not exist`);
  }

  git(`push -u origin ${branch}`, worktreePath);
  return branch;
}

/**
 * Check if there are uncommitted changes in a worktree.
 */
export function hasWorktreeChanges(
  projectRoot: string,
  issueNumber: number
): boolean {
  const worktreePath = getWorktreePath(projectRoot, issueNumber);
  if (!existsSync(worktreePath)) return false;

  const status = gitSafe("status --porcelain", worktreePath);
  return status !== null && status.trim().length > 0;
}

/**
 * Get the age of a worktree in milliseconds.
 */
export function getWorktreeAge(
  projectRoot: string,
  issueNumber: number
): number {
  const worktreePath = getWorktreePath(projectRoot, issueNumber);
  if (!existsSync(worktreePath)) return 0;

  try {
    const stat = statSync(worktreePath);
    return Date.now() - stat.ctimeMs;
  } catch {
    return 0;
  }
}
