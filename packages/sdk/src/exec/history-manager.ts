import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { LOCUS_CONFIG } from "../core/config.js";

/**
 * Represents a single message in a conversation.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  metadata?: {
    toolsUsed?: string[];
    duration?: number;
  };
}

/**
 * Represents a complete conversation session.
 */
export interface ConversationSession {
  id: string;
  projectPath: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: {
    model: string;
    provider: string;
  };
}

/**
 * Filter options for searching/listing sessions.
 */
export interface SessionFilterOptions {
  /** Filter by text content in messages */
  query?: string;
  /** Filter sessions created after this timestamp */
  after?: number;
  /** Filter sessions created before this timestamp */
  before?: number;
  /** Maximum number of sessions to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Configuration options for HistoryManager.
 */
export interface HistoryManagerOptions {
  /** Maximum number of sessions to keep (default: 30) */
  maxSessions?: number;
  /** Custom history directory path */
  historyDir?: string;
}

const DEFAULT_MAX_SESSIONS = 30;

/**
 * Generates a unique session ID using timestamp and random string.
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `session-${timestamp}-${random}`;
}

/**
 * Manages conversation history persistence for exec sessions.
 *
 * Stores sessions as JSON files in `.locus/sessions/` directory.
 * Supports session save/load, listing, searching, and auto-pruning.
 *
 * @example
 * ```typescript
 * const history = new HistoryManager('/path/to/project');
 *
 * // Get or create current session
 * const session = await history.getCurrentSession();
 *
 * // Add a message
 * session.messages.push({
 *   role: 'user',
 *   content: 'Hello',
 *   timestamp: Date.now()
 * });
 *
 * // Save the session
 * await history.saveSession(session);
 * ```
 */
export class HistoryManager {
  private historyDir: string;
  private maxSessions: number;

  constructor(projectPath: string, options?: HistoryManagerOptions) {
    this.historyDir =
      options?.historyDir ??
      join(projectPath, LOCUS_CONFIG.dir, LOCUS_CONFIG.sessionsDir);
    this.maxSessions = options?.maxSessions ?? DEFAULT_MAX_SESSIONS;
    this.ensureHistoryDir();
  }

  /**
   * Ensure the history directory exists.
   */
  private ensureHistoryDir(): void {
    if (!existsSync(this.historyDir)) {
      mkdirSync(this.historyDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a session.
   */
  private getSessionPath(sessionId: string): string {
    return join(this.historyDir, `${sessionId}.json`);
  }

  /**
   * Save a session to disk.
   */
  saveSession(session: ConversationSession): void {
    const filePath = this.getSessionPath(session.id);
    session.updatedAt = Date.now();
    writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  }

  /**
   * Load a session from disk by ID.
   * @returns The session if found, null otherwise.
   */
  loadSession(sessionId: string): ConversationSession | null {
    const filePath = this.getSessionPath(sessionId);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content) as ConversationSession;
    } catch {
      return null;
    }
  }

  /**
   * Delete a session from disk.
   * @returns true if the session was deleted, false if it didn't exist.
   */
  deleteSession(sessionId: string): boolean {
    const filePath = this.getSessionPath(sessionId);

    if (!existsSync(filePath)) {
      return false;
    }

    try {
      rmSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all sessions, sorted by updatedAt (most recent first).
   */
  listSessions(options?: SessionFilterOptions): ConversationSession[] {
    const files = readdirSync(this.historyDir);
    let sessions: ConversationSession[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const session = this.loadSession(file.replace(".json", ""));
        if (session) {
          sessions.push(session);
        }
      }
    }

    // Sort by updatedAt descending (most recent first)
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);

    // Apply filters if provided
    if (options) {
      sessions = this.filterSessions(sessions, options);
    }

    return sessions;
  }

  /**
   * Apply filter options to a list of sessions.
   */
  private filterSessions(
    sessions: ConversationSession[],
    options: SessionFilterOptions
  ): ConversationSession[] {
    let filtered = sessions;

    // Filter by time range
    if (options.after !== undefined) {
      const after = options.after;
      filtered = filtered.filter((s) => s.createdAt >= after);
    }
    if (options.before !== undefined) {
      const before = options.before;
      filtered = filtered.filter((s) => s.createdAt <= before);
    }

    // Filter by query (search in message content)
    if (options.query) {
      const query = options.query.toLowerCase();
      filtered = filtered.filter((session) =>
        session.messages.some((msg) =>
          msg.content.toLowerCase().includes(query)
        )
      );
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? filtered.length;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  }

  /**
   * Search sessions by content query.
   * Returns sessions that contain the query in any message.
   */
  searchSessions(query: string, limit?: number): ConversationSession[] {
    return this.listSessions({ query, limit });
  }

  /**
   * Get or create the current (most recent) session.
   * If no sessions exist, creates a new one.
   */
  getCurrentSession(
    model = "claude-sonnet-4-5",
    provider = "claude"
  ): ConversationSession {
    const sessions = this.listSessions({ limit: 1 });

    if (sessions.length > 0) {
      return sessions[0];
    }

    return this.createNewSession(model, provider);
  }

  /**
   * Create a new session.
   */
  createNewSession(
    model = "claude-sonnet-4-5",
    provider = "claude"
  ): ConversationSession {
    const now = Date.now();
    return {
      id: generateSessionId(),
      projectPath: this.historyDir.replace(
        `/${LOCUS_CONFIG.dir}/${LOCUS_CONFIG.sessionsDir}`,
        ""
      ),
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        model,
        provider,
      },
    };
  }

  /**
   * Prune old sessions to keep only the most recent ones.
   * Deletes sessions beyond the maxSessions limit.
   * @returns Number of sessions deleted.
   */
  pruneSessions(): number {
    const sessions = this.listSessions();
    let deleted = 0;

    if (sessions.length > this.maxSessions) {
      const sessionsToDelete = sessions.slice(this.maxSessions);
      for (const session of sessionsToDelete) {
        if (this.deleteSession(session.id)) {
          deleted++;
        }
      }
    }

    return deleted;
  }

  /**
   * Get session count.
   */
  getSessionCount(): number {
    const files = readdirSync(this.historyDir);
    return files.filter((f) => f.endsWith(".json")).length;
  }

  /**
   * Check if a session exists.
   */
  sessionExists(sessionId: string): boolean {
    return existsSync(this.getSessionPath(sessionId));
  }

  /**
   * Find a session by partial ID match.
   * Supports both short IDs (last part of session ID) and partial matches.
   * @returns The matching session if found, null otherwise.
   */
  findSessionByPartialId(partialId: string): ConversationSession | null {
    const sessions = this.listSessions();

    // First try exact match
    const exact = sessions.find((s) => s.id === partialId);
    if (exact) return exact;

    // Try partial match (starts with or contains the partial ID)
    const partial = sessions.find(
      (s) => s.id.includes(partialId) || s.id.startsWith(`session-${partialId}`)
    );
    return partial ?? null;
  }

  /**
   * Get the history directory path.
   */
  getHistoryDir(): string {
    return this.historyDir;
  }

  /**
   * Clear all sessions from the history directory.
   * @returns Number of sessions deleted.
   */
  clearAllSessions(): number {
    const files = readdirSync(this.historyDir);
    let deleted = 0;

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          rmSync(join(this.historyDir, file));
          deleted++;
        } catch {
          // Silent fail for individual files
        }
      }
    }

    return deleted;
  }
}
