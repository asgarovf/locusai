import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import type { LogFn } from "../ai/factory.js";

import {
  type CreateWorktreeOptions,
  type CreateWorktreeResult,
  DEFAULT_WORKTREE_CONFIG,
  type WorktreeConfig,
  type WorktreeInfo,
} from "./worktree-config.js";

/**
 * Manages git worktrees for parallel agent execution.
 * Each agent gets an isolated worktree with a dedicated branch,
 * allowing multiple agents to work on different tasks without conflicts.
 */
export class WorktreeManager {
  private config: WorktreeConfig;
  private projectPath: string;
  private log: LogFn;

  constructor(
    projectPath: string,
    config?: Partial<WorktreeConfig>,
    log?: LogFn
  ) {
    this.projectPath = resolve(projectPath);
    this.config = { ...DEFAULT_WORKTREE_CONFIG, ...config };
    this.log = log ?? ((_msg: string) => undefined);
  }

  /**
   * Get the absolute path to the worktree root directory.
   */
  private get rootPath(): string {
    return join(this.projectPath, this.config.rootDir);
  }

  /**
   * Build the branch name for a task.
   * Format: `agent/<taskId>-<slug>`
   */
  buildBranchName(taskId: string, taskSlug: string): string {
    const sanitized = taskSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    return `${this.config.branchPrefix}/${taskId}-${sanitized}`;
  }

  /**
   * Create a new worktree for an agent task.
   * Creates the branch and worktree directory.
   */
  create(options: CreateWorktreeOptions): CreateWorktreeResult {
    const branch = this.buildBranchName(options.taskId, options.taskSlug);
    const worktreeDir = `${options.agentId}-${options.taskId}`;
    const worktreePath = join(this.rootPath, worktreeDir);

    // Ensure root directory exists
    this.ensureDirectory(this.rootPath, "Worktree root");

    // Determine base branch
    const baseBranch =
      options.baseBranch ?? this.config.baseBranch ?? this.getCurrentBranch();

    // If the base branch doesn't exist locally, fetch from remote.
    // This handles tier merge branches that were created and pushed by the orchestrator.
    if (!this.branchExists(baseBranch)) {
      this.log(
        `Base branch "${baseBranch}" not found locally, fetching from origin`,
        "info"
      );
      try {
        this.gitExec(["fetch", "origin", baseBranch], this.projectPath);
        // Create a local tracking branch
        this.gitExec(
          ["branch", baseBranch, `origin/${baseBranch}`],
          this.projectPath
        );
      } catch {
        this.log(
          `Could not fetch/create local branch for "${baseBranch}", falling back to current branch`,
          "warn"
        );
      }
    }

    this.log(
      `Creating worktree: ${worktreeDir} (branch: ${branch}, base: ${baseBranch})`,
      "info"
    );

    // Clean up stale worktree directory if it exists
    if (existsSync(worktreePath)) {
      this.log(`Removing stale worktree directory: ${worktreePath}`, "warn");
      try {
        this.git(`worktree remove "${worktreePath}" --force`, this.projectPath);
      } catch {
        rmSync(worktreePath, { recursive: true, force: true });
        this.git("worktree prune", this.projectPath);
      }
    }

    // Delete existing branch if it already exists (from a previous run)
    if (this.branchExists(branch)) {
      this.log(`Deleting existing branch: ${branch}`, "warn");
      const branchWorktrees = this.list().filter((wt) => wt.branch === branch);
      for (const wt of branchWorktrees) {
        const worktreePath = resolve(wt.path);
        if (wt.isMain || !this.isManagedWorktreePath(worktreePath)) {
          throw new Error(
            `Branch "${branch}" is checked out at "${worktreePath}". Remove or detach that worktree before retrying.`
          );
        }
        this.log(
          `Removing existing worktree for branch: ${branch} (${worktreePath})`,
          "warn"
        );
        this.remove(worktreePath, false);
      }
      try {
        this.git(`branch -D "${branch}"`, this.projectPath);
      } catch {
        // Branch may be checked out in another worktree; prune first and retry
        this.git("worktree prune", this.projectPath);
        this.git(`branch -D "${branch}"`, this.projectPath);
      }
    }

    const addWorktree = () =>
      this.git(
        `worktree add "${worktreePath}" -b "${branch}" "${baseBranch}"`,
        this.projectPath
      );

    // Create the worktree with a new branch
    try {
      addWorktree();
    } catch (error) {
      if (!this.isMissingDirectoryError(error)) {
        throw error;
      }

      this.log(
        `Worktree creation failed due to missing directories. Retrying after cleanup: ${worktreePath}`,
        "warn"
      );

      this.cleanupFailedWorktree(worktreePath, branch);
      this.ensureDirectory(this.rootPath, "Worktree root");
      addWorktree();
    }

    // Capture the commit hash at creation time for reliable change detection.
    // This hash is used as a fallback when the base branch ref cannot be
    // resolved (e.g. tier merge branches that exist only on remote).
    const baseCommitHash = this.git("rev-parse HEAD", worktreePath).trim();

    this.log(`Worktree created at ${worktreePath} (base: ${baseCommitHash.slice(0, 8)})`, "success");

    return { worktreePath, branch, baseBranch, baseCommitHash };
  }

