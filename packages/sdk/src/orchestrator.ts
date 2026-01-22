import { ChildProcess, spawn } from "node:child_process";
import { Task, TaskStatus } from "@locusai/shared";
import { EventEmitter } from "events";
import { LocusClient } from "./index";

export interface AgentConfig {
  id: string;
  skills: string[];
  maxConcurrentTasks: number;
}

export interface AgentState {
  id: string;
  skills: string[];
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
  agentSkills: string[];
  mcpProjectPath: string;
  apiKey: string;
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
    console.log(`Agent Skills: ${this.config.agentSkills.join(", ")}`);
    console.log(`API Base: ${this.config.apiBase}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

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
    // Spawn single agent
    await this.spawnAgent(this.config.agentSkills);

    // Wait for agent to complete
    while (this.agents.size > 0 && this.isRunning) {
      await this.reapAgents();

      if (this.agents.size === 0) {
        console.log("✅ Agent completed all tasks!");
        break;
      }

      await this.sleep(2000);
    }

    console.log("\n✅ Orchestrator finished");
  }

  /**
   * Spawn a single agent process
   */
  private async spawnAgent(skills: string[]): Promise<void> {
    const agentId = `agent-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const agentState: AgentState = {
      id: agentId,
      skills,
      status: "IDLE",
      currentTaskId: null,
      tasksCompleted: 0,
      tasksFailed: 0,
      lastHeartbeat: new Date(),
    };

    this.agents.set(agentId, agentState);

    console.log(`🚀 Agent started: ${agentId}`);
    console.log(`   Skills: ${skills.join(", ")}\n`);

    // Build arguments for agent worker
    const workerPath = require.resolve("./agent-worker");
    const workerArgs = [
      "--agent-id",
      agentId,
      "--workspace-id",
      this.config.workspaceId,
      "--skills",
      skills.join(","),
      "--api-base",
      this.config.apiBase,
      "--api-key",
      this.config.apiKey,
      "--mcp-project",
      this.config.mcpProjectPath,
    ];

    // Add sprint ID if resolved
    if (this.resolvedSprintId) {
      workerArgs.push("--sprint-id", this.resolvedSprintId);
    }

    // Use bun to run TypeScript files directly
    const agentProcess = spawn("bun", ["run", workerPath, ...workerArgs]);

    agentState.process = agentProcess;

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
      }
    });

    this.emit("agent:spawned", { agentId, skills });
  }

  /**
   * Reap completed agents
   */
  private async reapAgents(): Promise<void> {
    const completed: string[] = [];

    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.process && agent.process.exitCode !== null) {
        completed.push(agentId);
        this.emit("agent:completed", {
          agentId,
          status: agent.status,
          tasksCompleted: agent.tasksCompleted,
          tasksFailed: agent.tasksFailed,
        });
      }
    }

    for (const agentId of completed) {
      this.agents.delete(agentId);
    }
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

      // Find task matching agent skills
      let task = tasks.find(
        (t) => t.assigneeRole && agent.skills.includes(t.assigneeRole)
      );

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
