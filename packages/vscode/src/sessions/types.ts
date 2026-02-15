import type {
  ContextPayload,
  SessionStatus,
  TimelineEntry,
} from "@locusai/shared";
import type { CliBridge } from "../core/cli-bridge";

// ============================================================================
// Timeline Summary (serializable snapshot for persistence)
// ============================================================================

/**
 * Lightweight summary of a session's timeline, safe for globalState.
 * Full timeline entries are stored only while the session is active
 * in memory; this summary captures the essential counts and
 * last-known text for reload recovery.
 */
export interface TimelineSummary {
  messageCount: number;
  toolCount: number;
  /** Truncated last text content (for display in session lists). */
  lastText: string;
}

// ============================================================================
// Persisted Session Data (globalState-safe)
// ============================================================================

/**
 * Serializable session metadata stored in `ExtensionContext.globalState`.
 * Contains only JSON-serializable values — no process handles, no
 * event emitters, no class instances.
 */
export interface PersistedSessionData {
  sessionId: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  /** The user prompt that initiated this session. */
  prompt: string;
  /** Optional context payload from the editor at creation time. */
  context: ContextPayload | undefined;
  /** Optional model override. */
  model: string | undefined;
  /** Lightweight summary of the session timeline. */
  timelineSummary: TimelineSummary;
}

// ============================================================================
// Session Record (in-memory, runtime representation)
// ============================================================================

/**
 * Full in-memory session record. Extends persisted data with runtime
 * state that must never be serialized: the active process bridge
 * and the full timeline entry list.
 */
export interface SessionRecord {
  data: PersistedSessionData;
  /** Active CLI process bridge, or null if no process is running. */
  bridge: CliBridge | null;
  /** Full timeline entries accumulated during the session. */
  timeline: TimelineEntry[];
}

// ============================================================================
// Create Session Options
// ============================================================================

/**
 * Input for creating a new session via SessionManager.
 */
export interface CreateSessionOptions {
  prompt: string;
  context?: ContextPayload;
  model?: string;
}
