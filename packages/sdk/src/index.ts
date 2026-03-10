/**
 * @locusai/sdk — SDK for building Locus-compatible community packages.
 *
 * @example
 * ```ts
 * import {
 *   readLocusConfig,
 *   invokeLocus,
 *   invokeLocusStream,
 *   createLogger,
 * } from "@locusai/sdk";
 * import type { LocusConfig, LocusPackageManifest } from "@locusai/sdk";
 * ```
 */

// Config
export { DEFAULT_CONFIG, readLocusConfig } from "./config.js";
// Invocation
export type { LocusInvokeResult } from "./invoke.js";
export { invokeLocus, invokeLocusStream } from "./invoke.js";
// Logger
export type { LocusLogger } from "./logger.js";
export { createLogger } from "./logger.js";
// Types
export type {
  AIProvider,
  LocusConfig,
  LocusPackageManifest,
} from "./types.js";
// Task Provider
export type {
  AuthResult,
  IssueFilters,
  ProviderComment,
  ProviderIssue,
  ProviderSprint,
  TaskProvider,
} from "./task-provider.js";
// Execution Engine
export type {
  RunState,
  RunTask,
  RunTaskStatus,
  RunStats,
  TaskResult,
  ExecutionOptions,
  RunResult,
} from "./execution/index.js";
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
  executeTaskRun,
} from "./execution/index.js";
