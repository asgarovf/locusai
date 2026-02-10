import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STALE_AGENT_TIMEOUT_MS,
  Task,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import { EventEmitter } from "events";
import type { AiProvider } from "./ai/runner.js";
import { isGhAvailable, isGitAvailable } from "./git/git-utils.js";
import { LocusClient } from "./index.js";
import { c } from "./utils/colors.js";
import type { WorktreeCleanupPolicy } from "./worktree/worktree-config.js";
import { WorktreeManager } from "./worktree/worktree-manager.js";

export interface AgentConfig {
  id: string;
  maxConcurrentTasks: number;
}

export interface AgentState {
  id: string;
  status: "IDLE" | "WORKING" | "COMPLETED" | "FAILED";
  currentTaskId: string | null;
  tasksCompleted: number;
  tasksFailed: number;
  lastHeartbeat: Date;
  process?: ChildProcess;
  worktreePath?: string;
  worktreeBranch?: string;
}

export interface OrchestratorConfig {
  // Workspace ID
  workspaceId: string;
  // Sprint ID
  sprintId: string;
  // API base URL
  apiBase: string;
  // Maximum number of iterations to run
  maxIterations: number;
  // Path to the project
  projectPath: string;
  // API key
  apiKey: string;
  // AI model (e.g. opus, sonnet, gpt-5.3-codex.)
  model?: string;
  // AI provider (e.g. codex, claude, etc.)
  provider?: AiProvider;
  // Number of agents to spawn
  agentCount?: number;
  // Whether to use worktrees for each agent
  useWorktrees?: boolean;
  // Worktree management
  worktreeCleanupPolicy?: WorktreeCleanupPolicy;
  /** Whether to spawn a single reviewer agent alongside builders */
  enableReviewer?: boolean;
  /** Whether to push agent branches to remote after committing */
  autoPush?: boolean;
}

const MAX_AGENTS = 5;

