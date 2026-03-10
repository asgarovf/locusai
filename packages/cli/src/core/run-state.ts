/**
 * Run state persistence — re-exports from @locusai/sdk execution module.
 *
 * The canonical implementation lives in packages/sdk/src/execution/run-state.ts.
 * This file re-exports everything for backward compatibility with existing CLI
 * imports.
 */

export type {
  RunState,
  RunTask,
  RunTaskStatus,
  RunStats,
} from "@locusai/sdk";

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
} from "@locusai/sdk";
