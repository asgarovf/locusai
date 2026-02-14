import { randomUUID } from "node:crypto";
import {
  SessionStatus,
  SessionTransitionEvent,
  getNextStatus,
  isTerminalStatus,
  isValidTransition,
} from "@locusai/shared";
import type { SessionStore } from "./session-store";
import type {
  CreateSessionOptions,
  PersistedSessionData,
  SessionRecord,
  TimelineSummary,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const EMPTY_SUMMARY: TimelineSummary = {
  messageCount: 0,
  toolCount: 0,
  lastText: "",
};

/**
 * Statuses that indicate an active process was running before reload.
 * After a reload these must be reconciled to INTERRUPTED since their
 * process handles are lost.
 */
const ACTIVE_STATUSES: ReadonlySet<string> = new Set([
  SessionStatus.STARTING,
  SessionStatus.RUNNING,
  SessionStatus.STREAMING,
  SessionStatus.RESUMING,
]);

// ============================================================================
// SessionManager
// ============================================================================

/**
 * Orchestrates session lifecycle: creation, state transitions,
 * persistence, and reload recovery.
 *
 * - Persisted metadata lives in `SessionStore` (globalState).
 * - Active process handles live in an in-memory registry only.
 * - On activation/reconnect, `reconcile()` marks orphaned sessions
 *   as INTERRUPTED so they can be resumed.
 */
export class SessionManager {
  private readonly store: SessionStore;
  private readonly registry = new Map<string, SessionRecord>();

  constructor(store: SessionStore) {
    this.store = store;
  }

  // ── Create ──────────────────────────────────────────────────────────

  /**
   * Create a new session. Generates a UUID, validates IDLE→STARTING
   * transition, persists metadata, and returns the in-memory record.
   */
  create(options: CreateSessionOptions): SessionRecord {
    const sessionId = randomUUID();
    const now = Date.now();

    const data: PersistedSessionData = {
      sessionId,
      status: SessionStatus.STARTING,
      createdAt: now,
      updatedAt: now,
      prompt: options.prompt,
      context: options.context,
      model: options.model,
      timelineSummary: { ...EMPTY_SUMMARY },
    };

    const record: SessionRecord = {
      data,
      bridge: null,
      timeline: [],
    };

    this.registry.set(sessionId, record);
    this.store.save(data);

    return record;
  }

  // ── Read ────────────────────────────────────────────────────────────

  /**
   * Get a session record by ID. Checks the in-memory registry first,
   * then falls back to the persisted store (without a bridge).
   */
  get(sessionId: string): SessionRecord | undefined {
    const existing = this.registry.get(sessionId);
    if (existing) return existing;

    const persisted = this.store.get(sessionId);
    if (!persisted) return undefined;

    const record: SessionRecord = {
      data: persisted,
      bridge: null,
      timeline: [],
    };
    this.registry.set(sessionId, record);
    return record;
  }

  /**
   * List all persisted sessions for this workspace.
   */
  list(): PersistedSessionData[] {
    return this.store.getAll();
  }

  // ── Transitions ─────────────────────────────────────────────────────

  /**
   * Apply a state transition event to a session. Validates the
   * transition against the shared state machine, updates persisted
   * metadata, and returns the updated record.
   *
   * Throws if the session is not found or the transition is invalid.
   */
  transition(
    sessionId: string,
    event: SessionTransitionEvent
  ): SessionRecord {
    const record = this.get(sessionId);
    if (!record) {
      throw new Error(
        `SessionManager: session not found: ${sessionId}`
      );
    }

    const currentStatus = record.data.status;
    if (!isValidTransition(currentStatus, event)) {
      throw new Error(
        `SessionManager: invalid transition ${currentStatus} → ${event}`
      );
    }

    const nextStatus = getNextStatus(currentStatus, event);
    if (!nextStatus) {
      throw new Error(
        `SessionManager: no target state for ${currentStatus} → ${event}`
      );
    }

    record.data.status = nextStatus;
    record.data.updatedAt = Date.now();
    this.store.save(record.data);

    return record;
  }

  // ── Resume ──────────────────────────────────────────────────────────

  /**
   * Resume an interrupted session. Validates INTERRUPTED→RESUMING
   * transition and returns the record. The caller is responsible for
   * attaching a new `CliBridge` to the record and driving further
   * transitions (RESUMING→RUNNING via CLI_SPAWNED).
   *
   * Throws if the session is not found, not in INTERRUPTED state,
   * or already has an active bridge (duplicate resume).
   */
  resume(sessionId: string): SessionRecord {
    const record = this.get(sessionId);
    if (!record) {
      throw new Error(
        `SessionManager: session not found: ${sessionId}`
      );
    }

    if (record.bridge) {
      throw new Error(
        `SessionManager: session ${sessionId} already has an active bridge (duplicate resume)`
      );
    }

    return this.transition(
      sessionId,
      SessionTransitionEvent.RESUME
    );
  }

  // ── Stop ────────────────────────────────────────────────────────────

  /**
   * Stop a session. If the session is in a non-terminal active state,
   * applies USER_STOP to transition to CANCELED and cancels the
   * process bridge if one is attached.
   *
   * If the session is already in a terminal state, this is a no-op
   * and returns the current record.
   *
   * Throws if the session is not found.
   */
  stop(sessionId: string): SessionRecord {
    const record = this.get(sessionId);
    if (!record) {
      throw new Error(
        `SessionManager: session not found: ${sessionId}`
      );
    }

    if (isTerminalStatus(record.data.status)) {
      return record;
    }

    if (
      isValidTransition(
        record.data.status,
        SessionTransitionEvent.USER_STOP
      )
    ) {
      if (record.bridge) {
        record.bridge.cancel();
        record.bridge = null;
      }
      return this.transition(
        sessionId,
        SessionTransitionEvent.USER_STOP
      );
    }

    // For states where USER_STOP is not valid (e.g. STARTING,
    // RESUMING), mark as FAILED via ERROR event instead.
    if (
      isValidTransition(
        record.data.status,
        SessionTransitionEvent.ERROR
      )
    ) {
      if (record.bridge) {
        record.bridge.cancel();
        record.bridge = null;
      }
      return this.transition(
        sessionId,
        SessionTransitionEvent.ERROR
      );
    }

    return record;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  /**
   * Remove a session from both the in-memory registry and the
   * persisted store. Cancels any active bridge first.
   */
  cleanup(sessionId: string): void {
    const record = this.registry.get(sessionId);
    if (record?.bridge) {
      record.bridge.cancel();
      record.bridge = null;
    }
    this.registry.delete(sessionId);
    this.store.remove(sessionId);
  }

  // ── Reconcile (reload recovery) ─────────────────────────────────────

  /**
   * Reconcile persisted session data with the in-memory registry.
   * Called on extension activation or webview reconnect.
   *
   * Any session that was in an active state (STARTING, RUNNING,
   * STREAMING, RESUMING) is transitioned to INTERRUPTED because
   * its process handle was lost during the reload. Terminal and
   * IDLE sessions are loaded as-is. INTERRUPTED sessions remain
   * INTERRUPTED (already recoverable).
   */
  reconcile(): void {
    const sessions = this.store.getAll();

    for (const data of sessions) {
      if (ACTIVE_STATUSES.has(data.status)) {
        data.status = SessionStatus.INTERRUPTED;
        data.updatedAt = Date.now();
        this.store.save(data);
      }

      const record: SessionRecord = {
        data,
        bridge: null,
        timeline: [],
      };
      this.registry.set(data.sessionId, record);
    }
  }

  // ── Dispose ─────────────────────────────────────────────────────────

  /**
   * Stop all running processes and clear the in-memory registry.
   * Does not remove persisted data.
   */
  dispose(): void {
    for (const record of this.registry.values()) {
      if (record.bridge) {
        record.bridge.cancel();
        record.bridge = null;
      }
    }
    this.registry.clear();
  }
}
