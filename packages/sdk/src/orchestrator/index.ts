import { type Task, TaskPriority, TaskStatus } from "@locusai/shared";
import { EventEmitter } from "events";
import { isGhAvailable, isGitAvailable } from "../git/git-utils.js";
import { LocusClient } from "../index.js";
import { c } from "../utils/colors.js";
import type { WorktreeCleanupPolicy } from "../worktree/worktree-config.js";
import { WorktreeManager } from "../worktree/worktree-manager.js";
import { AgentPool } from "./agent-pool.js";
import { ExecutionStrategy } from "./execution.js";
import { TierMergeService } from "./tier-merge.js";
import type { AgentConfig, AgentState, OrchestratorConfig } from "./types.js";

// Re-export types so consumers can import from the same path
export type { AgentConfig, AgentState, OrchestratorConfig };

/**
 * Top-level orchestrator that coordinates task execution across agents.
 *
 * Delegates to:
 * - `AgentPool` — spawning and managing agent worker processes
 * - `TierMergeService` — creating stacked merge branches between tiers
 * - `ExecutionStrategy` — choosing and running the tier-based or legacy execution flow
 *
 * The orchestrator itself handles:
 * - Sprint resolution
 * - Task fetching and assignment
 * - Worktree cleanup on shutdown
 * - Event emission for CLI consumers
 */
export class AgentOrchestrator extends EventEmitter {
  private client: LocusClient;
  private config: OrchestratorConfig;
  private pool: AgentPool;
  private isRunning = false;
  private processedTasks: Set<string> = new Set();
  private resolvedSprintId: string | null = null;
  private worktreeManager: WorktreeManager | null = null;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
    this.pool = new AgentPool(config);

