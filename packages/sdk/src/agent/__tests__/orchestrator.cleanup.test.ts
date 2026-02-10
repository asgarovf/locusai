import { afterEach, describe, expect, it, mock } from "bun:test";
import { AgentOrchestrator } from "../../orchestrator.js";

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

  it("starts reviewer-only mode when backlog is empty but unreviewed PRs exist", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const spawnReviewer = mock(async () => undefined);
    const spawnAgent = mock(async (_index: number) => undefined);
    const orchestrator = new AgentOrchestrator(baseConfig);

    (
      orchestrator as unknown as {
        isRunning: boolean;
        resolveSprintId: () => Promise<string>;
        getAvailableTasks: () => Promise<Array<{ id: string }>>;
        getUnreviewedPrs: () => Array<{ number: number; title: string; url: string; branch: string }>;
        startHeartbeatMonitor: () => void;
        spawnAgent: (index: number) => Promise<void>;
        spawnReviewer: () => Promise<void>;
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
        getUnreviewedPrs: () => Array<{ number: number; title: string; url: string; branch: string }>;
      }
    ).getUnreviewedPrs = () => [{ number: 1, title: "[Locus] Task 1", url: "https://github.com/test/repo/pull/1", branch: "agent/task-1" }];

    (
      orchestrator as unknown as { startHeartbeatMonitor: () => void }
    ).startHeartbeatMonitor = () => undefined;

    (
      orchestrator as unknown as {
        spawnAgent: (index: number) => Promise<void>;
      }
    ).spawnAgent = spawnAgent;
    (
      orchestrator as unknown as { spawnReviewer: () => Promise<void> }
    ).spawnReviewer = spawnReviewer;

    await (
      orchestrator as unknown as { orchestrationLoop: () => Promise<void> }
    ).orchestrationLoop();

    expect(spawnAgent).toHaveBeenCalledTimes(0);
    expect(spawnReviewer).toHaveBeenCalledTimes(1);
  });

  it("exits early when neither backlog nor review tasks are available", async () => {
    console.log = mock(() => undefined) as typeof console.log;

    const spawnReviewer = mock(async () => undefined);
    const spawnAgent = mock(async (_index: number) => undefined);
    const orchestrator = new AgentOrchestrator(baseConfig);

    (
      orchestrator as unknown as {
        isRunning: boolean;
        resolveSprintId: () => Promise<string>;
        getAvailableTasks: () => Promise<Array<{ id: string }>>;
        getUnreviewedPrs: () => Array<{ number: number; title: string; url: string; branch: string }>;
        spawnAgent: (index: number) => Promise<void>;
        spawnReviewer: () => Promise<void>;
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
        getUnreviewedPrs: () => Array<{ number: number; title: string; url: string; branch: string }>;
      }
    ).getUnreviewedPrs = () => [];

    (
      orchestrator as unknown as {
        spawnAgent: (index: number) => Promise<void>;
      }
    ).spawnAgent = spawnAgent;
    (
      orchestrator as unknown as { spawnReviewer: () => Promise<void> }
    ).spawnReviewer = spawnReviewer;

    await (
      orchestrator as unknown as { orchestrationLoop: () => Promise<void> }
    ).orchestrationLoop();

    expect(spawnAgent).toHaveBeenCalledTimes(0);
    expect(spawnReviewer).toHaveBeenCalledTimes(0);
  });
});
