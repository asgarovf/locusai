import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STALE_AGENT_TIMEOUT_MS, type Task } from "@locusai/shared";
import { EventEmitter } from "events";
import { isGhAvailable, isGitAvailable } from "../git/git-utils.js";
import { LocusClient } from "../index.js";
import { c } from "../utils/colors.js";
import { getAugmentedEnv } from "../utils/resolve-bin.js";
import type { AgentState, OrchestratorConfig } from "./types.js";

// Re-export types so consumers can import from the same path
export type { AgentConfig, AgentState, OrchestratorConfig } from "./types.js";

/**
 * Top-level orchestrator that coordinates task execution with a single agent.
 *
 * Spawns one worker process that sequentially claims and executes tasks.
 * The worker creates a single branch, pushes after each task, and opens
 * a PR when all tasks are done.
 */
export class AgentOrchestrator extends EventEmitter {
  private client: LocusClient;
  private config: OrchestratorConfig;
  private isRunning = false;
  private processedTasks: Set<string> = new Set();
  private resolvedSprintId: string | null = null;
  private agentState: AgentState | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.client = new LocusClient({
      baseUrl: config.apiBase,
      token: config.apiKey,
    });
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
   * Start the orchestrator with a single agent.
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
   * 2. Spawns a single agent worker process
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
    if (!this.preflightChecks()) return;

    // Start heartbeat monitoring
    this.startHeartbeatMonitor();

    // Spawn a single agent worker
    await this.spawnAgent();

    // Wait for the agent to finish
    await this.waitForAgent();

