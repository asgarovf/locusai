import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  createErrorEvent,
  createHostEvent,
  type HostEvent,
  HostEventType,
  isTerminalStatus,
  ProtocolErrorCode,
  SessionTransitionEvent,
  type TimelineEntry,
  TimelineEntryKind,
  type UIIntent,
  UIIntentType,
} from "@locusai/shared";
import type { Memento, OutputChannel } from "vscode";
import { readDiskSessions } from "../sessions/disk-session-reader";
import type { SessionManager } from "../sessions/session-manager";
import type { SessionRecord } from "../sessions/types";
import { CliBridge } from "./cli-bridge";

// ============================================================================
// Types
// ============================================================================

export interface ChatControllerConfig {
  manager: SessionManager;
  getCliBinaryPath: () => string;
  getCwd: () => string;
  globalState: Memento;
  outputChannel: OutputChannel;
}

export type EventSink = (event: HostEvent) => void;

// ============================================================================
// Constants
// ============================================================================

const ACTIVE_SESSION_KEY = "locusai.activeSessionId";

// ============================================================================
// ChatController
// ============================================================================

/**
 * Orchestrates the chat execution path: receives validated UIIntents,
 * creates/manages sessions via SessionManager, spawns CliBridge
 * processes, and forwards HostEvents to a registered sink (webview).
 *
 * Handles session recovery on webview reopen by replaying persisted
 * state and reconciling live status without re-running completed work.
 */
export class ChatController {
  private readonly manager: SessionManager;
  private readonly getCliBinaryPath: () => string;
  private readonly getCwd: () => string;
  private readonly globalState: Memento;
  private readonly outputChannel: OutputChannel;
  private sink: EventSink | null = null;
  private activeSessionId: string | null = null;
  private firstTextDeltaSeen = new Set<string>();

  constructor(config: ChatControllerConfig) {
    this.manager = config.manager;
    this.getCliBinaryPath = config.getCliBinaryPath;
    this.getCwd = config.getCwd;
    this.globalState = config.globalState;
    this.outputChannel = config.outputChannel;
  }

  /**
   * Set the callback for outbound HostEvents. Typically bound to
   * `webviewView.webview.postMessage()`.
   */
  setEventSink(sink: EventSink | null): void {
    this.sink = sink;
  }

  /**
   * Returns the ID of the currently active session, or null if none.
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  /**
   * Route a validated UIIntent to the appropriate handler.
   * Each handler emits HostEvents via the registered sink.
   */
  handleIntent(intent: UIIntent): void {
    switch (intent.type) {
      case UIIntentType.SUBMIT_PROMPT:
        this.handleSubmitPrompt(intent.payload);
        break;
      case UIIntentType.STOP_SESSION:
        this.handleStopSession(intent.payload.sessionId);
        break;
      case UIIntentType.RESUME_SESSION:
        this.handleResumeSession(intent.payload.sessionId);
        break;
      case UIIntentType.REQUEST_SESSIONS:
        this.handleRequestSessions();
        break;
      case UIIntentType.REQUEST_SESSION_DETAIL:
        this.handleRequestSessionDetail(intent.payload.sessionId);
        break;
      case UIIntentType.CLEAR_SESSION:
        this.handleClearSession(intent.payload.sessionId);
        break;
      case UIIntentType.WEBVIEW_READY:
        this.handleWebviewReady();
        break;
    }
  }

  /**
   * Replay session state for the current active session. Called when
   * the webview is recreated (panel hidden and shown again) to
   * restore the UI without re-running completed work.
   */
  recoverActiveSession(): void {
    if (!this.activeSessionId) {
      return;
    }

    const record = this.manager.get(this.activeSessionId);
    if (!record) {
      this.activeSessionId = null;
      return;
    }

    this.emitSessionState(record);
  }

  /**
   * Dispose of all resources. Stops running processes.
   */
  dispose(): void {
    this.sink = null;
    this.activeSessionId = null;
    this.firstTextDeltaSeen.clear();
    this.manager.dispose();
  }

  // ── Active Session Persistence ──────────────────────────────────────

  private persistActiveSessionId(): void {
    this.globalState.update(ACTIVE_SESSION_KEY, this.activeSessionId);
  }

  private restoreActiveSessionId(): void {
    this.activeSessionId =
      this.globalState.get<string>(ACTIVE_SESSION_KEY) ?? null;
  }

  // ── Intent Handlers ─────────────────────────────────────────────────

  private handleSubmitPrompt(payload: {
    text: string;
    context?: unknown;
  }): void {
    const record = this.manager.create({
      prompt: payload.text,
      context: payload.context as undefined,
      model: undefined,
    });

    this.activeSessionId = record.data.sessionId;
    this.persistActiveSessionId();
    this.emitSessionState(record);
    this.spawnBridge(record);
  }

  private handleStopSession(sessionId: string): void {
    const record = this.manager.get(sessionId);
    if (!record) {
      this.emitSessionNotFound(sessionId);
      return;
    }

    const stopped = this.manager.stop(sessionId);
    this.emitSessionState(stopped);
  }