    // Forward pool events to orchestrator consumers
    this.pool.on("agent:spawned", (data) => this.emit("agent:spawned", data));
    this.pool.on("agent:completed", (data) =>
      this.emit("agent:completed", data)
    );
    this.pool.on("agent:stale", (data) => this.emit("agent:stale", data));
  }

  private get useWorktrees(): boolean {
    return this.config.useWorktrees ?? true;
  }

  private get worktreeCleanupPolicy(): WorktreeCleanupPolicy {
    return this.config.worktreeCleanupPolicy ?? "retain-on-failure";
  }

  /**
   * Resolve the sprint ID — use provided or find active sprint.
   */
  private async resolveSprintId(): Promise<string> {
    if (this.config.sprintId) {
      return this.config.sprintId;
    }

    try {
      const sprint = await this.client.sprints.getActive(
        this.config.workspaceId
      );
      if (sprint?.id) {
        console.log(c.info(`📋 Using active sprint: ${sprint.name}`));
        return sprint.id;
      }
    } catch {
      // No active sprint found
    }

    console.log(
      c.dim("ℹ  No sprint specified, working with all workspace tasks")
    );
    return "";
  }

  /**
   * Start the orchestrator with N agents.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Orchestrator is already running");
    }

    this.isRunning = true;
    this.processedTasks.clear();

    try {
      await this.orchestrationLoop();
    } catch (error) {
      this.emit("error", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Main orchestration loop.
   *
   * 1. Resolves sprint, fetches tasks, runs pre-flight checks
   * 2. Delegates to `ExecutionStrategy` for the actual dispatch
   */
  private async orchestrationLoop(): Promise<void> {
    this.resolvedSprintId = await this.resolveSprintId();

    this.emit("started", {
      timestamp: new Date(),
      config: this.config,
      sprintId: this.resolvedSprintId,
    });

    this.printBanner();

    // Fetch available tasks
    const tasks = await this.getAvailableTasks();

    if (tasks.length === 0) {
      console.log(c.dim("ℹ  No available tasks found in the backlog."));
      return;
    }

    // Pre-flight checks
    if (!this.preflightChecks(tasks)) return;

    // Initialize worktree manager for cleanup
    if (this.useWorktrees) {
      this.worktreeManager = new WorktreeManager(this.config.projectPath, {
        cleanupPolicy: this.worktreeCleanupPolicy,
      });
    }

    // Start heartbeat monitoring
    this.pool.startHeartbeatMonitor();

    // Create tier merge service and register tasks
    const tierMerge = new TierMergeService(
      this.config.projectPath,
      this.resolvedSprintId
    );
    tierMerge.registerTierTasks(tasks);

    // Run the appropriate execution strategy
    const execution = new ExecutionStrategy(
      this.config,
      this.pool,
      tierMerge,
      this.resolvedSprintId,
      () => this.isRunning
    );
    await execution.execute(tasks);

    console.log(`\n${c.success("✅ Orchestrator finished")}`);
  }

  private printBanner(): void {
    console.log(`\n${c.primary("🤖 Locus Agent Orchestrator")}`);
    console.log(c.dim("----------------------------------------------"));
    console.log(`${c.bold("Workspace:")} ${this.config.workspaceId}`);
    if (this.resolvedSprintId) {
      console.log(`${c.bold("Sprint:")} ${this.resolvedSprintId}`);
    }
    console.log(`${c.bold("Agents:")} ${this.pool.effectiveAgentCount}`);
    console.log(
      `${c.bold("Worktrees:")} ${this.useWorktrees ? "enabled" : "disabled"}`
    );
    if (this.useWorktrees) {
      console.log(`${c.bold("Cleanup policy:")} ${this.worktreeCleanupPolicy}`);
      console.log(
        `${c.bold("Auto-push:")} ${this.config.autoPush ? "enabled" : "disabled"}`
      );
    }
    console.log(`${c.bold("API Base:")} ${this.config.apiBase}`);
    console.log(c.dim("----------------------------------------------\n"));
  }

  private preflightChecks(_tasks: Task[]): boolean {
    if (this.useWorktrees && !isGitAvailable()) {
      console.log(
        c.error(
          "git is not installed. Worktree isolation requires git. Install from https://git-scm.com/"
        )
      );
      return false;
    }

    if (this.config.autoPush && !isGhAvailable(this.config.projectPath)) {
      console.log(
        c.warning(
          "GitHub CLI (gh) not available or not authenticated. Branch push can continue, but automatic PR creation may fail until gh is configured. Install from https://cli.github.com/"
        )
      );
    }

    return true;
  }

  /**
   * Get available tasks in sprint.
   */
  private async getAvailableTasks(): Promise<Task[]> {
    try {
      const tasks = await this.client.tasks.getAvailable(
        this.config.workspaceId,
        this.resolvedSprintId || undefined
      );
      return tasks.filter((task) => !this.processedTasks.has(task.id));
    } catch (error) {
      this.emit("error", error);
      return [];
    }
  }

  /**
   * Assign task to agent.
   */
  async assignTaskToAgent(agentId: string): Promise<Task | null> {
    const agent = this.pool.get(agentId);
    if (!agent) return null;

    try {
      const tasks = await this.getAvailableTasks();

      const priorityOrder = [
        TaskPriority.CRITICAL,
        TaskPriority.HIGH,
        TaskPriority.MEDIUM,
        TaskPriority.LOW,
      ];

      let task = tasks.sort(
        (a, b) =>
          priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
      )[0];

      if (!task && tasks.length > 0) {
        task = tasks[0];
      }

      if (!task) return null;

      agent.currentTaskId = task.id;
      agent.status = "WORKING";

      this.emit("task:assigned", {
        agentId,
        taskId: task.id,
        title: task.title,
      });

      return task;
    } catch (error) {
      this.emit("error", error);
      return null;
    }
  }

  /**
   * Mark task as completed by agent.
   */
  async completeTask(
    taskId: string,
    agentId: string,
    summary?: string
  ): Promise<void> {
    try {
      await this.client.tasks.update(taskId, this.config.workspaceId, {
        status: TaskStatus.IN_REVIEW,
      });

      if (summary) {
        await this.client.tasks.addComment(taskId, this.config.workspaceId, {
          author: agentId,
          text: `✅ Task completed\n\n${summary}`,
        });
      }

      this.processedTasks.add(taskId);

      const agent = this.pool.get(agentId);
      if (agent) {
        agent.tasksCompleted += 1;
        agent.currentTaskId = null;
        agent.status = "IDLE";
      }

      this.emit("task:completed", { agentId, taskId });
    } catch (error) {
      this.emit("error", error);
    }
  }

  /**
   * Mark task as failed.
   */
  async failTask(
    taskId: string,
    agentId: string,
    error: string
  ): Promise<void> {
    try {
      await this.client.tasks.update(taskId, this.config.workspaceId, {
        status: TaskStatus.BACKLOG,
        assignedTo: null,
      });

      await this.client.tasks.addComment(taskId, this.config.workspaceId, {
        author: agentId,
        text: `❌ Agent failed: ${error}`,
      });

      const agent = this.pool.get(agentId);
      if (agent) {
        agent.tasksFailed += 1;
        agent.currentTaskId = null;
        agent.status = "IDLE";
      }

      this.emit("task:failed", { agentId, taskId, error });
    } catch (error) {
      this.emit("error", error);
    }
  }

  /**
   * Stop orchestrator.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.cleanup();
    this.emit("stopped", { timestamp: new Date() });
  }

  /**
   * Stop a specific agent by ID.
   */
  stopAgent(agentId: string): boolean {
    return this.pool.stopAgent(agentId);
  }

  /**
   * Cleanup — kill all agent processes and worktrees.
   */
  private async cleanup(): Promise<void> {
    this.pool.shutdown();

    if (this.worktreeManager) {
      try {
        if (this.worktreeCleanupPolicy === "auto") {
          const removed = this.worktreeManager.removeAll();
          if (removed > 0) {
            console.log(c.dim(`Cleaned up ${removed} worktree(s)`));
          }
        } else if (this.worktreeCleanupPolicy === "retain-on-failure") {
          this.worktreeManager.prune();
          console.log(
            c.dim(
              "Retaining worktrees for failure analysis (cleanup policy: retain-on-failure)"
            )
          );
        } else {
          console.log(
            c.dim("Skipping worktree cleanup (cleanup policy: manual)")
          );
        }
      } catch {
        console.log(c.dim("Could not clean up some worktrees"));
      }
    }
  }

  /**
   * Get orchestrator stats.
   */
  getStats() {
    const poolStats = this.pool.getStats();
    return {
      ...poolStats,
      useWorktrees: this.useWorktrees,
      processedTasks: this.processedTasks.size,
    };
  }

  /**
   * Get all agent states for status display.
   */
  getAgentStates(): AgentState[] {
    return this.pool.getAll();
  }
}