  /**
   * List all worktrees with metadata.
   * Returns both the main worktree and agent worktrees.
   */
  list(): WorktreeInfo[] {
    const output = this.git("worktree list --porcelain", this.projectPath);
    const worktrees: WorktreeInfo[] = [];

    // Parse porcelain output — each worktree is separated by blank lines
    const blocks = output.trim().split("\n\n");

    for (const block of blocks) {
      if (!block.trim()) continue;

      const lines = block.trim().split("\n");
      let path = "";
      let head = "";
      let branch = "";
      let isMain = false;
      let isPrunable = false;

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          path = line.slice("worktree ".length);
        } else if (line.startsWith("HEAD ")) {
          head = line.slice("HEAD ".length);
        } else if (line.startsWith("branch ")) {
          // branch refs/heads/agent/task-slug -> agent/task-slug
          branch = line.slice("branch ".length).replace("refs/heads/", "");
        } else if (line === "bare" || path === this.projectPath) {
          isMain = true;
        } else if (line === "prunable") {
          isPrunable = true;
        } else if (line === "detached") {
          branch = "(detached)";
        }
      }

      // Mark main worktree
      if (resolve(path) === this.projectPath) {
        isMain = true;
      }

      if (path) {
        worktrees.push({ path, branch, head, isMain, isPrunable });
      }
    }

    return worktrees;
  }

  /**
   * List only agent worktrees (excludes the main worktree).
   */
  listAgentWorktrees(): WorktreeInfo[] {
    return this.list().filter((wt) => !wt.isMain);
  }

  /**
   * Remove a specific worktree by path and optionally delete its branch.
   */
  remove(worktreePath: string, deleteBranch = true): void {
    const absolutePath = resolve(worktreePath);

    // Get branch name before removal
    const worktrees = this.list();
    const worktree = worktrees.find((wt) => resolve(wt.path) === absolutePath);
    const branchToDelete = worktree?.branch;

    this.log(`Removing worktree: ${absolutePath}`, "info");

    // Force remove the worktree
    try {
      this.git(`worktree remove "${absolutePath}" --force`, this.projectPath);
    } catch {
      // If git worktree remove fails, manually clean up
      if (existsSync(absolutePath)) {
        rmSync(absolutePath, { recursive: true, force: true });
      }
      // Prune to clean up git's internal references
      this.git("worktree prune", this.projectPath);
    }

    // Delete the branch if requested
    if (deleteBranch && branchToDelete && !branchToDelete.startsWith("(")) {
      try {
        this.git(`branch -D "${branchToDelete}"`, this.projectPath);
        this.log(`Deleted branch: ${branchToDelete}`, "success");
      } catch {
        this.log(
          `Could not delete branch: ${branchToDelete} (may already be deleted)`,
          "warn"
        );
      }
    }

    this.log("Worktree removed", "success");
  }

  /**
   * Prune stale worktree references (directories that no longer exist).
   */
  prune(): number {
    const before = this.listAgentWorktrees().filter(
      (wt) => wt.isPrunable
    ).length;

    this.git("worktree prune", this.projectPath);

    const after = this.listAgentWorktrees().filter(
      (wt) => wt.isPrunable
    ).length;

    const pruned = before - after;
    if (pruned > 0) {
      this.log(`Pruned ${pruned} stale worktree(s)`, "success");
    }

    return pruned;
  }

  /**
   * Remove all agent worktrees and their branches.
   * Does not touch the main worktree.
   */
  removeAll(): number {
    const agentWorktrees = this.listAgentWorktrees();
    let removed = 0;

    for (const wt of agentWorktrees) {
      try {
        this.remove(wt.path, true);
        removed++;
      } catch {
        this.log(`Failed to remove worktree: ${wt.path}`, "warn");
      }
    }

    // Also clean up the root directory if empty
    if (existsSync(this.rootPath)) {
      try {
        rmSync(this.rootPath, { recursive: true, force: true });
      } catch {
        // Directory may not be empty if some removals failed
      }
    }

    return removed;
  }

  /**
   * Check if a worktree has uncommitted changes.
   */
  hasChanges(worktreePath: string): boolean {
    const status = this.git("status --porcelain", worktreePath).trim();
    return status.length > 0;
  }

  /**
   * Check if a worktree has commits ahead of the base branch.
   * This detects changes that the AI agent committed during execution.
   */
  hasCommitsAhead(worktreePath: string, baseBranch: string): boolean {
    try {
      const count = this.git(
        `rev-list --count "${baseBranch}..HEAD"`,
        worktreePath
      ).trim();
      return Number.parseInt(count, 10) > 0;
    } catch (err) {
      this.log(
        `Could not compare HEAD against base branch "${baseBranch}": ${err instanceof Error ? err.message : String(err)}`,
        "warn"
      );
      return false;
    }
  }

  /**
   * Check if the worktree HEAD differs from a specific commit hash.
   * This is a fallback for when the base branch ref cannot be resolved.
   */
  private hasCommitsAheadOfHash(
    worktreePath: string,
    baseHash: string
  ): boolean {
    try {
      const headHash = this.git("rev-parse HEAD", worktreePath).trim();
      return headHash !== baseHash;
    } catch {
      return false;
    }
  }

  /**
   * Stage all changes and commit in a worktree.
   * Returns the commit hash, or null if there were no changes to commit.
   *
   * When `baseBranch` is provided, also checks for commits already made by
   * the AI agent during execution. If there are no uncommitted changes but
   * the branch has diverged from the base, returns the current HEAD hash
   * without creating a new commit.
   *
   * When `baseCommitHash` is provided as a fallback, it is used if the
   * base branch ref cannot be resolved (common in tier-based execution
   * where merge branches may not be available locally).
   */
  commitChanges(
    worktreePath: string,
    message: string,
    baseBranch?: string,
    baseCommitHash?: string
  ): string | null {
    const hasUncommittedChanges = this.hasChanges(worktreePath);

    if (hasUncommittedChanges) {
      const statusOutput = this.git(
        "status --porcelain",
        worktreePath
      ).trim();
      this.log(
        `Detected uncommitted changes:\n${statusOutput.split("\n").slice(0, 10).join("\n")}${statusOutput.split("\n").length > 10 ? `\n... and ${statusOutput.split("\n").length - 10} more` : ""}`,
        "info"
      );
    }

    if (!hasUncommittedChanges) {
      // Check if the AI agent already committed changes during execution.
      // Try the branch ref first, then fall back to comparing commit hashes.
      if (baseBranch && this.hasCommitsAhead(worktreePath, baseBranch)) {
        const hash = this.git("rev-parse HEAD", worktreePath).trim();
        this.log(
          `Agent already committed changes (${hash.slice(0, 8)}); skipping additional commit`,
          "info"
        );
        return hash;
      }

      if (baseCommitHash && this.hasCommitsAheadOfHash(worktreePath, baseCommitHash)) {
        const hash = this.git("rev-parse HEAD", worktreePath).trim();
        this.log(
          `Agent already committed changes (${hash.slice(0, 8)}, detected via base commit hash); skipping additional commit`,
          "info"
        );
        return hash;
      }

      // Log diagnostic info when no changes detected
      const branch = this.getBranch(worktreePath);
      this.log(
        `No changes detected in worktree (branch: ${branch}, baseBranch: ${baseBranch ?? "none"}, baseCommitHash: ${baseCommitHash?.slice(0, 8) ?? "none"})`,
        "warn"
      );
      return null;
    }

    this.git("add -A", worktreePath);

    const staged = this.git("diff --cached --name-only", worktreePath).trim();
    if (!staged) {
      this.log("All changes were ignored by .gitignore — nothing to commit", "warn");
      return null;
    }

    this.log(`Staging ${staged.split("\n").length} file(s) for commit`, "info");

    this.gitExec(["commit", "-m", message], worktreePath);

    const hash = this.git("rev-parse HEAD", worktreePath).trim();
    this.log(`Committed: ${hash.slice(0, 8)}`, "success");
    return hash;
  }

  /**
   * Push a worktree's branch to a remote.
   * Returns the branch name on success, or throws on failure.
   * Expects the remote to be an HTTPS URL with `gh auth setup-git` configured.
   */
  pushBranch(worktreePath: string, remote = "origin"): string {
    const branch = this.getBranch(worktreePath);
    this.log(`Pushing branch ${branch} to ${remote}`, "info");

    try {
      this.gitExec(["push", "-u", remote, branch], worktreePath);
      this.log(`Pushed ${branch} to ${remote}`, "success");
      return branch;
    } catch (error) {
      if (!this.isNonFastForwardPushError(error)) {
        throw error;
      }

      this.log(
        `Push rejected for ${branch} (non-fast-forward). Retrying with --force-with-lease.`,
        "warn"
      );

      try {
        this.gitExec(["fetch", remote, branch], worktreePath);
      } catch {
        // Best effort fetch for lease state; continue to retry push.
      }

      this.gitExec(
        ["push", "--force-with-lease", "-u", remote, branch],
        worktreePath
      );
      this.log(
        `Pushed ${branch} to ${remote} with --force-with-lease`,
        "success"
      );
      return branch;
    }
  }

  /**
   * Get the current branch checked out in a worktree.
   */
  getBranch(worktreePath: string): string {
    return this.git("rev-parse --abbrev-ref HEAD", worktreePath).trim();
  }

  /**
   * Check if a worktree exists for a given task ID.
   */
  hasWorktreeForTask(taskId: string): boolean {
    return this.listAgentWorktrees().some(
      (wt) => wt.branch.includes(taskId) || wt.path.includes(taskId)
    );
  }

  /**
   * Check if a branch exists locally.
   */
  private branchExists(branchName: string): boolean {
    try {
      this.git(
        `rev-parse --verify "refs/heads/${branchName}"`,
        this.projectPath
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch of the main repository.
   */
  private getCurrentBranch(): string {
    return this.git("rev-parse --abbrev-ref HEAD", this.projectPath).trim();
  }

  /**
   * Check if a worktree path is managed by Locus.
   */
  private isManagedWorktreePath(worktreePath: string): boolean {
    const rootPath = resolve(this.rootPath);
    const candidate = resolve(worktreePath);
    const rootWithSep = rootPath.endsWith(sep) ? rootPath : `${rootPath}${sep}`;
    return candidate.startsWith(rootWithSep);
  }

  private ensureDirectory(dirPath: string, label: string): void {
    if (existsSync(dirPath)) {
      if (!statSync(dirPath).isDirectory()) {
        throw new Error(`${label} exists but is not a directory: ${dirPath}`);
      }
      return;
    }
    mkdirSync(dirPath, { recursive: true });
  }

  private isMissingDirectoryError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("cannot create directory") ||
      message.includes("No such file or directory")
    );
  }

  private cleanupFailedWorktree(worktreePath: string, branch: string): void {
    try {
      this.git(`worktree remove "${worktreePath}" --force`, this.projectPath);
    } catch {
      // Ignore cleanup errors and try manual removal below.
    }

    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }

    try {
      this.git("worktree prune", this.projectPath);
    } catch {
      // Ignore prune errors during retry cleanup.
    }

    if (this.branchExists(branch)) {
      try {
        this.git(`branch -D "${branch}"`, this.projectPath);
      } catch {
        // Branch may be checked out elsewhere; ignore and let retry handle.
      }
    }
  }

  private isNonFastForwardPushError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("non-fast-forward") ||
      message.includes("[rejected]") ||
      message.includes("fetch first")
    );
  }

  /**
   * Execute a git command (string form) and return stdout.
   */
  private git(args: string, cwd: string): string {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  /**
   * Execute a git command with array args (safe from shell injection).
   */
  private gitExec(args: string[], cwd: string): string {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
