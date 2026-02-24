import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunState } from "../src/types.js";
import {
  getNextTask,
  loadRunState,
  saveRunState,
} from "../src/core/run-state.js";

const testDir = join(tmpdir(), `locus-shutdown-test-${Date.now()}`);
const INTERRUPT_ERROR = "Interrupted by user";

function markInProgressTasksInterrupted(state: RunState): void {
  for (const task of state.tasks) {
    if (task.status === "in_progress") {
      task.status = "failed";
      task.failedAt = new Date().toISOString();
      task.error = INTERRUPT_ERROR;
    }
  }
}

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
});

describe("shutdown state preservation", () => {
  test("in_progress tasks are marked failed on interrupt simulation", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-001",
      type: "sprint",
      sprint: "v1",
      branch: "locus/sprint-v1",
      startedAt: new Date().toISOString(),
      tasks: [
        {
          issue: 1,
          order: 1,
          status: "done",
          completedAt: new Date().toISOString(),
        },
        { issue: 2, order: 2, status: "in_progress" },
        { issue: 3, order: 3, status: "pending" },
      ],
    };

    // Simulate what the shutdown handler does.
    markInProgressTasksInterrupted(state);

    saveRunState(testDir, state);

    const loaded = loadRunState(testDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.tasks[0].status).toBe("done");
    expect(loaded?.tasks[1].status).toBe("failed"); // was in_progress
    expect(loaded?.tasks[1].error).toBe(INTERRUPT_ERROR);
    expect(loaded?.tasks[2].status).toBe("pending");
  });

  test("state file is written atomically (valid JSON after save)", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-002",
      type: "parallel",
      startedAt: new Date().toISOString(),
      tasks: [
        { issue: 10, order: 1, status: "in_progress" },
        { issue: 11, order: 2, status: "pending" },
      ],
    };

    saveRunState(testDir, state);

    // File should be valid JSON
    const raw = readFileSync(
      join(testDir, ".locus", "run-state.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    expect(parsed.runId).toBe("run-test-002");
    expect(parsed.tasks).toHaveLength(2);
  });

  test("multiple in_progress tasks are all marked failed", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-003",
      type: "parallel",
      startedAt: new Date().toISOString(),
      tasks: [
        { issue: 20, order: 1, status: "in_progress" },
        { issue: 21, order: 2, status: "in_progress" },
        { issue: 22, order: 3, status: "in_progress" },
      ],
    };

    // Simulate shutdown handler.
    markInProgressTasksInterrupted(state);

    saveRunState(testDir, state);
    const loaded = loadRunState(testDir);
    expect(loaded?.tasks.every((t) => t.status === "failed")).toBe(true);
    expect(loaded?.tasks.every((t) => t.error === INTERRUPT_ERROR)).toBe(true);
  });

  test("done and failed tasks are preserved during shutdown", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-004",
      type: "sprint",
      sprint: "v2",
      branch: "locus/sprint-v2",
      startedAt: new Date().toISOString(),
      tasks: [
        {
          issue: 30,
          order: 1,
          status: "done",
          completedAt: "2026-01-01T00:00:00Z",
          pr: 100,
        },
        {
          issue: 31,
          order: 2,
          status: "failed",
          failedAt: "2026-01-01T01:00:00Z",
          error: "API limit",
        },
        { issue: 32, order: 3, status: "in_progress" },
        { issue: 33, order: 4, status: "pending" },
      ],
    };

    // Simulate shutdown.
    markInProgressTasksInterrupted(state);

    saveRunState(testDir, state);
    const loaded = loadRunState(testDir);

    expect(loaded?.tasks[0].status).toBe("done");
    expect(loaded?.tasks[0].pr).toBe(100);
    expect(loaded?.tasks[1].status).toBe("failed");
    expect(loaded?.tasks[1].error).toBe("API limit");
    expect(loaded?.tasks[2].status).toBe("failed");
    expect(loaded?.tasks[2].error).toBe(INTERRUPT_ERROR);
    expect(loaded?.tasks[3].status).toBe("pending");
  });

  test("shutdown with empty task list", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-005",
      type: "sprint",
      sprint: "empty",
      startedAt: new Date().toISOString(),
      tasks: [],
    };

    saveRunState(testDir, state);
    const loaded = loadRunState(testDir);
    expect(loaded?.tasks).toHaveLength(0);
  });

  test("resumed state retries interrupted task first after shutdown save", () => {
    mkdirSync(join(testDir, ".locus"), { recursive: true });

    const state: RunState = {
      runId: "run-test-006",
      type: "sprint",
      sprint: "resume-test",
      branch: "locus/sprint-resume-test",
      startedAt: new Date().toISOString(),
      tasks: [
        {
          issue: 40,
          order: 1,
          status: "done",
          completedAt: "2026-01-01T00:00:00Z",
        },
        { issue: 41, order: 2, status: "in_progress" },
        { issue: 42, order: 3, status: "pending" },
      ],
    };

    // Simulate shutdown.
    markInProgressTasksInterrupted(state);
    saveRunState(testDir, state);

    // Simulate resume — failed interrupted task should be retried first.
    const loaded = loadRunState(testDir);
    const next = loaded ? getNextTask(loaded) : null;
    expect(next?.issue).toBe(41); // The one that was in_progress
    expect(next?.status).toBe("failed");
    expect(next?.error).toBe(INTERRUPT_ERROR);
  });
});
