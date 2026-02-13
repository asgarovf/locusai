import { afterEach, describe, expect, it, mock } from "bun:test";
import { AgentOrchestrator } from "../../orchestrator/index.js";

const baseConfig = {
  workspaceId: "workspace-1",
  sprintId: "",
  apiBase: "http://localhost:3000",
  maxIterations: 1,
  projectPath: ".",
  apiKey: "test-key",
  useWorktrees: true,
} as const;

describe("AgentOrchestrator worktree cleanup policy", () => {
  const originalConsoleLog = console.log;

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("defaults to retain-on-failure and does not force remove all worktrees", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const removeAll = mock(() => 3);
    const prune = mock(() => 0);
    const orchestrator = new AgentOrchestrator(baseConfig);

    (
      orchestrator as unknown as {
        worktreeManager: { removeAll: () => number; prune: () => number };
      }
    ).worktreeManager = { removeAll, prune };

    await (
      orchestrator as unknown as { cleanup: () => Promise<void> }
    ).cleanup();

    expect(removeAll).toHaveBeenCalledTimes(0);
    expect(prune).toHaveBeenCalledTimes(1);
  });

  it("force removes all worktrees when cleanup policy is auto", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const removeAll = mock(() => 2);
    const prune = mock(() => 0);
    const orchestrator = new AgentOrchestrator({
      ...baseConfig,
      worktreeCleanupPolicy: "auto",
    });

    (
      orchestrator as unknown as {
        worktreeManager: { removeAll: () => number; prune: () => number };
      }
    ).worktreeManager = { removeAll, prune };

    await (
      orchestrator as unknown as { cleanup: () => Promise<void> }
    ).cleanup();

    expect(removeAll).toHaveBeenCalledTimes(1);
    expect(prune).toHaveBeenCalledTimes(0);
  });

  it("skips all cleanup when policy is manual", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const removeAll = mock(() => 1);
    const prune = mock(() => 1);
    const orchestrator = new AgentOrchestrator({
      ...baseConfig,
      worktreeCleanupPolicy: "manual",
    });

    (
      orchestrator as unknown as {
        worktreeManager: { removeAll: () => number; prune: () => number };
      }
    ).worktreeManager = { removeAll, prune };

    await (
      orchestrator as unknown as { cleanup: () => Promise<void> }
    ).cleanup();

    expect(removeAll).toHaveBeenCalledTimes(0);
    expect(prune).toHaveBeenCalledTimes(0);
  });

  it("exits early when no tasks are available in the backlog", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const spawnAgent = mock(async (_index: number) => undefined);
    const orchestrator = new AgentOrchestrator(baseConfig);

    (
      orchestrator as unknown as {
        isRunning: boolean;
        resolveSprintId: () => Promise<string>;
        getAvailableTasks: () => Promise<Array<{ id: string }>>;
        spawnAgent: (index: number) => Promise<void>;
      }
    ).isRunning = true;

    (
      orchestrator as unknown as {
        resolveSprintId: () => Promise<string>;
      }
    ).resolveSprintId = async () => "";

    (
      orchestrator as unknown as {
        getAvailableTasks: () => Promise<Array<{ id: string }>>;
      }
    ).getAvailableTasks = async () => [];

    (
      orchestrator as unknown as {
        spawnAgent: (index: number) => Promise<void>;
      }
    ).spawnAgent = spawnAgent;

    await (
      orchestrator as unknown as { orchestrationLoop: () => Promise<void> }
    ).orchestrationLoop();

    expect(spawnAgent).toHaveBeenCalledTimes(0);
  });
});