  private handleResumeSession(sessionId: string): void {
    const record = this.manager.get(sessionId);
    if (!record) {
      this.emitSessionNotFound(sessionId);
      return;
    }

    try {
      const resumed = this.manager.resume(sessionId);
      this.activeSessionId = sessionId;
      this.persistActiveSessionId();
      this.emitSessionState(resumed);
      this.spawnBridge(resumed);
    } catch (err) {
      this.emit(
        createErrorEvent(ProtocolErrorCode.UNKNOWN, this.errorMessage(err), {
          sessionId,
          recoverable: false,
        })
      );
    }
  }

  private handleRequestSessions(): void {
    // Sessions from the in-memory/globalState store (created by this extension)
    const storeSessions = this.manager.list();
    const storeSummaries = storeSessions.map((s) => ({
      sessionId: s.sessionId,
      status: s.status,
      model: s.model,
      title: s.prompt.slice(0, 100),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.timelineSummary.messageCount,
      toolCount: s.timelineSummary.toolCount,
    }));

    // Sessions from disk (.locus/sessions/*.json, created by the CLI)
    const diskSummaries = readDiskSessions(this.getCwd());

    // Merge: store sessions take priority (they have richer state).
    // Disk sessions that don't exist in the store are appended.
    const storeIds = new Set(storeSummaries.map((s) => s.sessionId));
    const merged = [
      ...storeSummaries,
      ...diskSummaries.filter((s) => !storeIds.has(s.sessionId)),
    ];

    // Sort by updatedAt descending
    merged.sort((a, b) => b.updatedAt - a.updatedAt);

    this.emit(
      createHostEvent(HostEventType.SESSION_LIST, {
        sessions: merged,
      })
    );
  }

  private handleRequestSessionDetail(sessionId: string): void {
    const record = this.manager.get(sessionId);
    if (!record) {
      this.emitSessionNotFound(sessionId);
      return;
    }

    this.emitSessionState(record);
  }

