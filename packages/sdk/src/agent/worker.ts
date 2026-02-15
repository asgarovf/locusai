import { type Sprint, type Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import { isGhAvailable, isGitAvailable } from "../git/git-utils.js";
import { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { c } from "../utils/colors.js";
import { GitWorkflow } from "./git-workflow.js";
import { TaskExecutor } from "./task-executor.js";
import type { TaskResult, WorkerConfig } from "./worker-types.js";

// Re-export for backwards compatibility
export type { WorkerConfig } from "./worker-types.js";

/**
 * Main agent worker that claims and executes tasks sequentially.
 *
 * Responsibilities:
 * - Creating a single branch for the run
 * - Claiming tasks from the API via dispatch
 * - Executing tasks using the AI runner
 * - Committing and pushing after each task
 * - Opening a PR when all tasks are done
 * - Checking out the base branch after completion
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

  // Track completed tasks for the final PR
  private completedTaskList: Array<{ title: string; id: string }> = [];
  private taskSummaries: string[] = [];

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
    if (!isGitAvailable()) {
      this.log(
        "git is not installed — branch management will not work",
        "error"
      );
    }

    if (!isGhAvailable(projectPath)) {
      this.log(
        "GitHub CLI (gh) not available or not authenticated. Branch push can continue, but automatic PR creation may fail until gh is configured. Install from https://cli.github.com/",
        "warn"
      );
    }

    // Initialize AI runner and task executor
    const provider = config.provider ?? PROVIDER.CLAUDE;
    this.aiRunner = createAiRunner(provider, {
      projectPath,
      model: config.model,
      log,
      reasoningEffort: config.reasoningEffort,
    });
    this.taskExecutor = new TaskExecutor({
      aiRunner: this.aiRunner,
      projectPath,
      log,
    });

    // Knowledge base for progress updates
    this.knowledgeBase = new KnowledgeBase(projectPath);

    // Git workflow handles branch creation, commit, push, and PR
    this.gitWorkflow = new GitWorkflow(config, log);

    // Log initialization
    const providerLabel = provider === "codex" ? "Codex" : "Claude";
    this.log(`Using ${providerLabel} CLI for all phases`, "info");
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
   * Execute a single task in the current branch.
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    try {
      const result = await this.taskExecutor.execute(fullTask);

      let noChanges = false;
      let taskBranch: string | null = null;

      if (result.success) {
        const commitResult = this.gitWorkflow.commitAndPush(fullTask);
        taskBranch = commitResult.branch;
        noChanges = Boolean(commitResult.noChanges);
      }

      return {
        ...result,
        branch: taskBranch ?? undefined,
        noChanges: noChanges || undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        summary: `Execution error: ${msg}`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Progress & heartbeat
  // ---------------------------------------------------------------------------

  private updateProgress(task: Task, summary: string): void {
    try {
      this.knowledgeBase.updateProgress({
        role: "user",
        content: task.title,
      });
      this.knowledgeBase.updateProgress({
        role: "assistant",
        content: summary,
      });
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
      this.gitWorkflow.checkoutBaseBranch();
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

    // Create a single branch for the entire run
    const branchName = this.gitWorkflow.createBranch(this.config.sprintId);
    this.log(`Working on branch: ${branchName}`, "info");

    while (this.tasksCompleted < this.maxTasks) {
      const task = await this.getNextTask();
      if (!task) {
        this.log("No more tasks to process.", "info");
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
            author: "system",
            text: `⚠️ Agent execution finished with no file changes, so no commit was created.\n\n${result.summary}`,
          });
        } else {
          this.log(`Completed: ${task.title}`, "success");

          const updatePayload: Record<string, unknown> = {
            status: TaskStatus.IN_REVIEW,
          };

          await this.client.tasks.update(
            task.id,
            this.config.workspaceId,
            updatePayload
          );

          const branchInfo = result.branch
            ? `\n\nBranch: \`${result.branch}\``
            : "";
          await this.client.tasks.addComment(task.id, this.config.workspaceId, {
            author: "system",
            text: `✅ ${result.summary}${branchInfo}`,
          });
          this.tasksCompleted++;

          // Track for final PR
          this.completedTaskList.push({ title: task.title, id: task.id });
          this.taskSummaries.push(result.summary);

          this.updateProgress(task, result.summary);
        }
      } else {
        this.log(`Failed: ${task.title} - ${result.summary}`, "error");
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: TaskStatus.BACKLOG,
          assignedTo: null,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: "system",
          text: `❌ ${result.summary}`,
        });
      }

      this.currentTaskId = null;
      this.sendHeartbeat();
    }

    // Open PR if any tasks were completed
    if (this.completedTaskList.length > 0) {
      this.log("All tasks done. Creating pull request...", "info");
      const prResult = this.gitWorkflow.createPullRequest(
        this.completedTaskList,
        this.taskSummaries
      );
      if (prResult.url) {
        this.log(`PR created: ${prResult.url}`, "success");

        // Update all completed tasks with the PR URL
        for (const task of this.completedTaskList) {
          try {
            await this.client.tasks.update(task.id, this.config.workspaceId, {
              prUrl: prResult.url,
            });
          } catch {
            // Best effort PR URL update
          }
        }
      } else if (prResult.error) {
        this.log(`PR creation failed: ${prResult.error}`, "error");
      }
    }

    // Checkout base branch
    this.gitWorkflow.checkoutBaseBranch();

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
