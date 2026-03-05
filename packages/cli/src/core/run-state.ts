/**
 * Run state persistence — tracks sprint/parallel execution progress.
 * Enables resume after failure with `locus run --resume`.
 *
 * State is stored per-sprint in `.locus/run-state/<sprint-slug>.json`,
 * allowing independent pause/resume of multiple sprints.
 * Parallel (non-sprint) runs use `.locus/run-state/_parallel.json`.
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

function getRunStateDir(projectRoot: string): string {
  return join(projectRoot, ".locus", "run-state");
}

/** Slugify a sprint name for use as a filename. */
function sprintSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get the path to the run state file.
 * - With sprintName: `.locus/run-state/<slug>.json`
 * - Without: `.locus/run-state/_parallel.json`
 */
function getRunStatePath(projectRoot: string, sprintName?: string): string {
  const dir = getRunStateDir(projectRoot);
  if (sprintName) {
    return join(dir, `${sprintSlug(sprintName)}.json`);
  }
  return join(dir, "_parallel.json");
}

// ─── Load / Save ────────────────────────────────────────────────────────────

/**
 * Load run state for a specific sprint, or parallel state if no sprint given.
 */
export function loadRunState(
  projectRoot: string,
  sprintName?: string
): RunState | null {
  const path = getRunStatePath(projectRoot, sprintName);
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    getLogger().warn("Corrupted run state file, ignoring");
    return null;
  }
}

/** Save run state to disk. Path is derived from `state.sprint`. */
export function saveRunState(projectRoot: string, state: RunState): void {
  const path = getRunStatePath(projectRoot, state.sprint);
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

/**
 * Clear run state for a specific sprint, or parallel state if no sprint given.
 */
export function clearRunState(projectRoot: string, sprintName?: string): void {
  const path = getRunStatePath(projectRoot, sprintName);
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
