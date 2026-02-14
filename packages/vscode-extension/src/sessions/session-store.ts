import type { Memento } from "vscode";
import type { PersistedSessionData } from "./types";

// ============================================================================
// Storage Key
// ============================================================================

/**
 * Workspace-scoped storage key prefix. Each workspace gets its own
 * session list, preventing cross-workspace contamination when using
 * `globalState` (which is shared across all workspaces by default).
 */
function storageKey(workspaceId: string): string {
  return `locusai.sessions.${workspaceId}`;
}

// ============================================================================
// Persisted Session Map (internal storage format)
// ============================================================================

type SessionMap = Record<string, PersistedSessionData>;

// ============================================================================
// SessionStore
// ============================================================================

/**
 * Persistence layer for session metadata. Wraps a VS Code `Memento`
 * (typically `ExtensionContext.globalState`) to store only serializable
 * session data. Process handles are never persisted.
 *
 * All reads are synchronous (Memento caches in memory); writes return
 * a `Thenable<void>` that resolves when the data is flushed to disk.
 */
export class SessionStore {
  private readonly memento: Memento;
  private readonly key: string;

  constructor(memento: Memento, workspaceId: string) {
    this.memento = memento;
    this.key = storageKey(workspaceId);
  }

  /**
   * Load all persisted sessions for this workspace.
   */
  getAll(): PersistedSessionData[] {
    const map = this.memento.get<SessionMap>(this.key, {});
    return Object.values(map);
  }

  /**
   * Load a single session by ID, or `undefined` if not found.
   */
  get(sessionId: string): PersistedSessionData | undefined {
    const map = this.memento.get<SessionMap>(this.key, {});
    return map[sessionId];
  }

  /**
   * Upsert a session entry. Merges into the existing session map.
   */
  save(data: PersistedSessionData): Thenable<void> {
    const map = this.memento.get<SessionMap>(this.key, {});
    map[data.sessionId] = data;
    return this.memento.update(this.key, map);
  }

  /**
   * Remove a session entry by ID.
   */
  remove(sessionId: string): Thenable<void> {
    const map = this.memento.get<SessionMap>(this.key, {});
    delete map[sessionId];
    return this.memento.update(this.key, map);
  }

  /**
   * Remove all session data for this workspace.
   */
  clear(): Thenable<void> {
    return this.memento.update(this.key, undefined);
  }
}
