import { afterEach, describe, expect, it, mock } from "bun:test";
import { TaskStatus } from "@locusai/shared";

type ExitFn = (code?: number) => never;

const baseConfig = {
  agentId: "agent-12345678",
  workspaceId: "workspace-1",
  apiBase: "http://localhost:3000",
  projectPath: ".",
  apiKey: "test-key",
  useWorktrees: false,
  autoPush: false,
} as const;

describe("AgentWorker no-change handling", () => {
  const originalExit = process.exit as ExitFn;

  afterEach(() => {
    process.exit = originalExit;
  });

  it("marks task as BLOCKED when execution succeeds with no file changes", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = "bun-test";
    const { AgentWorker } = await import("../worker.js");
    process.argv[1] = originalArgv1;

    const worker = new AgentWorker(baseConfig);

    const updates: Array<{
      id: string;
      workspaceId: string;
      payload: unknown;
    }> = [];
    const comments: Array<{
      id: string;
      workspaceId: string;
      payload: { text: string };
    }> = [];

    const heartbeat = mock(async () => undefined);

    const taskApi = {
      update: async (id: string, workspaceId: string, payload: unknown) => {
        updates.push({ id, workspaceId, payload });
      },
      addComment: async (
        id: string,
        workspaceId: string,
        payload: { text: string }
      ) => {
        comments.push({ id, workspaceId, payload });
      },
    };

    (worker as unknown as { client: unknown }).client = {
      tasks: taskApi,
      workspaces: { heartbeat },
    };

    (
      worker as unknown as { getActiveSprint: () => Promise<null> }
    ).getActiveSprint = async () => null;

    let dispatchCount = 0;
    (
      worker as unknown as {
        getNextTask: () => Promise<{ id: string; title: string } | null>;
      }
    ).getNextTask = async () => {
      dispatchCount += 1;
      if (dispatchCount === 1) {
        return { id: "task-1", title: "Investigate flaky tests" };
      }
      return null;
    };

    (
      worker as unknown as {
        executeTask: () => Promise<{
          success: boolean;
          summary: string;
          noChanges: boolean;
        }>;
      }
    ).executeTask = async () => ({
      success: true,
      summary: "Agent requested clarification.",
      noChanges: true,
    });

    (worker as unknown as { startHeartbeat: () => void }).startHeartbeat = () =>
      undefined;
    (worker as unknown as { stopHeartbeat: () => void }).stopHeartbeat = () =>
      undefined;
    (
      worker as unknown as { delayAfterCleanup: () => Promise<void> }
    ).delayAfterCleanup = async () => Promise.resolve();

    const exitMock = mock((_code?: number) => {
      return undefined as never;
    });
    process.exit = exitMock as ExitFn;

    await worker.run();

    expect(updates).toHaveLength(1);
    expect(updates[0]?.payload).toEqual({
      status: TaskStatus.BLOCKED,
      assignedTo: null,
    });

    expect(comments).toHaveLength(1);
    expect(comments[0]?.payload.text).toContain("no file changes");
  });

  it("marks task as IN_REVIEW when execution succeeds without PR URL", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = "bun-test";
    const { AgentWorker } = await import("../worker.js");
    process.argv[1] = originalArgv1;

    const worker = new AgentWorker(baseConfig);

    const updates: Array<{
      id: string;
      workspaceId: string;
      payload: unknown;
    }> = [];
    const comments: Array<{
      id: string;
      workspaceId: string;
      payload: { text: string };
    }> = [];

    const heartbeat = mock(async () => undefined);

    const taskApi = {
      update: async (id: string, workspaceId: string, payload: unknown) => {
        updates.push({ id, workspaceId, payload });
      },
      addComment: async (
        id: string,
        workspaceId: string,
        payload: { text: string }
      ) => {
        comments.push({ id, workspaceId, payload });
      },
      getById: async () => ({
        id: "task-2",
        title: "Add telemetry guardrails",
      }),
    };

    (worker as unknown as { client: unknown }).client = {
      tasks: taskApi,
      workspaces: { heartbeat },
    };

    (
      worker as unknown as { getActiveSprint: () => Promise<null> }
    ).getActiveSprint = async () => null;

    let dispatchCount = 0;
    (
      worker as unknown as {
        getNextTask: () => Promise<{ id: string; title: string } | null>;
      }
    ).getNextTask = async () => {
      dispatchCount += 1;
      if (dispatchCount === 1) {
        return { id: "task-2", title: "Add telemetry guardrails" };
      }
      return null;
    };

    (
      worker as unknown as {
        executeTask: () => Promise<{
          success: boolean;
          summary: string;
          branch: string;
        }>;
      }
    ).executeTask = async () => ({
      success: true,
      summary: "Implemented guardrails and tests.",
      branch: "agent/task-2-add-telemetry-guardrails",
    });

    (worker as unknown as { startHeartbeat: () => void }).startHeartbeat = () =>
      undefined;
    (worker as unknown as { stopHeartbeat: () => void }).stopHeartbeat = () =>
      undefined;
    (
      worker as unknown as { delayAfterCleanup: () => Promise<void> }
    ).delayAfterCleanup = async () => Promise.resolve();
    (worker as unknown as { updateProgress: () => void }).updateProgress = () =>
      undefined;
    (worker as unknown as { knowledgeBase: unknown }).knowledgeBase = {
      updateProgress: () => undefined,
    };

    const exitMock = mock((_code?: number) => {
      return undefined as never;
    });
    process.exit = exitMock as ExitFn;

    await worker.run();

    expect(updates).toHaveLength(1);
    expect(updates[0]?.payload).toEqual({
      status: TaskStatus.IN_REVIEW,
    });

    expect(comments).toHaveLength(1);
    expect(comments[0]?.payload.text).toContain(
      "agent/task-2-add-telemetry-guardrails"
    );
  });

  it("forwards the task branch base when creating a PR", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = "bun-test";
    const { AgentWorker } = await import("../worker.js");
    process.argv[1] = originalArgv1;

    const worker = new AgentWorker({ ...baseConfig, autoPush: true });
    const createPr = mock(() => ({
      url: "https://github.com/example/repo/pull/42",
      number: 42,
    }));

    (
      worker as unknown as {
        prService: {
          createPr: (options: Record<string, unknown>) => {
            url: string;
            number: number;
          };
        };
      }
    ).prService = { createPr };

    const task = {
      id: "task-3",
      title: "Ship release branch support",
      description: "",
      acceptanceChecklist: [],
    };

    const result = (
      worker as unknown as {
        createPullRequest: (
          task: Record<string, unknown>,
          branch: string,
          summary?: string,
          baseBranch?: string
        ) => { url: string | null; error?: string };
      }
    ).createPullRequest(
      task,
      "agent/task-3-ship-release-branch-support",
      "Implemented release branch targeting.",
      "release/2026.02"
    );

    expect(result).toEqual({ url: "https://github.com/example/repo/pull/42" });
    expect(createPr).toHaveBeenCalledWith(
      expect.objectContaining({
        baseBranch: "release/2026.02",
      })
    );
  });
});
