/**
 * Run state persistence — tracks sprint/parallel execution progress.
 * Enables resume after failure with `locus run --resume`.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { RunState, RunTask } from "../types.js";
import { getLogger } from "./logger.js";

// ─── Paths ──────────────────────────────────────────────────────────────────

function getRunStatePath(projectRoot: string): string {
  return join(projectRoot, ".locus", "run-state.json");
}

// ─── Load / Save ────────────────────────────────────────────────────────────

/** Load the current run state, or null if no active run. */
export function loadRunState(projectRoot: string): RunState | null {
  const path = getRunStatePath(projectRoot);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    getLogger().warn("Corrupted run-state.json, ignoring");
    return null;
  }
}

/** Save run state to disk. */
export function saveRunState(projectRoot: string, state: RunState): void {
  const path = getRunStatePath(projectRoot);
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

/** Clear run state (on successful completion or manual clear). */
export function clearRunState(projectRoot: string): void {
  const path = getRunStatePath(projectRoot);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

// ─── State Mutations ────────────────────────────────────────────────────────

/** Create a new run state for a sprint. */
export function createSprintRunState(
  sprint: string,
  branch: string,
  issues: { number: number; order: number }[]
): RunState {
  return {
    runId: `run-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}`,
    type: "sprint",
    sprint,
    branch,
    startedAt: new Date().toISOString(),
    tasks: issues.map(({ number, order }) => ({
      issue: number,
      order,
      status: "pending" as const,
    })),
  };
}

/** Create a new run state for parallel execution. */
export function createParallelRunState(issueNumbers: number[]): RunState {
  return {
    runId: `run-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}`,
    type: "parallel",
    startedAt: new Date().toISOString(),
    tasks: issueNumbers.map((issue, i) => ({
      issue,
      order: i + 1,
      status: "pending" as const,
    })),
  };
}

/** Mark a task as in-progress. */
export function markTaskInProgress(state: RunState, issueNumber: number): void {
  const task = state.tasks.find((t) => t.issue === issueNumber);
  if (task) {
    task.status = "in_progress";
  }
}

/** Mark a task as done with the PR number. */
export function markTaskDone(
  state: RunState,
  issueNumber: number,
  prNumber?: number
): void {
  const task = state.tasks.find((t) => t.issue === issueNumber);
  if (task) {
    task.status = "done";
    task.completedAt = new Date().toISOString();
    if (prNumber) task.pr = prNumber;
  }
}

/** Mark a task as failed with an error message. */
export function markTaskFailed(
  state: RunState,
  issueNumber: number,
  error: string
): void {
  const task = state.tasks.find((t) => t.issue === issueNumber);
  if (task) {
    task.status = "failed";
    task.failedAt = new Date().toISOString();
    task.error = error;
  }
}

/** Get summary stats from a run state. */
export function getRunStats(state: RunState): {
  total: number;
  done: number;
  failed: number;
  pending: number;
  inProgress: number;
} {
  const tasks = state.tasks;
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
  };
}

/** Get the next pending or failed task (for resume). */
export function getNextTask(state: RunState): RunTask | null {
  // First try to find a failed task (retry)
  const failed = state.tasks.find((t) => t.status === "failed");
  if (failed) return failed;

  // Then find the next pending task
  return state.tasks.find((t) => t.status === "pending") ?? null;
}
