/**
 * CommandTracker — tracks active commands per chat for visibility,
 * cleanup, and conflict detection.
 *
 * Exported as a singleton for cross-module use.
 */

import type { ChildProcess } from "node:child_process";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveCommand {
  id: string;
  command: string;
  args: string[];
  childProcess: ChildProcess | null;
  startedAt: Date;
}

// ─── Tracker ────────────────────────────────────────────────────────────────

let nextId = 1;

class CommandTracker {
  private active = new Map<number, ActiveCommand[]>();

  /** Register a new command for a chat. Returns the assigned tracking ID. */
  track(
    chatId: number,
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

    const list = this.active.get(chatId);
    if (list) {
      list.push(entry);
    } else {
      this.active.set(chatId, [entry]);
    }

    return id;
  }

  /** Remove a tracked command by chat and ID. */
  untrack(chatId: number, id: string): void {
    const list = this.active.get(chatId);
    if (!list) return;

    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) list.splice(idx, 1);

    if (list.length === 0) this.active.delete(chatId);
  }

  /** Get all active commands for a chat. */
  getActive(chatId: number): readonly ActiveCommand[] {
    return this.active.get(chatId) ?? [];
  }

  /** Kill a specific command's child process and untrack it. */
  kill(chatId: number, id: string): boolean {
    const list = this.active.get(chatId);
    if (!list) return false;

    const entry = list.find((c) => c.id === id);
    if (!entry) return false;

    if (entry.childProcess && !entry.childProcess.killed) {
      entry.childProcess.kill("SIGTERM");
    }

    this.untrack(chatId, id);
    return true;
  }

  /** Kill all active commands for a chat. */
  killAll(chatId: number): number {
    const list = this.active.get(chatId);
    if (!list) return 0;

    let killed = 0;
    for (const entry of list) {
      if (entry.childProcess && !entry.childProcess.killed) {
        entry.childProcess.kill("SIGTERM");
      }
      killed++;
    }

    this.active.delete(chatId);
    return killed;
  }
}

/** Singleton tracker instance. */
export const commandTracker = new CommandTracker();
