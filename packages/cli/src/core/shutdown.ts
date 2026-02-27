/**
 * Graceful shutdown handling.
 *
 * Captures SIGINT/SIGTERM during sprint/parallel execution,
 * saves run state, cleans up active Docker sandboxes,
 * and provides recovery instructions.
 */

import { execSync } from "node:child_process";
import type { RunState } from "../types.js";
import { saveRunState } from "./run-state.js";

export interface ShutdownContext {
  projectRoot: string;
  getRunState: () => RunState | null;
  onShutdown?: () => void;
}

let shutdownRegistered = false;
let shutdownContext: ShutdownContext | null = null;
let interruptCount = 0;
let interruptTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Active Sandbox Registry ─────────────────────────────────────────────────

const activeSandboxes = new Set<string>();

/** Register a sandbox name so it can be cleaned up on shutdown. */
export function registerActiveSandbox(name: string): void {
  activeSandboxes.add(name);
}

/** Unregister a sandbox (e.g. after normal cleanup). */
export function unregisterActiveSandbox(name: string): void {
  activeSandboxes.delete(name);
}

/** Clean up all registered sandboxes. Called during shutdown. */
function cleanupActiveSandboxes(): void {
  for (const name of activeSandboxes) {
    try {
      execSync(`docker sandbox rm ${name}`, { timeout: 10000 });
    } catch {
      // Sandbox may already be stopped — that's fine
    }
  }
  activeSandboxes.clear();
}

/**
 * Register graceful shutdown handlers for a run.
 * First SIGINT = save state + exit cleanly.
 * Second SIGINT within 2s = force exit.
 */
export function registerShutdownHandlers(ctx: ShutdownContext): () => void {
  shutdownContext = ctx;
  interruptCount = 0;

  const handler = () => {
    interruptCount++;

    if (interruptCount >= 2) {
      // Second interrupt — force exit
      process.stderr.write("\nForce exit.\n");
      process.exit(1);
    }

    // First interrupt — graceful shutdown
    process.stderr.write("\n\nInterrupted. Saving state...\n");

    const state = shutdownContext?.getRunState?.();
    if (state && shutdownContext) {
      // Mark any in-progress tasks as interrupted by user.
      // Resume flow retries failed tasks first, so this remains resumable.
      for (const task of state.tasks) {
        if (task.status === "in_progress") {
          task.status = "failed";
          task.failedAt = new Date().toISOString();
          task.error = "Interrupted by user";
        }
      }

      try {
        saveRunState(shutdownContext.projectRoot, state);
        process.stderr.write(`State saved. Resume with: locus run --resume\n`);
      } catch {
        process.stderr.write("Warning: Could not save run state.\n");
      }
    }

    // Clean up any active Docker sandboxes before exiting
    cleanupActiveSandboxes();

    shutdownContext?.onShutdown?.();

    // Reset interrupt count after 2 seconds
    if (interruptTimer) clearTimeout(interruptTimer);
    interruptTimer = setTimeout(() => {
      interruptCount = 0;
    }, 2000);

    // Give time for the message to flush, then exit
    setTimeout(() => {
      process.exit(130); // 128 + SIGINT(2)
    }, 100);
  };

  if (!shutdownRegistered) {
    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
    shutdownRegistered = true;
  }

  // Return cleanup function
  return () => {
    process.removeListener("SIGINT", handler);
    process.removeListener("SIGTERM", handler);
    shutdownRegistered = false;
    shutdownContext = null;
    interruptCount = 0;
    if (interruptTimer) {
      clearTimeout(interruptTimer);
      interruptTimer = null;
    }
  };
}

/** Reset shutdown state (for testing). */
export function resetShutdownState(): void {
  shutdownRegistered = false;
  shutdownContext = null;
  interruptCount = 0;
  activeSandboxes.clear();
  if (interruptTimer) {
    clearTimeout(interruptTimer);
    interruptTimer = null;
  }
}
