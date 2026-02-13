import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STALE_AGENT_TIMEOUT_MS } from "@locusai/shared";
import { EventEmitter } from "events";
import { c } from "../utils/colors.js";
import { getAugmentedEnv } from "../utils/resolve-bin.js";
import type { AgentState, OrchestratorConfig } from "./types.js";

const MAX_AGENTS = 5;

/**
 * Manages the lifecycle of agent worker processes.
 *
 * Responsibilities:
 * - Spawning agent processes with correct CLI args
 * - Tracking agent state (idle, working, completed, failed)
 * - Heartbeat monitoring for stale agent detection
 * - Graceful shutdown and process tree cleanup
 */
export class AgentPool extends EventEmitter {
  private agents: Map<string, AgentState> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private config: OrchestratorConfig) {
    super();
  }

  get size(): number {
    return this.agents.size;
  }

  get effectiveAgentCount(): number {
    return Math.min(Math.max(this.config.agentCount ?? 1, 1), MAX_AGENTS);
  }

  getAll(): AgentState[] {
    return Array.from(this.agents.values());
  }

  get(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Spawn a single agent worker process.
   *
   * Each worker manages its own per-task worktrees internally.
   * The optional `baseBranch` tells the worker which branch to use
   * as the starting point for worktree creation and PR targeting
   * (used in tier-based and legacy execution).
   */
  async spawn(
    index: number,
    resolvedSprintId: string | null,
    baseBranch?: string
  ): Promise<void> {
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

    const workerArgs = this.buildWorkerArgs(
      agentId,
      resolvedSprintId,
      baseBranch
    );

    // detached: true creates a new process group so we can kill the entire tree
    // (including Claude/Codex CLI grandchild processes) via kill(-pid)
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

    agentState.process = agentProcess;
    this.attachProcessHandlers(agentId, agentState, agentProcess);
    this.emit("agent:spawned", { agentId });
  }

  /**
   * Wait for all active agent processes to finish.
   */
  async waitForAll(isRunning: () => boolean): Promise<void> {
    while (this.agents.size > 0 && isRunning()) {
      await sleep(2000);
    }
  }

  /**
   * Start monitoring agent heartbeats for stale detection.
   */
  startHeartbeatMonitor(): void {
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
            killProcessTree(agent.process);
          }
          this.emit("agent:stale", { agentId });
        }
      }
    }, 60_000);
  }

  /**
   * Stop a specific agent by ID.
   */
  stopAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    if (agent.process && !agent.process.killed) {
      killProcessTree(agent.process);
    }
    return true;
  }

  /**
   * Kill all agent processes and stop the heartbeat monitor.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.process && !agent.process.killed) {
        console.log(`Killing agent: ${agentId}`);
        killProcessTree(agent.process);
      }
    }

    this.agents.clear();
  }

  getStats() {
    return {
      activeAgents: this.agents.size,
      agentCount: this.effectiveAgentCount,
      totalTasksCompleted: this.getAll().reduce(
        (sum, a) => sum + a.tasksCompleted,
        0
      ),
      totalTasksFailed: this.getAll().reduce(
        (sum, a) => sum + a.tasksFailed,
        0
      ),
    };
  }

  private buildWorkerArgs(
    agentId: string,
    resolvedSprintId: string | null,
    baseBranch?: string
  ): string[] {
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
    if (resolvedSprintId) {
      args.push("--sprint-id", resolvedSprintId);
    }
    if (this.config.useWorktrees ?? true) {
      args.push("--use-worktrees");
    }
    if (this.config.autoPush) {
      args.push("--auto-push");
    }
    if (baseBranch) {
      args.push("--base-branch", baseBranch);
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
      process.stdout.write(data.toString());
    });

    proc.stderr?.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    proc.on("exit", (code) => {
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
  }

  /**
   * Resolve the worker script path from the SDK module location.
   */
  private resolveWorkerPath(): string | undefined {
    const currentModulePath = fileURLToPath(import.meta.url);
    const currentModuleDir = dirname(currentModulePath);

    const potentialPaths = [
      // When running from dist (compiled): orchestrator/ -> agent/worker.js
      join(currentModuleDir, "..", "agent", "worker.js"),
      // Fallback paths
      join(currentModuleDir, "agent", "worker.js"),
      join(currentModuleDir, "worker.js"),
      join(currentModuleDir, "..", "agent", "worker.ts"),
    ];

    return potentialPaths.find((p) => existsSync(p));
  }
}

/**
 * Kill a process and all its descendants.
 * Sends SIGTERM to the process group so child processes
 * (Claude CLI, Codex CLI, etc.) are also signaled.
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
