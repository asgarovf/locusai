/**
 * Node.js-only exports
 * This is a separate entry point for Node.js/CLI only
 * It should NOT be imported by browser applications
 *
 * These modules use Node.js APIs (fs, child_process, etc.)
 * and will break in browser environments
 */

// Node.js-only: Agent system
export * from "./agent/index.js";
// Node.js-only: AI clients
export * from "./ai/index.js";
// Node.js-only: Core utilities (uses fs)
export * from "./core/index.js";
export { PromptBuilder } from "./core/prompt-builder.js";
// Node.js-only: Exec streaming types
export * from "./exec/index.js";
// Node.js-only: Git & PR operations
export * from "./git/index.js";
// Re-export everything from main index (browser-safe)
export * from "./index.js";
// Node.js-only: Orchestrator
export {
  AgentOrchestrator,
  type AgentState,
  type OrchestratorConfig,
} from "./orchestrator.js";
// Node.js-only: Planning meeting pipeline
export * from "./planning/index.js";
// Node.js-only: Project knowledge base
export { KnowledgeBase } from "./project/knowledge-base.js";
// Utilities
export { c } from "./utils/colors.js";
export { extractJsonFromLLMOutput } from "./utils/json-extractor.js";
// Node.js-only: Worktree management for parallel agents
export * from "./worktree/index.js";
