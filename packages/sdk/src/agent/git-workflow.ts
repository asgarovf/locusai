import type { Task } from "@locusai/shared";
import type { LogFn } from "../ai/factory.js";
import { createAiRunner } from "../ai/factory.js";
import { PROVIDER } from "../core/config.js";
import { PrService } from "../git/pr-service.js";
import { WorktreeManager } from "../worktree/worktree-manager.js";
import { TaskExecutor } from "./task-executor.js";
import type { CommitPushResult, WorkerConfig } from "./worker-types.js";

/**
 * Handles the git side of task execution:
 * - Creating per-task worktrees
 * - Committing and pushing changes
 * - Creating pull requests
 * - Cleaning up worktrees
 */
export class GitWorkflow {
  private worktreeManager: WorktreeManager | null;
  private prService: PrService | null;

  constructor(
    private config: WorkerConfig,
    private log: LogFn,
    private ghUsername: string | null
  ) {
    const projectPath = config.projectPath || process.cwd();

    this.worktreeManager = config.useWorktrees
      ? new WorktreeManager(projectPath, { cleanupPolicy: "auto" }, log)
      : null;

    this.prService = config.autoPush ? new PrService(projectPath, log) : null;
  }

  /**
   * Create a per-task worktree and return an executor configured for it.
   * Falls back to the default executor if worktrees are disabled.
   */
  createTaskWorktree(
    task: Task,
    defaultExecutor: TaskExecutor
  ): {
    worktreePath: string | null;
    baseBranch: string | null;
    baseCommitHash: string | null;
    executor: TaskExecutor;
  } {
    if (!this.worktreeManager) {
      return {
        worktreePath: null,
        baseBranch: null,
        baseCommitHash: null,
        executor: defaultExecutor,
      };
    }

    const slug = task.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    const result = this.worktreeManager.create({
      taskId: task.id,
      taskSlug: slug,
      agentId: this.config.agentId,
      baseBranch: this.config.baseBranch,
    });

    this.log(
      `Worktree created: ${result.worktreePath} (${result.branch})`,
      "info"
    );

    const provider = this.config.provider ?? PROVIDER.CLAUDE;
    const taskAiRunner = createAiRunner(provider, {
      projectPath: result.worktreePath,
      model: this.config.model,
      log: this.log,
    });

    const taskExecutor = new TaskExecutor({
      aiRunner: taskAiRunner,
      projectPath: result.worktreePath,
      log: this.log,
    });

    return {
      worktreePath: result.worktreePath,
      baseBranch: result.baseBranch,
      baseCommitHash: result.baseCommitHash,
      executor: taskExecutor,
    };
  }

  /**
   * Commit changes in a task worktree and optionally push to remote.
   */
  commitAndPush(
    worktreePath: string,
    task: Task,
    baseBranch?: string,
    baseCommitHash?: string
  ): CommitPushResult {
    if (!this.worktreeManager) {
      return { branch: null, pushed: false, pushFailed: false };
    }

    try {
      const trailers: string[] = [
        `Task-ID: ${task.id}`,
        `Agent: ${this.config.agentId}`,
        "Co-authored-by: LocusAI <agent@locusai.team>",
      ];
      if (this.ghUsername) {
        trailers.push(
          `Co-authored-by: ${this.ghUsername} <${this.ghUsername}@users.noreply.github.com>`
        );
      }
      const commitMessage = `feat(agent): ${task.title}\n\n${trailers.join("\n")}`;
      const hash = this.worktreeManager.commitChanges(
        worktreePath,
        commitMessage,
        baseBranch,
        baseCommitHash
      );

      if (!hash) {
        this.log("No changes to commit for this task", "info");
        return {
          branch: null,
          pushed: false,
          pushFailed: false,
          noChanges: true,
          skipReason: "No changes were committed, so no branch was pushed.",
        };
      }

      const localBranch = this.worktreeManager.getBranch(worktreePath);

      if (this.config.autoPush) {
        try {
          return {
            branch: this.worktreeManager.pushBranch(worktreePath),
            pushed: true,
            pushFailed: false,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.log(`Git push failed: ${errorMessage}`, "error");
          return {
            branch: localBranch,
            pushed: false,
            pushFailed: true,
            pushError: errorMessage,
          };
        }
      }

      this.log("Auto-push disabled; skipping branch push", "info");
      return {
        branch: localBranch,
        pushed: false,
        pushFailed: false,
        skipReason: "Auto-push is disabled, so PR creation was skipped.",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log(`Git commit failed: ${errorMessage}`, "error");
      return {
        branch: null,
        pushed: false,
        pushFailed: true,
        pushError: `Git commit/push failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Create a pull request for a completed task.
   */
  createPullRequest(
    task: Task,
    branch: string,
    summary?: string,
    baseBranch?: string
  ): { url: string | null; error?: string } {
    if (!this.prService) {
      const errorMessage =
        "PR service is not initialized. Enable auto-push to allow PR creation.";
      this.log(`PR creation skipped: ${errorMessage}`, "warn");
      return { url: null, error: errorMessage };
    }

    this.log(`Attempting PR creation from branch: ${branch}`, "info");

    try {
      const result = this.prService.createPr({
        task,
        branch,
        baseBranch,
        agentId: this.config.agentId,
        summary,
      });
      return { url: result.url };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log(`PR creation failed: ${errorMessage}`, "error");
      return { url: null, error: errorMessage };
    }
  }

  /**
   * Clean up a task-specific worktree.
   */
  cleanupWorktree(worktreePath: string | null, keepBranch: boolean): void {
    if (!this.worktreeManager || !worktreePath) return;

    try {
      this.worktreeManager.remove(worktreePath, !keepBranch);
      this.log(
        keepBranch
          ? "Worktree cleaned up (branch preserved)"
          : "Worktree cleaned up",
        "info"
      );
    } catch {
      this.log(`Could not clean up worktree: ${worktreePath}`, "warn");
    }
  }
}
