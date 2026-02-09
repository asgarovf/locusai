import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

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
    if (!existsSync(this.rootPath)) {
      mkdirSync(this.rootPath, { recursive: true });
    }

    // Determine base branch
    const baseBranch =
      options.baseBranch ?? this.config.baseBranch ?? this.getCurrentBranch();

    this.log(
      `Creating worktree: ${worktreeDir} (branch: ${branch}, base: ${baseBranch})`,
      "info"
    );

    // Create the worktree with a new branch
    this.git(
      `worktree add "${worktreePath}" -b "${branch}" "${baseBranch}"`,
      this.projectPath
    );

    this.log(`Worktree created at ${worktreePath}`, "success");

    return { worktreePath, branch };
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
   * Check if a worktree exists for a given task ID.
   */
  hasWorktreeForTask(taskId: string): boolean {
    return this.listAgentWorktrees().some(
      (wt) => wt.branch.includes(taskId) || wt.path.includes(taskId)
    );
  }

  /**
   * Get the current branch of the main repository.
   */
  private getCurrentBranch(): string {
    return this.git("rev-parse --abbrev-ref HEAD", this.projectPath).trim();
  }

  /**
   * Execute a git command and return stdout.
   */
  private git(args: string, cwd: string): string {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
