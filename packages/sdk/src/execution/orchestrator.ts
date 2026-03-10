/**
 * Generic execution orchestrator for running tasks from any TaskProvider.
 *
 * Handles the lifecycle: load state → pick next task → mark in-progress →
 * execute callback → mark done/failed → save state → resume.
 *
 * The orchestrator is intentionally decoupled from AI execution details
 * (prompt building, sandbox management, worktrees, git operations).
 * Callers provide an `execute` callback that encapsulates provider- and
 * environment-specific logic.
 */

import type { ProviderIssue, TaskProvider } from "../task-provider.js";
import {
  type RunState,
  type RunStats,
  type RunTask,
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
} from "./run-state.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of executing a single task. */
export interface TaskResult {
  /** Whether execution succeeded. */
  success: boolean;
  /** PR number created for this task (if any). */
  prNumber?: number;
  /** Error message on failure. */
  error?: string;
  /** Optional summary of what was done. */
  summary?: string;
}

/** Options for `executeTaskRun`. */
export interface ExecutionOptions {
  /** The task provider to use for status updates and comments. */
  provider: TaskProvider;
  /** Tasks to execute. */
  tasks: ProviderIssue[];
  /** Execution mode: sequential (sprint) or parallel. */
  mode: "sequential" | "parallel";
  /** Project root directory (for run state persistence). */
  projectRoot: string;
  /** Whether to resume an existing run state. */
  resume?: boolean;
  /** Sprint/milestone/cycle name (for sprint runs). */
  sprintName?: string;
  /** Git branch name (for sprint runs). */
  branch?: string;
  /** Maximum concurrent tasks for parallel mode. Defaults to tasks.length. */
  maxConcurrent?: number;

  /**
   * Execute a single task. This callback encapsulates all provider- and
   * environment-specific logic (AI invocation, prompt building, sandbox, git).
   *
   * The orchestrator calls this for each task and handles state management
   * around it.
   */
  execute: (task: ProviderIssue, runState: RunState) => Promise<TaskResult>;

  // ── Lifecycle hooks (optional) ──────────────────────────────────────────

  /** Called when a task starts execution. */
  onTaskStart?: (task: ProviderIssue) => void;
  /** Called when a task completes successfully. */
  onTaskComplete?: (task: ProviderIssue, result: TaskResult) => void;
  /** Called when a task fails. */
  onTaskFailed?: (task: ProviderIssue, error: Error) => void;
  /** Whether to stop the entire run on the first failure (sprint mode). */
  stopOnFailure?: boolean;
}