    console.log(`\n${c.success("✅ Orchestrator finished")}`);
  }

  private printBanner(): void {
    console.log(`\n${c.primary("🤖 Locus Agent Orchestrator")}`);
    console.log(c.dim("----------------------------------------------"));
    console.log(`${c.bold("Workspace:")} ${this.config.workspaceId}`);
    if (this.resolvedSprintId) {
      console.log(`${c.bold("Sprint:")} ${this.resolvedSprintId}`);
    }
    console.log(`${c.bold("API Base:")} ${this.config.apiBase}`);
    console.log(c.dim("----------------------------------------------\n"));
  }

  private preflightChecks(): boolean {
    if (!isGitAvailable()) {
      console.log(
        c.error("git is not installed. Install from https://git-scm.com/")
      );
      return false;
    }

    if (!isGhAvailable(this.config.projectPath)) {
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
   * Spawn a single agent worker process.
   */
  private async spawnAgent(): Promise<void> {
    const agentId = `agent-0-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    this.agentState = {
      id: agentId,
      status: "IDLE",
      currentTaskId: null,
      tasksCompleted: 0,
      tasksFailed: 0,
      lastHeartbeat: new Date(),
    };

    console.log(`${c.primary("🚀 Agent started:")} ${c.bold(agentId)}\n`);

    const workerPath = this.resolveWorkerPath();
    if (!workerPath) {
      throw new Error(
        "Worker file not found. Make sure the SDK is properly built and installed."
      );
    }

    const workerArgs = this.buildWorkerArgs(agentId);

    const agentProcess = spawn(process.execPath, [workerPath, ...workerArgs], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
      env: getAugmentedEnv({
        FORCE_COLOR: "1",
        TERM: "xterm-256color",
        LOCUS_WORKER: agentId,
        LOCUS_WORKSPACE: this.config.workspaceId,
      }),
    });

    this.agentState.process = agentProcess;
    this.attachProcessHandlers(agentId, this.agentState, agentProcess);
    this.emit("agent:spawned", { agentId });
  }

  /**
   * Wait for the agent process to finish.
   */
  private async waitForAgent(): Promise<void> {
    while (this.agentState && this.isRunning) {
      await sleep(2000);
    }
  }

  /**
   * Start monitoring agent heartbeats for stale detection.
   */
  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.agentState) return;
      const now = Date.now();
      if (
        this.agentState.status === "WORKING" &&
        now - this.agentState.lastHeartbeat.getTime() > STALE_AGENT_TIMEOUT_MS
      ) {
        console.log(
          c.error(
            `Agent ${this.agentState.id} is stale (no heartbeat for 10 minutes). Killing.`
          )
        );
        if (this.agentState.process && !this.agentState.process.killed) {
          killProcessTree(this.agentState.process);
        }
        this.emit("agent:stale", { agentId: this.agentState.id });
      }
    }, 60_000);
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
   * Stop the agent.
   */
  stopAgent(agentId: string): boolean {
    if (!this.agentState || this.agentState.id !== agentId) return false;
    if (this.agentState.process && !this.agentState.process.killed) {
      killProcessTree(this.agentState.process);
    }
    return true;
  }

  /**
   * Cleanup — kill agent process.
   */
  private async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.agentState?.process && !this.agentState.process.killed) {
      console.log(`Killing agent: ${this.agentState.id}`);
      killProcessTree(this.agentState.process);
    }
  }

  /**
   * Get orchestrator stats.
   */
  getStats() {
    return {
      activeAgents: this.agentState ? 1 : 0,
      totalTasksCompleted: this.agentState?.tasksCompleted ?? 0,
      totalTasksFailed: this.agentState?.tasksFailed ?? 0,
      processedTasks: this.processedTasks.size,
    };
  }

  /**
   * Get all agent states for status display.
   */
  getAgentStates(): AgentState[] {
    return this.agentState ? [this.agentState] : [];
  }

  private buildWorkerArgs(agentId: string): string[] {
    const args = [
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
      args.push("--model", this.config.model);
    }
    if (this.config.provider) {
      args.push("--provider", this.config.provider);
    }
    if (this.config.reasoningEffort) {
      args.push("--reasoning-effort", this.config.reasoningEffort);
    }
    if (this.resolvedSprintId) {
      args.push("--sprint-id", this.resolvedSprintId);
    }

    return args;
  }

  private attachProcessHandlers(
    agentId: string,
    agentState: AgentState,
    proc: ChildProcess
  ): void {
    proc.on("message", (msg: Record<string, unknown>) => {
      if (msg.type === "stats") {
        agentState.tasksCompleted = (msg.tasksCompleted as number) || 0;
        agentState.tasksFailed = (msg.tasksFailed as number) || 0;
      }
      if (msg.type === "heartbeat") {
        agentState.lastHeartbeat = new Date();
      }
    });

    proc.stdout?.on("data", (data) => {
      // Filter worker stdout to only show important status lines
      // Worker logs use format: [timestamp] [agentId] PREFIX message
      const text = data.toString();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Only forward lines with success/warn/error markers, skip info noise
        if (
          /[✓✗⚠]/.test(trimmed) ||
          /\b(Claimed|Completed|Failed|error|PR created)\b/i.test(trimmed)
        ) {
          process.stdout.write(`${line}\n`);
        }
      }
    });

    proc.stderr?.on("data", (data) => {
      // Only forward actual errors, not debug/info noise
      const text = data.toString();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Skip timestamped debug lines and ANSI-only output
        if (/^\[\d{2}:\d{2}:\d{2}\]/.test(trimmed)) continue;
        if (trimmed.length < 20) continue;
        process.stderr.write(`${line}\n`);
      }
    });

    proc.on("exit", (code) => {
      console.log(`\n${agentId} finished (exit code: ${code})`);
      if (this.agentState) {
        this.agentState.status = code === 0 ? "COMPLETED" : "FAILED";

        this.emit("agent:completed", {
          agentId,
          status: this.agentState.status,
          tasksCompleted: this.agentState.tasksCompleted,
          tasksFailed: this.agentState.tasksFailed,
        });

        this.agentState = null;
      }
    });
  }

  /**
   * Resolve the worker script path from the SDK module location.
   */
  private resolveWorkerPath(): string | undefined {
    const currentModulePath = fileURLToPath(import.meta.url);
    const currentModuleDir = dirname(currentModulePath);

    const potentialPaths = [
      join(currentModuleDir, "..", "agent", "worker.js"),
      join(currentModuleDir, "agent", "worker.js"),
      join(currentModuleDir, "worker.js"),
      join(currentModuleDir, "..", "agent", "worker.ts"),
    ];

    return potentialPaths.find((p) => existsSync(p));
  }
}

/**
 * Kill a process and all its descendants.
 */
function killProcessTree(proc: ChildProcess): void {
  if (!proc.pid || proc.killed) return;

  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    try {
      proc.kill("SIGTERM");
    } catch {
      // Process may have already exited
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