export class AgentOrchestrator extends EventEmitter {
  private client: LocusClient;
  private config: OrchestratorConfig;
  private agents: Map<string, AgentState> = new Map();
  private isRunning = false;
  private processedTasks: Set<string> = new Set();
  private resolvedSprintId: string | null = null;
  private worktreeManager: WorktreeManager | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
  }

  private get agentCount(): number {
    return Math.min(Math.max(this.config.agentCount ?? 1, 1), MAX_AGENTS);
  }

  private get enableReviewer(): boolean {
    return this.config.enableReviewer ?? true;
  }

  private get useWorktrees(): boolean {
    // Worktrees are always enabled by default for per-task isolation
    return this.config.useWorktrees ?? true;
  }

  /**
   * Resolve the sprint ID - use provided or find active sprint
   */
  private async resolveSprintId(): Promise<string> {
    if (this.config.sprintId) {
      return this.config.sprintId;
    }

    // Try to find active sprint in workspace
    try {
      const sprint = await this.client.sprints.getActive(
        this.config.workspaceId
      );
      if (sprint?.id) {
        console.log(c.info(`📋 Using active sprint: ${sprint.name}`));
        return sprint.id;
      }
    } catch {
      // No active sprint found, will work with all tasks
    }

    console.log(
      c.dim("ℹ  No sprint specified, working with all workspace tasks")
    );
    return "";
  }

  /**
   * Start the orchestrator with N agents
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
   * Main orchestration loop - spawns N agents and monitors them
   */
  private async orchestrationLoop(): Promise<void> {
    // Resolve sprint ID first
    this.resolvedSprintId = await this.resolveSprintId();

    this.emit("started", {
      timestamp: new Date(),
      config: this.config,
      sprintId: this.resolvedSprintId,
    });

    console.log(`\n${c.primary("🤖 Locus Agent Orchestrator")}`);
    console.log(c.dim("----------------------------------------------"));
    console.log(`${c.bold("Workspace:")} ${this.config.workspaceId}`);
    if (this.resolvedSprintId) {
      console.log(`${c.bold("Sprint:")} ${this.resolvedSprintId}`);
    }
    console.log(`${c.bold("Agents:")} ${this.agentCount}`);
    console.log(
      `${c.bold("Reviewer:")} ${this.enableReviewer ? "enabled" : "disabled"}`
    );
    console.log(
      `${c.bold("Worktrees:")} ${this.useWorktrees ? "enabled" : "disabled"}`
    );
    if (this.useWorktrees) {
      console.log(
        `${c.bold("Auto-push:")} ${this.config.autoPush ? "enabled" : "disabled"}`
      );
    }
    console.log(`${c.bold("API Base:")} ${this.config.apiBase}`);
    console.log(c.dim("----------------------------------------------\n"));

    // Check if there are tasks to work on before spawning
    const tasks = await this.getAvailableTasks();

    if (tasks.length === 0) {
      console.log(c.dim("ℹ  No available tasks found in the backlog."));
      return;
    }

    // Prerequisite checks
    if (this.useWorktrees && !isGitAvailable()) {
      console.log(
        c.error(
          "git is not installed. Worktree isolation requires git. Install from https://git-scm.com/"
        )
      );
      return;
    }

    if (this.config.autoPush && !isGhAvailable(this.config.projectPath)) {
      console.log(
        c.warning(
          "GitHub CLI (gh) not available or not authenticated. Branch push can continue, but automatic PR creation may fail until gh is configured. Install from https://cli.github.com/"
        )
      );
    }

    // Initialize worktree manager for cleanup purposes (workers manage their own per-task worktrees)
    if (this.useWorktrees) {
      this.worktreeManager = new WorktreeManager(this.config.projectPath, {
        cleanupPolicy: "auto",
      });
    }

    // Start heartbeat monitoring
    this.startHeartbeatMonitor();

    // Spawn agents with staggered delays to avoid worktree branch race conditions.
    // Without staggering, agents that start simultaneously can claim the same task
    // and collide when creating git branches/worktrees.
    const agentsToSpawn = Math.min(this.agentCount, tasks.length);
    const SPAWN_DELAY_MS = 5_000;
    const spawnPromises: Promise<void>[] = [];
    for (let i = 0; i < agentsToSpawn; i++) {
      if (i > 0) {
        await this.sleep(SPAWN_DELAY_MS);
      }
      spawnPromises.push(this.spawnAgent(i));
    }
    await Promise.all(spawnPromises);

    // Spawn a single reviewer agent if enabled (polls for PR_OPEN tasks)
    if (this.enableReviewer) {
      await this.spawnReviewer();
    }

    // Wait for all agents to complete
    while (this.agents.size > 0 && this.isRunning) {
      if (this.agents.size === 0) {
        break;
      }

      await this.sleep(2000);
    }

    console.log(`\n${c.success("✅ Orchestrator finished")}`);
  }

  /**
   * Spawn a single agent process. Each agent manages its own per-task worktrees.
   */
  private async spawnAgent(index: number): Promise<void> {
    const agentId = `agent-${index}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const agentState: AgentState = {
      id: agentId,
      status: "IDLE",
      currentTaskId: null,
      tasksCompleted: 0,
      tasksFailed: 0,
      lastHeartbeat: new Date(),
    };

    this.agents.set(agentId, agentState);

    console.log(`${c.primary("🚀 Agent started:")} ${c.bold(agentId)}\n`);

    const workerPath = this.resolveWorkerPath();

    if (!workerPath) {
      throw new Error(
        "Worker file not found. Make sure the SDK is properly built and installed."
      );
    }

    const workerArgs = [
      "--agent-id",
      agentId,
      "--workspace-id",
      this.config.workspaceId,
      "--api-url",
      this.config.apiBase,
      "--api-key",
      this.config.apiKey,
      "--project-path",
      this.config.projectPath,
    ];

    // Add model if specified
    if (this.config.model) {
      workerArgs.push("--model", this.config.model);
    }

    // Add provider if specified
    if (this.config.provider) {
      workerArgs.push("--provider", this.config.provider);
    }

    // Add sprint ID if resolved
    if (this.resolvedSprintId) {
      workerArgs.push("--sprint-id", this.resolvedSprintId);
    }

    // Tell the worker to use per-task worktrees
    if (this.useWorktrees) {
      workerArgs.push("--use-worktrees");
    }

    // Tell the worker to push branches to remote after committing
    if (this.config.autoPush) {
      workerArgs.push("--auto-push");
    }

    // Use node to run the worker script
    // detached: true creates a new process group so we can kill the entire tree
    // (including Claude/Codex CLI grandchild processes) via kill(-pid)
    const agentProcess = spawn(process.execPath, [workerPath, ...workerArgs], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
      env: {
        ...process.env,
        FORCE_COLOR: "1",
        TERM: "xterm-256color",
        LOCUS_WORKER: agentId,
        LOCUS_WORKSPACE: this.config.workspaceId,
      },
    });

    agentState.process = agentProcess;

    agentProcess.on("message", (msg: Record<string, unknown>) => {
      if (msg.type === "stats") {
        agentState.tasksCompleted = (msg.tasksCompleted as number) || 0;
        agentState.tasksFailed = (msg.tasksFailed as number) || 0;
      }
      if (msg.type === "heartbeat") {
        agentState.lastHeartbeat = new Date();
      }
    });

    agentProcess.stdout?.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    agentProcess.stderr?.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    agentProcess.on("exit", (code) => {
      console.log(`\n${agentId} finished (exit code: ${code})`);
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = code === 0 ? "COMPLETED" : "FAILED";

        // Ensure CLI gets the absolute latest stats
        this.emit("agent:completed", {
          agentId,
          status: agent.status,
          tasksCompleted: agent.tasksCompleted,
          tasksFailed: agent.tasksFailed,
        });

        // Remove from active tracking after emitting
        this.agents.delete(agentId);
      }
    });

    this.emit("agent:spawned", { agentId });
  }

  /**
   * Spawn a reviewer agent process that polls for PR_OPEN tasks.
   */
  private async spawnReviewer(): Promise<void> {
    const agentId = `reviewer-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const agentState: AgentState = {
      id: agentId,
      status: "IDLE",
      currentTaskId: null,
      tasksCompleted: 0,
      tasksFailed: 0,
      lastHeartbeat: new Date(),
    };

    this.agents.set(agentId, agentState);

    console.log(`${c.primary("🔍 Reviewer started:")} ${c.bold(agentId)}\n`);

    const reviewerPath = this.resolveReviewerPath();

    if (!reviewerPath) {
      console.log(
        c.error(
          "Reviewer worker file not found. Make sure the SDK is properly built."
        )
      );
      this.agents.delete(agentId);
      return;
    }

    const reviewerArgs = [
      "--agent-id",
      agentId,
      "--workspace-id",
      this.config.workspaceId,
      "--api-url",
      this.config.apiBase,
      "--api-key",
      this.config.apiKey,
      "--project-path",
      this.config.projectPath,
    ];

    if (this.config.model) {
      reviewerArgs.push("--model", this.config.model);
    }
    if (this.config.provider) {
      reviewerArgs.push("--provider", this.config.provider);
    }
    if (this.resolvedSprintId) {
      reviewerArgs.push("--sprint-id", this.resolvedSprintId);
    }

    const reviewerProcess = spawn(
      process.execPath,
      [reviewerPath, ...reviewerArgs],
      {
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
        env: {
          ...process.env,
          FORCE_COLOR: "1",
          TERM: "xterm-256color",
          LOCUS_WORKER: agentId,
          LOCUS_WORKSPACE: this.config.workspaceId,
        },
      }
    );

    agentState.process = reviewerProcess;

    reviewerProcess.stdout?.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    reviewerProcess.stderr?.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    reviewerProcess.on("exit", (code) => {
      console.log(`\n${agentId} finished (exit code: ${code})`);
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = code === 0 ? "COMPLETED" : "FAILED";
        this.emit("agent:completed", {
          agentId,
          status: agent.status,
          tasksCompleted: agent.tasksCompleted,
          tasksFailed: agent.tasksFailed,
        });
        this.agents.delete(agentId);
      }
    });

    this.emit("agent:spawned", { agentId, role: "reviewer" });
  }

  /**
   * Resolve the worker script path from the SDK module location
   */
  private resolveWorkerPath(): string | undefined {
    const currentModulePath = fileURLToPath(import.meta.url);
    const currentModuleDir = dirname(currentModulePath);

    const potentialPaths = [
      join(currentModuleDir, "agent", "worker.js"),
      join(currentModuleDir, "worker.js"),
      join(currentModuleDir, "agent", "worker.ts"),
    ];

    return potentialPaths.find((p) => existsSync(p));
  }

  /**
   * Resolve the reviewer worker script path from the SDK module location
   */
  private resolveReviewerPath(): string | undefined {
    const currentModulePath = fileURLToPath(import.meta.url);
    const currentModuleDir = dirname(currentModulePath);

    const potentialPaths = [
      join(currentModuleDir, "agent", "reviewer-worker.js"),
      join(currentModuleDir, "reviewer-worker.js"),
      join(currentModuleDir, "agent", "reviewer-worker.ts"),
    ];

    return potentialPaths.find((p) => existsSync(p));
  }

  /**
   * Start monitoring agent heartbeats for stale detection
   */
  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [agentId, agent] of this.agents.entries()) {
        if (
          agent.status === "WORKING" &&
          now - agent.lastHeartbeat.getTime() > STALE_AGENT_TIMEOUT_MS
        ) {
          console.log(
            c.error(
              `Agent ${agentId} is stale (no heartbeat for 10 minutes). Killing.`
            )
          );
          if (agent.process && !agent.process.killed) {
            this.killProcessTree(agent.process);
          }
          this.emit("agent:stale", { agentId });
        }
      }
    }, 60_000);
  }

  /**
   * Get available tasks in sprint
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
   * Assign task to agent
   */
  async assignTaskToAgent(agentId: string): Promise<Task | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    try {
      const tasks = await this.getAvailableTasks();

      const priorityOrder = [
        TaskPriority.CRITICAL,
        TaskPriority.HIGH,
        TaskPriority.MEDIUM,
        TaskPriority.LOW,
      ];

      // Find task with highest priority
      let task = tasks.sort(
        (a, b) =>
          priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
      )[0];

      // Fallback: any available task
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
   * Mark task as completed by agent
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

      const agent = this.agents.get(agentId);
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
   * Mark task as failed
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

      const agent = this.agents.get(agentId);
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
   * Stop orchestrator
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.cleanup();
    this.emit("stopped", { timestamp: new Date() });
  }

  /**
   * Stop a specific agent by ID
   */
  stopAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.process && !agent.process.killed) {
      this.killProcessTree(agent.process);
    }
    return true;
  }

  /**
   * Kill a process and all its descendants.
   * Sends SIGTERM first to allow graceful shutdown, which triggers the worker's
   * signal handler to abort the active Claude/Codex CLI process.
   */
  private killProcessTree(proc: ChildProcess): void {
    if (!proc.pid || proc.killed) return;

    try {
      // Send SIGTERM to the process group (negative PID kills the group)
      // This ensures all child processes (Claude CLI, etc.) are also signaled
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      // If process group kill fails, fall back to direct kill
      try {
        proc.kill("SIGTERM");
      } catch {
        // Process may have already exited
      }
    }
  }

  /**
   * Cleanup - kill all agent processes and worktrees
   */
  private async cleanup(): Promise<void> {
    // Stop heartbeat monitor
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.process && !agent.process.killed) {
        console.log(`Killing agent: ${agentId}`);
        this.killProcessTree(agent.process);
      }
    }

    // Force-remove all worktrees on shutdown
    if (this.worktreeManager) {
      try {
        const removed = this.worktreeManager.removeAll();
        if (removed > 0) {
          console.log(c.dim(`Cleaned up ${removed} worktree(s)`));
        }
      } catch {
        console.log(c.dim("Could not clean up some worktrees"));
      }
    }

    this.agents.clear();
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      activeAgents: this.agents.size,
      agentCount: this.agentCount,
      useWorktrees: this.useWorktrees,
      processedTasks: this.processedTasks.size,
      totalTasksCompleted: Array.from(this.agents.values()).reduce(
        (sum, agent) => sum + agent.tasksCompleted,
        0
      ),
      totalTasksFailed: Array.from(this.agents.values()).reduce(
        (sum, agent) => sum + agent.tasksFailed,
        0
      ),
    };
  }

  /**
   * Get all agent states for status display
   */
  getAgentStates(): AgentState[] {
    return Array.from(this.agents.values());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