/** Aggregated result of an entire run. */
export interface RunResult {
  /** Run state at completion. */
  state: RunState;
  /** Aggregated stats. */
  stats: RunStats;
  /** Per-task results keyed by task ID. */
  results: Map<string, TaskResult>;
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Execute a set of tasks using the provided TaskProvider for status management.
 *
 * The function:
 * 1. Creates or loads a RunState from `.locus/run-state/`
 * 2. For each task: calls `provider.markInProgress()`, runs the execute callback
 * 3. On success: calls `provider.markDone()`
 * 4. On failure: calls `provider.markFailed()`
 * 5. Saves RunState after each task (enabling resume)
 * 6. Returns aggregated results
 */
export async function executeTaskRun(
  options: ExecutionOptions,
): Promise<RunResult> {
  const {
    tasks,
    mode,
    projectRoot,
    sprintName,
    branch,
  } = options;

  // Build a lookup map from task ID to ProviderIssue
  const taskMap = new Map<string, ProviderIssue>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Load or create run state
  let state: RunState;
  if (options.resume) {
    const existing = loadRunState(projectRoot, sprintName);
    if (existing) {
      state = existing;
    } else {
      // No existing state to resume — create fresh
      state = createRunState(mode, tasks, sprintName, branch);
    }
  } else {
    state = createRunState(mode, tasks, sprintName, branch);
  }

  saveRunState(projectRoot, state);

  const results = new Map<string, TaskResult>();

  if (mode === "sequential") {
    await executeSequential(options, state, taskMap, results);
  } else {
    await executeParallel(options, state, taskMap, results);
  }

  // Clean up state on full success
  const stats = getRunStats(state);
  if (stats.failed === 0 && stats.pending === 0 && stats.inProgress === 0) {
    clearRunState(projectRoot, sprintName);
  }

  return { state, stats, results };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function createRunState(
  mode: "sequential" | "parallel",
  tasks: ProviderIssue[],
  sprintName?: string,
  branch?: string,
): RunState {
  if (mode === "sequential" && sprintName && branch) {
    return createSprintRunState(
      sprintName,
      branch,
      tasks.map((t, i) => ({ taskId: t.id, order: i + 1 })),
    );
  }
  return createParallelRunState(tasks.map((t) => t.id));
}

async function executeSequential(
  options: ExecutionOptions,
  state: RunState,
  taskMap: Map<string, ProviderIssue>,
  results: Map<string, TaskResult>,
): Promise<void> {
  const { provider, projectRoot, execute, stopOnFailure } = options;

  let runTask: RunTask | null = getNextTask(state);

  while (runTask) {
    const task = taskMap.get(runTask.taskId);
    if (!task) {
      markTaskFailed(state, runTask.taskId, "Task not found in provider");
      saveRunState(projectRoot, state);
      runTask = getNextTask(state);
      continue;
    }

    // Reset failed tasks for retry during resume
    if (runTask.status === "failed") {
      runTask.status = "pending";
      runTask.error = undefined;
      runTask.failedAt = undefined;
    }

    await executeSingleTask(options, state, task, provider, projectRoot, execute, results);

    // Check stop-on-failure
    const lastResult = results.get(task.id);
    if (lastResult && !lastResult.success && stopOnFailure) {
      break;
    }

    runTask = getNextTask(state);
  }
}

async function executeParallel(
  options: ExecutionOptions,
  state: RunState,
  taskMap: Map<string, ProviderIssue>,
  results: Map<string, TaskResult>,
): Promise<void> {
  const { provider, projectRoot, execute, maxConcurrent } = options;
  const batchSize = maxConcurrent ?? state.tasks.length;

  // Process in batches
  const pendingTasks = state.tasks.filter(
    (t) => t.status === "pending" || t.status === "failed",
  );

  for (let i = 0; i < pendingTasks.length; i += batchSize) {
    const batch = pendingTasks.slice(i, i + batchSize);

    const promises = batch.map(async (runTask) => {
      const task = taskMap.get(runTask.taskId);
      if (!task) {
        markTaskFailed(state, runTask.taskId, "Task not found in provider");
        saveRunState(projectRoot, state);
        return;
      }

      // Reset failed tasks for retry
      if (runTask.status === "failed") {
        runTask.status = "pending";
        runTask.error = undefined;
        runTask.failedAt = undefined;
      }

      await executeSingleTask(options, state, task, provider, projectRoot, execute, results);
    });

    await Promise.allSettled(promises);
  }
}

async function executeSingleTask(
  options: ExecutionOptions,
  state: RunState,
  task: ProviderIssue,
  provider: TaskProvider,
  projectRoot: string,
  execute: (task: ProviderIssue, runState: RunState) => Promise<TaskResult>,
  results: Map<string, TaskResult>,
): Promise<void> {
  // Mark in-progress in run state
  markTaskInProgress(state, task.id);
  saveRunState(projectRoot, state);

  // Mark in-progress in provider
  try {
    await provider.markInProgress(task.id);
  } catch {
    // Non-fatal — provider status update failure shouldn't block execution
  }

  // Notify hook
  options.onTaskStart?.(task);

  let result: TaskResult;
  try {
    result = await execute(task, state);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    result = { success: false, error: error.message };
    options.onTaskFailed?.(task, error);
  }

  results.set(task.id, result);

  if (result.success) {
    markTaskDone(state, task.id, result.prNumber);

    // Update provider status
    try {
      await provider.markDone(task.id, result.prNumber?.toString());
    } catch {
      // Non-fatal
    }

    // Post completion comment
    try {
      const comment = result.summary
        ? `Execution complete.\n\n${result.summary}${result.prNumber ? `\nPR: #${result.prNumber}` : ""}`
        : `Execution complete.${result.prNumber ? ` PR: #${result.prNumber}` : ""}`;
      await provider.postComment(task.id, comment);
    } catch {
      // Non-fatal
    }

    options.onTaskComplete?.(task, result);
  } else {
    markTaskFailed(state, task.id, result.error ?? "Unknown error");

    // Update provider status
    try {
      await provider.markFailed(task.id, result.error ?? "Unknown error");
    } catch {
      // Non-fatal
    }

    // Post failure comment
    try {
      await provider.postComment(
        task.id,
        `Execution failed.\n\n\`\`\`\n${(result.error ?? "Unknown error").slice(0, 1000)}\n\`\`\``,
      );
    } catch {
      // Non-fatal
    }

    if (!options.onTaskFailed) {
      // Only fire if not already fired from catch block above
    } else {
      options.onTaskFailed(task, new Error(result.error ?? "Unknown error"));
    }
  }

  saveRunState(projectRoot, state);
}
