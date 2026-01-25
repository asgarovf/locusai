import type { Sprint, Task, TaskStatus } from "@locusai/shared";
import { createAiRunner } from "../ai/factory.js";
import type { AiProvider, AiRunner } from "../ai/runner.js";
import { PROVIDERS } from "../core/config.js";
import { LocusClient } from "../index.js";
import { c } from "../utils/colors.js";
import { ArtifactSyncer } from "./artifact-syncer.js";
import { CodebaseIndexerService } from "./codebase-indexer-service.js";
import { SprintPlanner } from "./sprint-planner.js";
import { TaskExecutor } from "./task-executor.js";

function resolveProvider(value: string | undefined): AiProvider {
  if (!value || value.startsWith("--")) {
    console.warn(
      "Warning: --provider requires a value. Falling back to 'claude'."
    );
    return PROVIDERS.CLAUDE;
  }
  if (value === PROVIDERS.CLAUDE || value === PROVIDERS.CODEX) return value;
  console.warn(
    `Warning: invalid --provider value '${value}'. Falling back to 'claude'.`
  );
  return PROVIDERS.CLAUDE;
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
}

/**
 * Main agent worker that orchestrates task execution
 * Delegates responsibilities to specialized services
 */
export class AgentWorker {
  private client: LocusClient;
  private aiRunner: AiRunner;

  // Services
  private sprintPlanner: SprintPlanner;
  private indexerService: CodebaseIndexerService;
  private artifactSyncer: ArtifactSyncer;
  private taskExecutor: TaskExecutor;

  // State
  private consecutiveEmpty = 0;
  private maxEmpty = 10;
  private maxTasks = 50;
  private tasksCompleted = 0;
  private pollInterval = 10_000;
  private sprintPlan: string | null = null;

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

    // Initialize AI clients
    const provider = config.provider ?? PROVIDERS.CLAUDE;
    this.aiRunner = createAiRunner(provider, {
      projectPath,
      model: config.model,
    });

    // Initialize services with dependencies
    const logFn = this.log.bind(this);

    this.sprintPlanner = new SprintPlanner({
      aiRunner: this.aiRunner,
      log: logFn,
    });

    this.indexerService = new CodebaseIndexerService({
      aiRunner: this.aiRunner,
      projectPath,
      log: logFn,
    });

    this.artifactSyncer = new ArtifactSyncer({
      client: this.client,
      workspaceId: config.workspaceId,
      projectPath,
      log: logFn,
    });

    this.taskExecutor = new TaskExecutor({
      aiRunner: this.aiRunner,
      projectPath,
      sprintPlan: null, // Will be set after sprint planning
      log: logFn,
    });

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
    try {
      const task = await this.client.workspaces.dispatch(
        this.config.workspaceId,
        this.config.agentId,
        this.config.sprintId
      );
      return task;
    } catch (error) {
      this.log(
        `No task dispatched: ${error instanceof Error ? error.message : String(error)}`,
        "info"
      );
      return null;
    }
  }

  private async executeTask(
    task: Task
  ): Promise<{ success: boolean; summary: string }> {
    // Fetch full task details to get comments/feedback
    const fullTask = await this.client.tasks.getById(
      task.id,
      this.config.workspaceId
    );

    // Update task executor with current sprint plan
    this.taskExecutor.updateSprintPlan(this.sprintPlan);

    // Execute the task
    const result = await this.taskExecutor.execute(fullTask);

    // Reindex codebase after execution to ensure fresh context
    await this.indexerService.reindex();

    return result;
  }

  async run(): Promise<void> {
    this.log(
      `Agent started in ${this.config.projectPath || process.cwd()}`,
      "success"
    );

    // Initial Sprint Planning Phase
    const sprint = await this.getActiveSprint();
    if (sprint) {
      this.log(`Found active sprint: ${sprint.name} (${sprint.id})`, "info");
      const tasks = await this.client.tasks.list(this.config.workspaceId, {
        sprintId: sprint.id,
      });

      this.log(`Sprint tasks found: ${tasks.length}`, "info");

      const latestTaskCreation = tasks.reduce((latest, task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate > latest ? taskDate : latest;
      }, new Date(0));

      const mindmapDate = sprint.mindmapUpdatedAt
        ? new Date(sprint.mindmapUpdatedAt)
        : new Date(0);

      // Skip mindmap generation if there's only one task
      if (tasks.length <= 1) {
        this.log(
          "Skipping mindmap generation (only one task in sprint).",
          "info"
        );
        this.sprintPlan = null;
      } else {
        const needsPlanning =
          !sprint.mindmap ||
          sprint.mindmap.trim() === "" ||
          latestTaskCreation > mindmapDate;

        if (needsPlanning) {
          if (sprint.mindmap && latestTaskCreation > mindmapDate) {
            this.log(
              "New tasks have been added to the sprint since last mindmap. Regenerating...",
              "warn"
            );
          }
          this.sprintPlan = await this.sprintPlanner.planSprint(sprint, tasks);

          // Save mindmap to server
          await this.client.sprints.update(sprint.id, this.config.workspaceId, {
            mindmap: this.sprintPlan,
            mindmapUpdatedAt: new Date(),
          });
        } else {
          this.log("Using existing sprint mindmap.", "info");
          this.sprintPlan = sprint.mindmap ?? null;
        }
      }
    } else {
      this.log("No active sprint found for planning.", "warn");
    }

    // Main task execution loop
    while (
      this.tasksCompleted < this.maxTasks &&
      this.consecutiveEmpty < this.maxEmpty
    ) {
      const task = await this.getNextTask();
      if (!task) {
        this.consecutiveEmpty++;
        if (this.consecutiveEmpty >= this.maxEmpty) break;
        await new Promise((r) => setTimeout(r, this.pollInterval));
        continue;
      }

      this.consecutiveEmpty = 0;
      this.log(`Claimed: ${task.title}`, "success");

      const result = await this.executeTask(task);

      // Sync artifacts after task execution
      await this.artifactSyncer.sync();

      if (result.success) {
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: "VERIFICATION" as TaskStatus,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `✅ ${result.summary}`,
        });
        this.tasksCompleted++;
      } else {
        await this.client.tasks.update(task.id, this.config.workspaceId, {
          status: "BACKLOG" as TaskStatus,
          assignedTo: null,
        });
        await this.client.tasks.addComment(task.id, this.config.workspaceId, {
          author: this.config.agentId,
          text: `❌ ${result.summary}`,
        });
      }
    }
    process.exit(0);
  }
}

// CLI entry point
if (
  process.argv[1]?.includes("agent-worker") ||
  process.argv[1]?.includes("worker")
) {
  const args = process.argv.slice(2);
  const config: Partial<WorkerConfig> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-id") config.agentId = args[++i];
    else if (arg === "--workspace-id") config.workspaceId = args[++i];
    else if (arg === "--sprint-id") config.sprintId = args[++i];
    else if (arg === "--api-base") config.apiBase = args[++i];
    else if (arg === "--api-key") config.apiKey = args[++i];
    else if (arg === "--project-path") config.projectPath = args[++i];
    else if (arg === "--model") config.model = args[++i];
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
