import { Sprint, Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiProvider, AiRunner } from "../ai/runner.js";
import { PROVIDER } from "../core/config.js";
import { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { c } from "../utils/colors.js";
import { WorktreeManager } from "../worktree/worktree-manager.js";
import { CodebaseIndexerService } from "./codebase-indexer-service.js";
import { DocumentFetcher } from "./document-fetcher.js";
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
}

/**
 * Main agent worker that orchestrates task execution
 * Delegates responsibilities to specialized services
 */
export class AgentWorker {
  private client: LocusClient;
  private aiRunner: AiRunner;

  // Services
  private indexerService: CodebaseIndexerService;
  private documentFetcher: DocumentFetcher;
  private taskExecutor: TaskExecutor;
  private knowledgeBase: KnowledgeBase;
  private worktreeManager: WorktreeManager | null = null;

  // State
  private maxTasks = 50;
  private tasksCompleted = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentTaskId: string | null = null;
  private currentWorktreePath: string | null = null;

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

    // Initialize AI clients
    const provider = config.provider ?? PROVIDER.CLAUDE;
    this.aiRunner = createAiRunner(provider, {
      projectPath,
      model: config.model,
      log,
    });

    this.indexerService = new CodebaseIndexerService({
      aiRunner: this.aiRunner,
      projectPath,
      log,
    });

    this.documentFetcher = new DocumentFetcher({
      client: this.client,
      workspaceId: config.workspaceId,
      projectPath,
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

    // Log initialization
    const providerLabel = provider === "codex" ? "Codex" : "Claude";
    this.log(`Using ${providerLabel} CLI for all phases`, "info");

    if (config.useWorktrees) {
      this.log("Per-task worktree isolation enabled", "info");
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
    const maxRetries = 3;
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
            `Dispatch error (attempt ${attempt}/${maxRetries}): ${msg}. Retrying in 5s...`,
            "warn"
          );
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          this.log(
            `Dispatch failed after ${maxRetries} attempts: ${msg}`,
            "error"
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
    executor: TaskExecutor;
  } {
    if (!this.worktreeManager) {
      return { worktreePath: null, executor: this.taskExecutor };
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

    return { worktreePath: result.worktreePath, executor: taskExecutor };
  }

  /**
   * Clean up a task-specific worktree.
   */
  private cleanupTaskWorktree(worktreePath: string | null): void {
    if (!this.worktreeManager || !worktreePath) return;

    try {
      this.worktreeManager.remove(worktreePath, true);
      this.log("Worktree cleaned up", "info");
    } catch {
      this.log(`Could not clean up worktree: ${worktreePath}`, "warn");
    }

    this.currentWorktreePath = null;
  }

  private async executeTask(
    task: Task
  ): Promise<{ success: boolean; summary: string }> {
    // Fetch full task details to get comments/feedback
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    // Create per-task worktree for isolation
    const { worktreePath, executor } = this.createTaskWorktree(fullTask);
    this.currentWorktreePath = worktreePath;

    try {
      // Execute the task in the worktree (or main project if worktrees disabled)
      const result = await executor.execute(fullTask);

      // Reindex codebase after execution to ensure fresh context
      await this.indexerService.reindex();

      return result;
    } finally {
      // Always clean up the task worktree after execution
      this.cleanupTaskWorktree(worktreePath);
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
      // Clean up current worktree if any
      this.cleanupTaskWorktree(this.currentWorktreePath);
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

      // Fetch documents from server after task execution
      try {
        await this.documentFetcher.fetch();
      } catch (err) {
        this.log(`Document fetch failed: ${err}`, "error");
      }

      if (result.success) {
        this.log(`Completed: ${task.title}`, "success");
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: "VERIFICATION" as TaskStatus,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `✅ ${result.summary}`,
        });
        this.tasksCompleted++;

        // Update progress.md in main project
        this.updateProgress(task, true);
      } else {
        this.log(`Failed: ${task.title} - ${result.summary}`, "error");
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: "BACKLOG" as TaskStatus,
          assignedTo: null,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `❌ ${result.summary}`,
        });
      }

      this.currentTaskId = null;
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
if (
  process.argv[1]?.includes("agent-worker") ||
  process.argv[1]?.includes("worker")
) {
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
