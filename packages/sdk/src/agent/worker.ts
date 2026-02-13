import { type Sprint, type Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import {
  getGhUsername,
  isGhAvailable,
  isGitAvailable,
} from "../git/git-utils.js";
import { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { c } from "../utils/colors.js";
import { GitWorkflow } from "./git-workflow.js";
import { TaskExecutor } from "./task-executor.js";
import type { TaskResult, WorkerConfig } from "./worker-types.js";

// Re-export for backwards compatibility
export type { WorkerConfig } from "./worker-types.js";

/**
 * Main agent worker that claims and executes tasks.
 *
 * Responsibilities:
 * - Claiming tasks from the API via dispatch
 * - Executing tasks using the AI runner
 * - Delegating git operations (worktree, commit, push, PR) to `GitWorkflow`
 * - Reporting task status back to the API
 * - Heartbeat reporting to the orchestrator
 */
export class AgentWorker {
  private client: LocusClient;
  private aiRunner: AiRunner;
  private taskExecutor: TaskExecutor;
  private knowledgeBase: KnowledgeBase;
  private gitWorkflow: GitWorkflow;

  // State
  private maxTasks = 50;
  private tasksCompleted = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentTaskId: string | null = null;
  private currentWorktreePath: string | null = null;
  private postCleanupDelayMs = 5_000;

  constructor(private config: WorkerConfig) {
    const projectPath = config.projectPath || process.cwd();

    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
      retryOptions: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
      },
    });

    const log = this.log.bind(this);

    // Prerequisite checks
    if (config.useWorktrees && !isGitAvailable()) {
      this.log(
        "git is not installed — worktree isolation will not work",
        "error"
      );
      config.useWorktrees = false;
    }

    if (config.autoPush && !isGhAvailable(projectPath)) {
      this.log(
        "GitHub CLI (gh) not available or not authenticated. Branch push can continue, but automatic PR creation may fail until gh is configured. Install from https://cli.github.com/",
        "warn"
      );
    }

    // Resolve GitHub username for co-authorship
    const ghUsername = config.autoPush ? getGhUsername() : null;
    if (ghUsername) {
      this.log(`GitHub user: ${ghUsername}`, "info");
    }

    // Initialize AI runner and task executor
    const provider = config.provider ?? PROVIDER.CLAUDE;
    this.aiRunner = createAiRunner(provider, {
      projectPath,
      model: config.model,
      log,
    });
    this.taskExecutor = new TaskExecutor({
      aiRunner: this.aiRunner,
      projectPath,
      log,
    });

    // Knowledge base always points to the main project for progress updates
    this.knowledgeBase = new KnowledgeBase(projectPath);

    // Git workflow handles worktree, commit, push, and PR creation
    this.gitWorkflow = new GitWorkflow(config, log, ghUsername);

    // Log initialization
    const providerLabel = provider === "codex" ? "Codex" : "Claude";
    this.log(`Using ${providerLabel} CLI for all phases`, "info");

    if (config.useWorktrees) {
      this.log("Per-task worktree isolation enabled", "info");
      if (config.baseBranch) {
        this.log(`Base branch for worktrees: ${config.baseBranch}`, "info");
      }
      if (config.autoPush) {
        this.log(
          "Auto-push enabled: branches will be pushed to remote",
          "info"
        );
      }
    }
  }

  log(message: string, level: "info" | "success" | "warn" | "error" = "info") {
    const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
    const colorFn = {
      info: c.cyan,
      success: c.green,
      warn: c.yellow,
      error: c.red,
    }[level];
    const prefix = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" }[level];

    console.log(
      `${c.dim(`[${timestamp}]`)} ${c.bold(`[${this.config.agentId.slice(-8)}]`)} ${colorFn(`${prefix} ${message}`)}`
    );
  }

  // ---------------------------------------------------------------------------
  // Task dispatch
  // ---------------------------------------------------------------------------

  private async getActiveSprint(): Promise<Sprint | null> {
    try {
      if (this.config.sprintId) {
        return await this.client.sprints.getById(
          this.config.sprintId,
          this.config.workspaceId
        );
      }
      return await this.client.sprints.getActive(this.config.workspaceId);
    } catch (_error) {
      return null;
    }
  }

  private async getNextTask(): Promise<Task | null> {
    const maxRetries = 10;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.workspaces.dispatch(
          this.config.workspaceId,
          this.config.agentId,
          this.config.sprintId
        );
      } catch (error: unknown) {
        const isAxiosError =
          error != null &&
          typeof error === "object" &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response
            ?.status === "number";
        const status = isAxiosError
          ? (error as { response: { status: number } }).response.status
          : 0;

        if (status === 404) {
          this.log("No tasks available in the backlog.", "info");
          return null;
        }

        const msg = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries) {
          this.log(
            `Nothing dispatched (attempt ${attempt}/${maxRetries}): ${msg}. Retrying in 30s...`,
            "warn"
          );
          await new Promise((r) => setTimeout(r, 30_000));
        } else {
          this.log(
            `Nothing dispatched after ${maxRetries} attempts: ${msg}`,
            "warn"
          );
          return null;
        }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Task execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a single task: create worktree -> run AI -> commit -> push -> PR.
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    const { worktreePath, baseBranch, executor } =
      this.gitWorkflow.createTaskWorktree(fullTask, this.taskExecutor);
    this.currentWorktreePath = worktreePath;
    let branchPushed = false;
    let keepBranch = false;
    let preserveWorktree = false;

    try {
      const result = await executor.execute(fullTask);

      let taskBranch: string | null = null;
      let prUrl: string | null = null;
      let prError: string | null = null;
      let noChanges = false;

      if (result.success && worktreePath) {
        const commitResult = this.gitWorkflow.commitAndPush(
          worktreePath,
          fullTask,
          baseBranch ?? undefined
        );
        taskBranch = commitResult.branch;
        branchPushed = commitResult.pushed;
        keepBranch = taskBranch !== null;
        noChanges = Boolean(commitResult.noChanges);

        if (commitResult.pushFailed) {
          preserveWorktree = true;
          prError =
            commitResult.pushError ??
            "Git push failed before PR creation. Please retry manually.";
          this.log(
            `Preserving worktree after push failure: ${worktreePath}`,
            "warn"
          );
        }

        if (branchPushed && taskBranch) {
          const prResult = this.gitWorkflow.createPullRequest(
            fullTask,
            taskBranch,
            result.summary,
            baseBranch ?? undefined
          );
          prUrl = prResult.url;
          prError = prResult.error ?? null;

          if (!prUrl) {
            preserveWorktree = true;
            this.log(
              `Preserving worktree for manual follow-up: ${worktreePath}`,
              "warn"
            );
          }
        } else if (commitResult.skipReason) {
          this.log(`Skipping PR creation: ${commitResult.skipReason}`, "info");
        }
      } else if (result.success && !worktreePath) {
        this.log(
          "Skipping commit/push/PR flow because no task worktree is active.",
          "warn"
        );
      }

      return {
        ...result,
        branch: taskBranch ?? undefined,
        prUrl: prUrl ?? undefined,
        prError: prError ?? undefined,
        noChanges: noChanges || undefined,
      };
    } finally {
      if (preserveWorktree || keepBranch) {
        this.currentWorktreePath = null;
      } else {
        this.gitWorkflow.cleanupWorktree(worktreePath, keepBranch);
        this.currentWorktreePath = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Progress & heartbeat
  // ---------------------------------------------------------------------------

  private updateProgress(task: Task, success: boolean): void {
    try {
      if (success) {
        this.knowledgeBase.updateProgress({
          type: "task_completed",
          title: task.title,
          details: `Agent: ${this.config.agentId.slice(-8)}`,
        });
        this.log(`Updated progress.md: ${task.title}`, "info");
      }
    } catch (err) {
      this.log(
        `Failed to update progress: ${err instanceof Error ? err.message : String(err)}`,
        "warn"
      );
    }
  }

  private startHeartbeat(): void {
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 60_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    this.client.workspaces
      .heartbeat(
        this.config.workspaceId,
        this.config.agentId,
        this.currentTaskId,
        this.currentTaskId ? "WORKING" : "IDLE"
      )
      .catch((err) => {
        this.log(
          `Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn"
        );
      });
  }

  private async delayAfterCleanup(): Promise<void> {
    if (!this.config.useWorktrees || this.postCleanupDelayMs <= 0) return;
    this.log(
      `Waiting ${Math.floor(this.postCleanupDelayMs / 1000)}s after worktree cleanup before next dispatch`,
      "info"
    );
    await new Promise((resolve) =>
      setTimeout(resolve, this.postCleanupDelayMs)
    );
  }

  // ---------------------------------------------------------------------------
  // Main run loop
  // ---------------------------------------------------------------------------

  async run(): Promise<void> {
    this.log(
      `Agent started in ${this.config.projectPath || process.cwd()}`,
      "success"
    );

    const handleShutdown = () => {
      this.log("Received shutdown signal. Aborting...", "warn");
      this.aiRunner.abort();
      this.stopHeartbeat();
      this.gitWorkflow.cleanupWorktree(this.currentWorktreePath, false);
      process.exit(1);
    };

    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);

    this.startHeartbeat();

    const sprint = await this.getActiveSprint();
    if (sprint) {
      this.log(`Active sprint found: ${sprint.name}`, "info");
    } else {
      this.log("No active sprint found.", "warn");
    }

    while (this.tasksCompleted < this.maxTasks) {
      const task = await this.getNextTask();
      if (!task) {
        this.log("No more tasks to process. Exiting.", "info");
        break;
      }

      this.log(`Claimed: ${task.title}`, "success");
      this.currentTaskId = task.id;
      this.sendHeartbeat();

      const result = await this.executeTask(task);

      if (result.success) {
        if (result.noChanges) {
          this.log(
            `Blocked: ${task.title} - execution produced no file changes`,
            "warn"
          );
          await this.client.tasks.update(task.id, this.config.workspaceId, {
            status: TaskStatus.BLOCKED,
            assignedTo: null,
          });
          await this.client.tasks.addComment(task.id, this.config.workspaceId, {
            author: this.config.agentId,
            text: `⚠️ Agent execution finished with no file changes, so no commit/branch/PR was created.\n\n${result.summary}`,
          });
        } else {
          this.log(`Completed: ${task.title}`, "success");

          const updatePayload: Record<string, unknown> = {
            status: TaskStatus.IN_REVIEW,
          };
          if (result.prUrl) {
            updatePayload.prUrl = result.prUrl;
          }

          await this.client.tasks.update(
            task.id,
            this.config.workspaceId,
            updatePayload
          );

          const branchInfo = result.branch
            ? `\n\nBranch: \`${result.branch}\``
            : "";
          const prInfo = result.prUrl ? `\nPR: ${result.prUrl}` : "";
          const prErrorInfo = result.prError
            ? `\nPR automation error: ${result.prError}`
            : "";
          await this.client.tasks.addComment(task.id, this.config.workspaceId, {
            author: this.config.agentId,
            text: `✅ ${result.summary}${branchInfo}${prInfo}${prErrorInfo}`,
          });
          this.tasksCompleted++;

          this.updateProgress(task, true);

          if (result.prUrl) {
            try {
              this.knowledgeBase.updateProgress({
                type: "pr_opened",
                title: task.title,
                details: `PR: ${result.prUrl}`,
              });
            } catch {
              // Non-critical
            }
          }
        }
      } else {
        this.log(`Failed: ${task.title} - ${result.summary}`, "error");
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: TaskStatus.BACKLOG,
          assignedTo: null,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `❌ ${result.summary}`,
        });
      }

      this.currentTaskId = null;
      this.sendHeartbeat();
      await this.delayAfterCleanup();
    }

    this.currentTaskId = null;
    this.stopHeartbeat();
    this.client.workspaces
      .heartbeat(
        this.config.workspaceId,
        this.config.agentId,
        null,
        "COMPLETED"
      )
      .catch(() => {
        // Best-effort final heartbeat
      });

    process.exit(0);
  }
}

// CLI entry point
const workerEntrypoint = process.argv[1]?.split(/[\\/]/).pop();
if (workerEntrypoint === "worker.js" || workerEntrypoint === "worker.ts") {
  process.title = "locus-worker";

  import("./worker-cli.js").then(({ parseWorkerArgs }) => {
    const config = parseWorkerArgs(process.argv);
    const worker = new AgentWorker(config);
    worker.run().catch((err) => {
      console.error("Fatal worker error:", err);
      process.exit(1);
    });
  });
}
