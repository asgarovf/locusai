/**
 * Standardized logging utilities for Locus packages.
 *
 * Re-exports core logger types from SDK and adds CLI-specific factories.
 */

import { c } from "@locusai/sdk/node";

export type { LogFn } from "@locusai/sdk/node";
// Re-export core logging primitives from SDK
export { createWorkerLogger, noopLogger } from "@locusai/sdk/node";

/**
 * Creates a CLI-style logger with colored icons.
 * Used by CLI commands (discuss, plan, docs, review) for consistent output.
 *
 * Output format: `  ● message` (with level-appropriate icon and color)
 */
export function createCliLogger() {
  return (message: string, level?: "info" | "success" | "warn" | "error") => {
    const icon =
      level === "success"
        ? c.success("✔")
        : level === "error"
          ? c.error("✖")
          : level === "warn"
            ? c.warning("!")
            : c.info("●");
    console.log(`  ${icon} ${message}`);
  };
}
