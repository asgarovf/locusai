/**
 * Session manager — CRUD for REPL sessions.
 * Sessions are persisted as JSON files in .locus/sessions/.
 */

import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { getLogger } from "../core/logger.js";
import type { AIProvider, Session, SessionMessage } from "../types.js";

const MAX_SESSIONS = 50;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class SessionManager {
  private sessionsDir: string;

  constructor(projectRoot: string) {
    this.sessionsDir = join(projectRoot, ".locus", "sessions");
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /** Create a new session. */
  create(options: {
    cwd: string;
    branch: string;
    provider: AIProvider;
    model: string;
  }): Session {
    const id = this.generateId();
    const now = new Date().toISOString();

    const session: Session = {
      id,
      created: now,
      updated: now,
      metadata: {
        cwd: options.cwd,
        branch: options.branch,
        provider: options.provider,
        model: options.model,
        totalTokens: 0,
        totalTools: 0,
      },
      messages: [],
    };

    this.prune();
    return session;
  }

  /** Check whether a session file exists on disk. */
  isPersisted(sessionOrId: Session | string): boolean {
    const sessionId =
      typeof sessionOrId === "string" ? sessionOrId : sessionOrId.id;
    return existsSync(this.getSessionPath(sessionId));
  }

  /** Load a session by full or partial ID. */
  load(idOrPrefix: string): Session | null {
    const files = this.listSessionFiles();

    // Try exact match first
    const exactPath = this.getSessionPath(idOrPrefix);
    if (existsSync(exactPath)) {
      try {
        return JSON.parse(readFileSync(exactPath, "utf-8"));
      } catch {
        return null;
      }
    }

    // Try partial ID match (like git commit hashes)
    const matches = files.filter((f) =>
      basename(f, ".json").startsWith(idOrPrefix)
    );

    if (matches.length === 1) {
      try {
        return JSON.parse(readFileSync(matches[0], "utf-8"));
      } catch {
        return null;
      }
    }

    if (matches.length > 1) {
      getLogger().warn(
        `Ambiguous session ID "${idOrPrefix}" — matches ${matches.length} sessions`
      );
    }

    return null;
  }

  /** Save a session to disk. */
  save(session: Session): void {
    session.updated = new Date().toISOString();
    const path = this.getSessionPath(session.id);
    writeFileSync(path, `${JSON.stringify(session, null, 2)}\n`, "utf-8");
  }

  /** Add a message to a session and save. */
  addMessage(session: Session, message: SessionMessage): void {
    session.messages.push(message);
    this.save(session);
  }

  /** List all sessions (most recent first). */
  list(): Array<{
    id: string;
    created: string;
    updated: string;
    messageCount: number;
    provider: string;
    model: string;
  }> {
    const files = this.listSessionFiles();
    const sessions: Array<{
      id: string;
      created: string;
      updated: string;
      messageCount: number;
      provider: string;
      model: string;
    }> = [];

    for (const file of files) {
      try {
        const session: Session = JSON.parse(readFileSync(file, "utf-8"));
        sessions.push({
          id: session.id,
          created: session.created,
          updated: session.updated,
          messageCount: session.messages.length,
          provider: session.metadata.provider,
          model: session.metadata.model,
        });
      } catch {
        // Skip corrupted session files
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
  }

  /** Delete a session by ID. */
  delete(sessionId: string): boolean {
    const path = this.getSessionPath(sessionId);
    if (existsSync(path)) {
      unlinkSync(path);
      return true;
    }
    return false;
  }

  /** Prune old sessions (max count and max age). */
  prune(): number {
    const files = this.listSessionFiles();
    const now = Date.now();
    let pruned = 0;

    // Sort by modification time (oldest first)
    const withStats = files.map((f) => {
      try {
        const session: Session = JSON.parse(readFileSync(f, "utf-8"));
        return { path: f, updated: new Date(session.updated).getTime() };
      } catch {
        return { path: f, updated: 0 };
      }
    });

    withStats.sort((a, b) => a.updated - b.updated);

    // Prune by age
    for (const entry of withStats) {
      if (now - entry.updated > SESSION_MAX_AGE_MS) {
        try {
          unlinkSync(entry.path);
          pruned++;
        } catch {
          // Ignore
        }
      }
    }

    // Prune by count (remove oldest first)
    const remaining = withStats.length - pruned;
    if (remaining > MAX_SESSIONS) {
      const toRemove = remaining - MAX_SESSIONS;
      const alive = withStats.filter((e) => existsSync(e.path));
      for (let i = 0; i < toRemove && i < alive.length; i++) {
        try {
          unlinkSync(alive[i].path);
          pruned++;
        } catch {
          // Ignore
        }
      }
    }

    if (pruned > 0) {
      getLogger().verbose(`Pruned ${pruned} old session(s)`);
    }

    return pruned;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private listSessionFiles(): string[] {
    try {
      return readdirSync(this.sessionsDir)
        .filter((f) => f.endsWith(".json") && !f.startsWith("."))
        .map((f) => join(this.sessionsDir, f));
    } catch {
      return [];
    }
  }

  private generateId(): string {
    // 6-byte random hex (12 chars) — similar to short git hashes
    return randomBytes(6).toString("hex");
  }

  private getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`);
  }
}
