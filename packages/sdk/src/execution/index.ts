/**
 * Execution orchestration engine.
 *
 * Provides provider-agnostic run state management and task execution
 * orchestration. Any TaskProvider can plug into this engine.
 */

// Run state management
export type {
  RunState,
  RunTask,
  RunTaskStatus,
  RunStats,
} from "./run-state.js";
export {
  loadRunState,
  saveRunState,
  clearRunState,
  createSprintRunState,
  createParallelRunState,
  markTaskInProgress,
  markTaskDone,
  markTaskFailed,
  getRunStats,
  getNextTask,
  sprintSlug,
} from "./run-state.js";

// Orchestrator
export type {
  TaskResult,
  ExecutionOptions,
  RunResult,
} from "./orchestrator.js";
export { executeTaskRun } from "./orchestrator.js";