  private handleClearSession(sessionId: string): void {
    // Remove from in-memory registry and globalState store
    this.manager.cleanup(sessionId);

    // Also remove disk session file if it exists (.locus/sessions/<id>.json)
    try {
      const diskPath = join(
        this.getCwd(),
        ".locus",
        "sessions",
        `${sessionId}.json`
      );
      if (existsSync(diskPath)) {
        unlinkSync(diskPath);
      }
    } catch {
      // Ignore disk deletion errors silently
    }

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
      this.persistActiveSessionId();
    }
    this.handleRequestSessions();
  }

  private handleWebviewReady(): void {
    this.restoreActiveSessionId();
    this.handleRequestSessions();
    this.recoverActiveSession();
  }

  // ── CLI Bridge Lifecycle ────────────────────────────────────────────

  private spawnBridge(record: SessionRecord): void {
    const bridge = new CliBridge();
    record.bridge = bridge;

    const sessionId = record.data.sessionId;

    bridge.on("event", (hostEvent: HostEvent) => {
      this.handleBridgeEvent(sessionId, record, hostEvent);
    });

    bridge.on("exit", () => {
      this.handleBridgeExit(sessionId, record);
    });

    bridge.on("error", (err: Error) => {
      this.handleBridgeError(sessionId, record, err);
    });

    try {
      bridge.start({
        cliBinaryPath: this.getCliBinaryPath(),
        cwd: this.getCwd(),
        sessionId,
        prompt: record.data.prompt,
        model: record.data.model,
        timeoutMs: 300_000,
      });

      this.manager.transition(sessionId, SessionTransitionEvent.CLI_SPAWNED);
      this.emitSessionState(record);
    } catch (err) {
      record.bridge = null;
      try {
        this.manager.transition(sessionId, SessionTransitionEvent.ERROR);
      } catch {
        // Already in a terminal state — ignore double-fault.
      }
      this.emit(
        createErrorEvent(
          ProtocolErrorCode.CLI_NOT_FOUND,
          this.errorMessage(err),
          { sessionId, recoverable: false }
        )
      );
      this.emitSessionState(record);
    }
  }

  private handleBridgeEvent(
    sessionId: string,
    record: SessionRecord,
    hostEvent: HostEvent
  ): void {
    // Suppress error events for sessions already in a terminal state
    // (e.g. user-initiated cancellation — errors after CANCELED are noise).
    if (
      hostEvent.type === HostEventType.ERROR &&
      isTerminalStatus(record.data.status)
    ) {
      return;
    }

    // Track first text delta for RUNNING → STREAMING transition.
    if (
      hostEvent.type === HostEventType.TEXT_DELTA &&
      !this.firstTextDeltaSeen.has(sessionId)
    ) {
      this.firstTextDeltaSeen.add(sessionId);
      try {
        this.manager.transition(
          sessionId,
          SessionTransitionEvent.FIRST_TEXT_DELTA
        );
      } catch {
        // Transition may be invalid if session was stopped concurrently.
      }
    }

    // Track session completion.
    if (hostEvent.type === HostEventType.SESSION_COMPLETED) {
      this.firstTextDeltaSeen.delete(sessionId);
      try {
        this.manager.transition(
          sessionId,
          SessionTransitionEvent.RESULT_RECEIVED
        );
      } catch {
        // Transition may be invalid if session was stopped concurrently.
      }
    }

    // Accumulate timeline entries and sync to persisted data.
    const entry = this.toTimelineEntry(hostEvent);
    if (entry) {
      record.timeline.push(entry);
      record.data.timeline = record.timeline;
      this.updateTimelineSummary(record, hostEvent);
    }

    this.emit(hostEvent);
  }

  private handleBridgeExit(sessionId: string, record: SessionRecord): void {
    record.bridge = null;
    this.firstTextDeltaSeen.delete(sessionId);

    // If we haven't reached a terminal state yet, the process was lost.
    if (!isTerminalStatus(record.data.status)) {
      try {
        this.manager.transition(sessionId, SessionTransitionEvent.PROCESS_LOST);
      } catch {
        // Fallback: mark as failed.
        try {
          this.manager.transition(sessionId, SessionTransitionEvent.ERROR);
        } catch {
          // Already terminal — no-op.
        }
      }
      this.emitSessionState(record);
    }
  }

  private handleBridgeError(
    sessionId: string,
    record: SessionRecord,
    err: Error
  ): void {
    // If session already reached a terminal state, the exit handler
    // already took care of surfacing the error — skip duplicate emission.
    if (isTerminalStatus(record.data.status)) {
      return;
    }

    this.emit(
      createErrorEvent(ProtocolErrorCode.PROCESS_CRASHED, err.message, {
        sessionId,
        recoverable: false,
      })
    );
  }

  // ── Event Emission Helpers ──────────────────────────────────────────

  private emit(event: HostEvent): void {
    if (!this.sink) {
      if (this.activeSessionId) {
        console.warn(
          "[Locus] Event sink is null during active session — webview may have been disposed mid-stream"
        );
      }
      return;
    }
    this.sink(event);
  }

  private emitSessionState(record: SessionRecord): void {
    this.emit(
      createHostEvent(HostEventType.SESSION_STATE, {
        sessionId: record.data.sessionId,
        status: record.data.status,
        metadata: {
          sessionId: record.data.sessionId,
          status: record.data.status,
          model: record.data.model,
          createdAt: record.data.createdAt,
          updatedAt: record.data.updatedAt,
          prompt: record.data.prompt,
        },
        timeline: record.timeline,
      })
    );
  }

  private emitSessionNotFound(sessionId: string): void {
    this.emit(
      createErrorEvent(
        ProtocolErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${sessionId}`,
        { sessionId, recoverable: false }
      )
    );
  }

  // ── Timeline Helpers ────────────────────────────────────────────────

  private toTimelineEntry(event: HostEvent): TimelineEntry | null {
    switch (event.type) {
      case HostEventType.TEXT_DELTA:
        return {
          id: randomUUID(),
          kind: TimelineEntryKind.MESSAGE,
          timestamp: Date.now(),
          data: { content: event.payload.content },
        };
      case HostEventType.TOOL_STARTED:
        return {
          id: randomUUID(),
          kind: TimelineEntryKind.TOOL_CALL,
          timestamp: Date.now(),
          data: {
            tool: event.payload.tool,
            toolId: event.payload.toolId,
            parameters: event.payload.parameters,
            phase: "started",
          },
        };
      case HostEventType.TOOL_COMPLETED:
        return {
          id: randomUUID(),
          kind: TimelineEntryKind.TOOL_CALL,
          timestamp: Date.now(),
          data: {
            tool: event.payload.tool,
            toolId: event.payload.toolId,
            success: event.payload.success,
            duration: event.payload.duration,
            error: event.payload.error,
            phase: "completed",
          },
        };
      case HostEventType.ERROR:
        return {
          id: randomUUID(),
          kind: TimelineEntryKind.ERROR,
          timestamp: Date.now(),
          data: { error: event.payload.error },
        };
      case HostEventType.SESSION_COMPLETED:
        return {
          id: randomUUID(),
          kind: TimelineEntryKind.DONE,
          timestamp: Date.now(),
          data: {},
        };
      default:
        return null;
    }
  }

  private updateTimelineSummary(record: SessionRecord, event: HostEvent): void {
    const summary = record.data.timelineSummary;

    if (event.type === HostEventType.TEXT_DELTA) {
      summary.messageCount += 1;
      summary.lastText = event.payload.content.slice(0, 200);
    } else if (
      event.type === HostEventType.TOOL_STARTED ||
      event.type === HostEventType.TOOL_COMPLETED
    ) {
      summary.toolCount += 1;
    }

    this.manager.persist(record.data.sessionId);
  }

  // ── Utility ─────────────────────────────────────────────────────────

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
