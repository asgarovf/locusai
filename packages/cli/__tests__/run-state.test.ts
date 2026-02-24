import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearRunState,
  createParallelRunState,
  createSprintRunState,
  getNextTask,
  getRunStats,
  loadRunState,
  markTaskDone,
  markTaskFailed,
  markTaskInProgress,
  saveRunState,
} from "../src/core/run-state.js";

const TEST_DIR = join(tmpdir(), `locus-test-runstate-${Date.now()}`);

describe("run-state", () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, ".locus"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("createSprintRunState", () => {
    it("creates state with correct structure", () => {
      const state = createSprintRunState("Sprint 1", "feat/sprint-1", [
        { number: 10, order: 1 },
        { number: 11, order: 2 },
        { number: 12, order: 3 },
      ]);

      expect(state.type).toBe("sprint");
      expect(state.sprint).toBe("Sprint 1");
      expect(state.branch).toBe("feat/sprint-1");
      expect(state.tasks.length).toBe(3);
      expect(state.tasks[0].issue).toBe(10);
      expect(state.tasks[0].order).toBe(1);
      expect(state.tasks[0].status).toBe("pending");
      expect(state.runId).toMatch(/^run-/);
      expect(state.startedAt).toBeTruthy();
    });
  });

  describe("createParallelRunState", () => {
    it("creates state with correct structure", () => {
      const state = createParallelRunState([5, 6, 7]);

      expect(state.type).toBe("parallel");
      expect(state.tasks.length).toBe(3);
      expect(state.tasks[0].issue).toBe(5);
      expect(state.tasks[0].order).toBe(1);
      expect(state.tasks[2].order).toBe(3);
    });
  });

  describe("save/load/clear", () => {
    it("round-trips state through save and load", () => {
      const state = createSprintRunState("S1", "b", [{ number: 1, order: 1 }]);
      saveRunState(TEST_DIR, state);

      const loaded = loadRunState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.runId).toBe(state.runId);
      expect(loaded?.tasks[0].issue).toBe(1);
    });

    it("returns null when no state file exists", () => {
      expect(loadRunState(TEST_DIR)).toBeNull();
    });

    it("clears state file", () => {
      const state = createSprintRunState("S1", "b", [{ number: 1, order: 1 }]);
      saveRunState(TEST_DIR, state);
      expect(loadRunState(TEST_DIR)).not.toBeNull();

      clearRunState(TEST_DIR);
      expect(loadRunState(TEST_DIR)).toBeNull();
    });

    it("clearRunState is idempotent", () => {
      clearRunState(TEST_DIR); // Should not throw
      clearRunState(TEST_DIR);
    });
  });

  describe("task mutations", () => {
    it("markTaskInProgress", () => {
      const state = createSprintRunState("S", "b", [
        { number: 1, order: 1 },
        { number: 2, order: 2 },
      ]);
      markTaskInProgress(state, 1);
      expect(state.tasks[0].status).toBe("in_progress");
      expect(state.tasks[1].status).toBe("pending");
    });

    it("markTaskDone", () => {
      const state = createSprintRunState("S", "b", [{ number: 1, order: 1 }]);
      markTaskInProgress(state, 1);
      markTaskDone(state, 1, 42);
      expect(state.tasks[0].status).toBe("done");
      expect(state.tasks[0].pr).toBe(42);
      expect(state.tasks[0].completedAt).toBeTruthy();
    });

    it("markTaskFailed", () => {
      const state = createSprintRunState("S", "b", [{ number: 1, order: 1 }]);
      markTaskInProgress(state, 1);
      markTaskFailed(state, 1, "Build failed");
      expect(state.tasks[0].status).toBe("failed");
      expect(state.tasks[0].error).toBe("Build failed");
      expect(state.tasks[0].failedAt).toBeTruthy();
    });

    it("handles non-existent issue gracefully", () => {
      const state = createSprintRunState("S", "b", [{ number: 1, order: 1 }]);
      markTaskInProgress(state, 999); // Should not throw
      expect(state.tasks[0].status).toBe("pending");
    });
  });

  describe("getRunStats", () => {
    it("returns correct counts", () => {
      const state = createSprintRunState("S", "b", [
        { number: 1, order: 1 },
        { number: 2, order: 2 },
        { number: 3, order: 3 },
        { number: 4, order: 4 },
      ]);
      markTaskDone(state, 1);
      markTaskInProgress(state, 2);
      markTaskFailed(state, 3, "error");

      const stats = getRunStats(state);
      expect(stats.total).toBe(4);
      expect(stats.done).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe("getNextTask", () => {
    it("returns first pending task", () => {
      const state = createSprintRunState("S", "b", [
        { number: 1, order: 1 },
        { number: 2, order: 2 },
      ]);
      markTaskDone(state, 1);

      const next = getNextTask(state);
      expect(next?.issue).toBe(2);
      expect(next?.status).toBe("pending");
    });

    it("prioritizes failed tasks for retry", () => {
      const state = createSprintRunState("S", "b", [
        { number: 1, order: 1 },
        { number: 2, order: 2 },
        { number: 3, order: 3 },
      ]);
      markTaskDone(state, 1);
      markTaskFailed(state, 2, "error");

      const next = getNextTask(state);
      expect(next?.issue).toBe(2);
      expect(next?.status).toBe("failed");
    });

    it("returns null when all tasks are done", () => {
      const state = createSprintRunState("S", "b", [{ number: 1, order: 1 }]);
      markTaskDone(state, 1);

      expect(getNextTask(state)).toBeNull();
    });
  });
});
