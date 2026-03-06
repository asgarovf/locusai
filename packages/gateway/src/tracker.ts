/**
 * CommandTracker — tracks active commands per session for visibility,
 * cleanup, and conflict detection.
 *
 * Generalized from the Telegram-specific tracker to work with
 * string-based session IDs across any platform.
 */

import type { ChildProcess } from "node:child_process";
import type {
  ActiveCommand,
  ConflictResult,
  ExclusivityGroup,
} from "./types.js";

// ─── Exclusivity Groups ─────────────────────────────────────────────────────

/** Workspace-mutating commands — only one at a time per session. */
const WORKSPACE_EXCLUSIVE = new Set(["run", "plan", "iterate", "exec"]);

/** Git-write commands — only one at a time per session. */
const GIT_EXCLUSIVE = new Set(["stage", "commit", "checkout", "stash", "pr"]);

/** Returns the exclusivity group a command belongs to, or null if non-exclusive. */
function getExclusivityGroup(command: string): ExclusivityGroup | null {
  if (WORKSPACE_EXCLUSIVE.has(command)) return "workspace";
  if (GIT_EXCLUSIVE.has(command)) return "git";
  return null;
}

// ─── Tracker ────────────────────────────────────────────────────────────────

let nextId = 1;

export class CommandTracker {
  private active = new Map<string, ActiveCommand[]>();

  /** Register a new command for a session. Returns the assigned tracking ID. */
  track(
    sessionId: string,
    command: string,
    args: string[],
    childProcess: ChildProcess | null = null
  ): string {
    const id = String(nextId++);
    const entry: ActiveCommand = {
      id,
      command,
      args,
      childProcess,
      startedAt: new Date(),
    };

    const list = this.active.get(sessionId);
    if (list) {
      list.push(entry);
    } else {
      this.active.set(sessionId, [entry]);
    }

    return id;
  }

  /** Remove a tracked command by session and ID. */
  untrack(sessionId: string, id: string): void {
    const list = this.active.get(sessionId);
    if (!list) return;

    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) list.splice(idx, 1);

    if (list.length === 0) this.active.delete(sessionId);
  }

  /** Get all active commands for a session. */
  getActive(sessionId: string): readonly ActiveCommand[] {
    return this.active.get(sessionId) ?? [];
  }

  /** Check if a command would conflict with an already-running exclusive command. */
  checkExclusiveConflict(
    sessionId: string,
    command: string
  ): ConflictResult | null {
    const group = getExclusivityGroup(command);
    if (!group) return null;

    const list = this.active.get(sessionId);
    if (!list) return null;

    for (const entry of list) {
      if (getExclusivityGroup(entry.command) === group) {
        return { blocked: true, runningCommand: entry, group };
      }
    }

    return null;
  }

  /** Kill a specific command's child process and untrack it. */
  kill(sessionId: string, id: string): boolean {
    const list = this.active.get(sessionId);
    if (!list) return false;

    const entry = list.find((c) => c.id === id);
    if (!entry) return false;

    if (entry.childProcess && !entry.childProcess.killed) {
      entry.childProcess.kill("SIGTERM");
    }

    this.untrack(sessionId, id);
    return true;
  }

  /** Kill all active commands for a session. */
  killAll(sessionId: string): number {
    const list = this.active.get(sessionId);
    if (!list) return 0;

    let killed = 0;
    for (const entry of list) {
      if (entry.childProcess && !entry.childProcess.killed) {
        entry.childProcess.kill("SIGTERM");
      }
      killed++;
    }

    this.active.delete(sessionId);
    return killed;
  }
}
