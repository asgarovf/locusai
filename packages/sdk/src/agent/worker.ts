import { Sprint, Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiProvider, AiRunner } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import {
  getGhUsername,
  isGhAvailable,
  isGitAvailable,
} from "../git/git-utils.js";
import { PrService } from "../git/pr-service.js";
import { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { c } from "../utils/colors.js";
import { WorktreeManager } from "../worktree/worktree-manager.js";
import { TaskExecutor } from "./task-executor.js";

function resolveProvider(value: string | undefined): AiProvider {
  if (!value || value.startsWith("--")) {
    console.warn(
      "Warning: --provider requires a value. Falling back to 'claude'."
    );
    return PROVIDER.CLAUDE;
  }
  if (value === PROVIDER.CLAUDE || value === PROVIDER.CODEX) return value;
  console.warn(
    `Warning: invalid --provider value '${value}'. Falling back to 'claude'.`
  );
  return PROVIDER.CLAUDE;
}

export interface WorkerConfig {
  agentId: string;
  workspaceId: string;
  sprintId?: string;
  apiBase: string;
  projectPath: string;
  apiKey: string;
  model?: string;
  provider?: AiProvider;
  /** When running in a worktree, this is the path to the main repo for progress updates */
  mainProjectPath?: string;
  /** Whether to use per-task worktrees for isolation */
  useWorktrees?: boolean;
  /** Whether to push branches to remote after committing */
  autoPush?: boolean;
}

interface CommitPushResult {
  branch: string | null;
  pushed: boolean;
  pushFailed: boolean;
  pushError?: string;
  skipReason?: string;
  noChanges?: boolean;
}

/**
 * Main agent worker that orchestrates task execution
 * Delegates responsibilities to specialized services
 */
export class AgentWorker {
  private client: LocusClient;
  private aiRunner: AiRunner;

  // Services
  private taskExecutor: TaskExecutor;
  private knowledgeBase: KnowledgeBase;
  private worktreeManager: WorktreeManager | null = null;
  private prService: PrService | null = null;

  // State
  private maxTasks = 50;
  private tasksCompleted = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentTaskId: string | null = null;
  private currentWorktreePath: string | null = null;
  private postCleanupDelayMs = 5_000;
  /** Cached GitHub username for co-authorship in commits */
  private ghUsername: string | null = null;

  constructor(private config: WorkerConfig) {
    const projectPath = config.projectPath || process.cwd();

    // Initialize API client
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
    if (config.autoPush) {
      this.ghUsername = getGhUsername();
      if (this.ghUsername) {
        this.log(`GitHub user: ${this.ghUsername}`, "info");
      }
    }

    // Initialize AI clients
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

    // Initialize worktree manager for per-task isolation
    if (config.useWorktrees) {
      this.worktreeManager = new WorktreeManager(projectPath, {
        cleanupPolicy: "auto",
      });
    }

    // Initialize PR service when auto-push is enabled
    if (config.autoPush) {
      this.prService = new PrService(projectPath, log);
    }

    // Log initialization
    const providerLabel = provider === "codex" ? "Codex" : "Claude";
    this.log(`Using ${providerLabel} CLI for all phases`, "info");

    if (config.useWorktrees) {
      this.log("Per-task worktree isolation enabled", "info");
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
        const task = await this.client.workspaces.dispatch(
          this.config.workspaceId,
          this.config.agentId,
          this.config.sprintId
        );
        return task;
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

        // 404 = genuinely no tasks available — stop immediately
        if (status === 404) {
          this.log("No tasks available in the backlog.", "info");
          return null;
        }

        // Other errors (500, network, etc) — retry
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

  /**
   * Create a task-specific worktree and return an executor configured for it.
   * Falls back to the main project path if worktrees are disabled.
   */
  private createTaskWorktree(task: Task): {
    worktreePath: string | null;
    baseBranch: string | null;
    executor: TaskExecutor;
  } {
    if (!this.worktreeManager) {
      return {
        worktreePath: null,
        baseBranch: null,
        executor: this.taskExecutor,
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
    });

    this.log(
      `Worktree created: ${result.worktreePath} (${result.branch})`,
      "info"
    );

    const log = this.log.bind(this);
    const provider = this.config.provider ?? PROVIDER.CLAUDE;

    // Create a task-specific AI runner and executor targeting the worktree
    const taskAiRunner = createAiRunner(provider, {
      projectPath: result.worktreePath,
      model: this.config.model,
      log,
    });

    const taskExecutor = new TaskExecutor({
      aiRunner: taskAiRunner,
      projectPath: result.worktreePath,
      log,
    });

    return {
      worktreePath: result.worktreePath,
      baseBranch: result.baseBranch,
      executor: taskExecutor,
    };
  }

  /**
   * Commit changes in a task worktree and optionally push to remote.
   * Distinguishes "no commit", "push failed", and "branch pushed" outcomes.
   */
  private commitAndPushWorktree(
    worktreePath: string,
    task: Task
  ): CommitPushResult {
    if (!this.worktreeManager) {
      return { branch: null, pushed: false, pushFailed: false };
    }

    try {
      const trailers: string[] = [
        `Task-ID: ${task.id}`,
        `Agent: ${this.config.agentId}`,
        "Co-authored-by: LocusAI <noreply@locusai.dev>",
      ];
      if (this.ghUsername) {
        trailers.push(
          `Co-authored-by: ${this.ghUsername} <${this.ghUsername}@users.noreply.github.com>`
        );
      }
      const commitMessage = `feat(agent): ${task.title}\n\n${trailers.join("\n")}`;
      const hash = this.worktreeManager.commitChanges(
        worktreePath,
        commitMessage
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
      return { branch: null, pushed: false, pushFailed: false };
    }
  }

  /**
   * Create a pull request for a completed task.
   * Returns the PR URL if successful, null otherwise.
   */
  private createPullRequest(
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
   * Keep the branch if a commit was created so follow-up is possible.
   */
  private cleanupTaskWorktree(
    worktreePath: string | null,
    keepBranch: boolean
  ): void {
    if (!this.worktreeManager || !worktreePath) return;

    try {
      // If the task produced a commit, keep the branch for follow-up.
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

    this.currentWorktreePath = null;
  }

  private async executeTask(task: Task): Promise<{
    success: boolean;
    summary: string;
    branch?: string;
    prUrl?: string;
    prError?: string;
    noChanges?: boolean;
  }> {
    // Fetch full task details to get comments/feedback
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    // Create per-task worktree for isolation
    const { worktreePath, baseBranch, executor } =
      this.createTaskWorktree(fullTask);
    this.currentWorktreePath = worktreePath;
    let branchPushed = false;
    let keepBranch = false;
    let preserveWorktree = false;

    try {
      // Execute the task in the worktree (or main project if worktrees disabled)
      const result = await executor.execute(fullTask);

      // Commit and optionally push changes before cleanup
      let taskBranch: string | null = null;
      let prUrl: string | null = null;
      let prError: string | null = null;
      let noChanges = false;
      if (result.success && worktreePath) {
        const commitResult = this.commitAndPushWorktree(worktreePath, fullTask);
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

        // Create PR if branch was pushed
        if (branchPushed && taskBranch) {
          const prResult = this.createPullRequest(
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
      if (preserveWorktree) {
        this.currentWorktreePath = null;
      } else {
        // Clean up the task worktree after execution
        this.cleanupTaskWorktree(worktreePath, keepBranch);
      }
    }
  }

  /**
   * Update progress.md in the main project after task completion
   */
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

  /**
   * Start sending periodic heartbeats to the API so the server
   * knows this agent is alive and which task it's working on.
   */
  private startHeartbeat(): void {
    // Send initial heartbeat immediately
    this.sendHeartbeat();

    // Then send every 60 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 60_000);
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

  async run(): Promise<void> {
    this.log(
      `Agent started in ${this.config.projectPath || process.cwd()}`,
      "success"
    );

    // Handle graceful shutdown - abort AI runner to kill Claude/Codex CLI processes
    const handleShutdown = () => {
      this.log("Received shutdown signal. Aborting...", "warn");
      this.aiRunner.abort();
      this.stopHeartbeat();
      // Clean up current worktree if any (don't preserve branch on forced shutdown)
      this.cleanupTaskWorktree(this.currentWorktreePath, false);
      process.exit(1);
    };

    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);

    // Start periodic heartbeat reporting
    this.startHeartbeat();

    const sprint = await this.getActiveSprint();
    if (sprint) {
      this.log(`Active sprint found: ${sprint.name}`, "info");
    } else {
      this.log("No active sprint found.", "warn");
    }

    // Main task execution loop
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

          const updatePayload: Record<string, unknown> = { status: TaskStatus.IN_REVIEW };
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

          // Update progress.md in main project
          this.updateProgress(task, true);

          // Track PR in progress.md if created
          if (result.prUrl) {
            try {
              this.knowledgeBase.updateProgress({
                type: "pr_opened",
                title: task.title,
                details: `PR: ${result.prUrl}`,
              });
            } catch {
              // Non-critical — don't fail the task
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

    // Send final heartbeat with COMPLETED status and stop
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
        // Best-effort final heartbeat — ignore errors on shutdown
      });

    process.exit(0);
  }
}

// CLI entry point
const workerEntrypoint = process.argv[1]?.split(/[\\/]/).pop();
if (workerEntrypoint === "worker.js" || workerEntrypoint === "worker.ts") {
  // Set process title for easy identification in Activity Monitor / ps
  // Find with: ps aux | grep "locus-worker" or pgrep -f "locus-worker"
  process.title = "locus-worker";

  const args = process.argv.slice(2);
  const config: Partial<WorkerConfig> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-id") config.agentId = args[++i];
    else if (arg === "--workspace-id") config.workspaceId = args[++i];
    else if (arg === "--sprint-id") config.sprintId = args[++i];
    else if (arg === "--api-url") config.apiBase = args[++i];
    else if (arg === "--api-key") config.apiKey = args[++i];
    else if (arg === "--project-path") config.projectPath = args[++i];
    else if (arg === "--main-project-path") config.mainProjectPath = args[++i];
    else if (arg === "--model") config.model = args[++i];
    else if (arg === "--use-worktrees") config.useWorktrees = true;
    else if (arg === "--auto-push") config.autoPush = true;
    else if (arg === "--provider") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) i++;
      config.provider = resolveProvider(value);
    }
  }

  if (
    !config.agentId ||
    !config.workspaceId ||
    !config.apiBase ||
    !config.apiKey ||
    !config.projectPath
  ) {
    console.error("Missing required arguments");
    process.exit(1);
  }

  const worker = new AgentWorker(config as WorkerConfig);
  worker.run().catch((err) => {
    console.error("Fatal worker error:", err);
    process.exit(1);
  });
}
