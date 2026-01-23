import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Task, TaskPriority, TaskStatus } from "@locusai/shared";
import { EventEmitter } from "events";
import { LocusClient } from "./index";

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
}

export interface OrchestratorConfig {
  workspaceId: string;
  sprintId: string;
  apiBase: string;
  maxIterations: number;
  projectPath: string;
  apiKey: string;
  anthropicApiKey?: string;
  model?: string;
}

export class AgentOrchestrator extends EventEmitter {
  private client: LocusClient;
  private config: OrchestratorConfig;
  private agents: Map<string, AgentState> = new Map();
  private isRunning = false;
  private processedTasks: Set<string> = new Set();
  private resolvedSprintId: string | null = null;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
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
        console.log(`📋 Using active sprint: ${sprint.name}`);
        return sprint.id;
      }
    } catch {
      // No active sprint found, will work with all tasks
    }

    console.log("ℹ  No sprint specified, working with all workspace tasks");
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
   * Main orchestration loop - runs 1 agent continuously
   */
  private async orchestrationLoop(): Promise<void> {
    // Resolve sprint ID first
    this.resolvedSprintId = await this.resolveSprintId();

    this.emit("started", {
      timestamp: new Date(),
      config: this.config,
      sprintId: this.resolvedSprintId,
    });

    console.log("\n🤖 Locus Agent Orchestrator");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Workspace: ${this.config.workspaceId}`);
    if (this.resolvedSprintId) {
      console.log(`Sprint: ${this.resolvedSprintId}`);
    }
    console.log(`API Base: ${this.config.apiBase}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check if there are tasks to work on before spawning
    const tasks = await this.getAvailableTasks();

    if (tasks.length === 0) {
      console.log("ℹ  No available tasks found in the backlog.");
      return;
    }

    // Spawn single agent
    await this.spawnAgent();

    // Wait for agent to complete
    while (this.agents.size > 0 && this.isRunning) {
      await this.reapAgents();

      if (this.agents.size === 0) {
        break;
      }

      await this.sleep(2000);
    }

    console.log("\n✅ Orchestrator finished");
  }

  /**
   * Spawn a single agent process
   */
  private async spawnAgent(): Promise<void> {
    const agentId = `agent-${Date.now()}-${Math.random()
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

    console.log(`🚀 Agent started: ${agentId}\n`);

    // Build arguments for agent worker
    // Resolve path relative to this file's location (works in both dev and production)
    const workerPath = join(__dirname, "agent", "worker.js");

    // Verify worker file exists
    if (!existsSync(workerPath)) {
      throw new Error(
        `Worker file not found at ${workerPath}. ` +
          `Make sure the SDK is properly built. __dirname: ${__dirname}`
      );
    }

    const workerArgs = [
      "--agent-id",
      agentId,
      "--workspace-id",
      this.config.workspaceId,
      "--api-base",
      this.config.apiBase,
      "--api-key",
      this.config.apiKey,
      "--project-path",
      this.config.projectPath,
    ];

    // Add anthropic API key if provided
    if (this.config.anthropicApiKey) {
      workerArgs.push("--anthropic-api-key", this.config.anthropicApiKey);
    }

    // Add model if specified
    if (this.config.model) {
      workerArgs.push("--model", this.config.model);
    }

    // Add sprint ID if resolved
    if (this.resolvedSprintId) {
      workerArgs.push("--sprint-id", this.resolvedSprintId);
    }

    // Use bun to run TypeScript files directly
    const workerTsPath = workerPath.replace(/\.js$/, ".ts");
    const agentProcess = spawn("bun", ["run", workerTsPath, ...workerArgs]);

    agentState.process = agentProcess;

    agentProcess.on("message", (msg: Record<string, unknown>) => {
      if (msg.type === "stats") {
        agentState.tasksCompleted = (msg.tasksCompleted as number) || 0;
        agentState.tasksFailed = (msg.tasksFailed as number) || 0;
      }
    });

    agentProcess.stdout?.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    agentProcess.stderr?.on("data", (data) => {
      process.stderr.write(`[${agentId}] ERR: ${data.toString()}`);
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
   * Reap completed agents
   */
  private async reapAgents(): Promise<void> {
    // No-op: agents now remove themselves in the 'exit' listener
    // to ensure events are emitted with correct stats before deletion.
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
        status: TaskStatus.VERIFICATION,
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
   * Cleanup - kill all agent processes
   */
  private async cleanup(): Promise<void> {
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.process && !agent.process.killed) {
        console.log(`Killing agent: ${agentId}`);
        agent.process.kill();
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
