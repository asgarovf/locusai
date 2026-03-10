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
