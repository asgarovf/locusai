import {
  type HostEvent,
  HostEventType,
  type ProtocolError,
  type SessionStatus,
  type SessionSummary,
  type TimelineEntry,
} from "@locusai/shared";

// ============================================================================
// Timeline UI Types
// ============================================================================

export interface ToolState {
  tool: string;
  toolId: string | undefined;
  parameters: Record<string, unknown> | undefined;
  status: "running" | "completed" | "failed" | "canceled";
  duration: number | undefined;
  result: unknown;
  error: string | undefined;
}

export interface ChatState {
  sessionId: string | null;
  status: SessionStatus | null;
  model: string | undefined;
  createdAt: number | undefined;

  /** Accumulated assistant text for the current response. */
  assistantBuffer: string;
  /** Whether the assistant response is still streaming. */
  isStreaming: boolean;
  /** Whether the thinking indicator should be shown. */
  isThinking: boolean;

  /** Tool invocation states, keyed by toolId or index. */
  tools: Map<string, ToolState>;
  /** Ordered list of tool keys for rendering order. */
  toolOrder: string[];

  /** Timeline entries from session recovery. */
  timeline: TimelineEntry[];

  /** Recent sessions for the picker. */
  sessions: SessionSummary[];

  /** Current error, if any. */
  error: ProtocolError | null;

  /** Last prompt text (for retry). */
  lastPrompt: string;

  /** Prompt history for up/down cycling. */
  promptHistory: string[];

  /** Counter for generating unique tool keys when toolId is missing. */
  toolCounter: number;
}

export type Listener = () => void;

// ============================================================================
// Store
// ============================================================================

export class ChatStore {
  private state: ChatState;
  private listeners: Set<Listener> = new Set();
  private deltaBuffer: string[] = [];
  private deltaFlushTimer: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  getState(): Readonly<ChatState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Process a validated host event and update state.
   */
  dispatch(event: HostEvent): void {
    switch (event.type) {
      case HostEventType.SESSION_STATE:
        this.handleSessionState(event.payload);
        break;
      case HostEventType.TEXT_DELTA:
        this.handleTextDelta(event.payload);
        break;
      case HostEventType.TOOL_STARTED:
        this.handleToolStarted(event.payload);
        break;
      case HostEventType.TOOL_COMPLETED:
        this.handleToolCompleted(event.payload);
        break;
      case HostEventType.THINKING:
        this.handleThinking();
        break;
      case HostEventType.ERROR:
        this.handleError(event.payload);
        break;
      case HostEventType.SESSION_LIST:
        this.handleSessionList(event.payload);
        break;
      case HostEventType.SESSION_COMPLETED:
        this.handleSessionCompleted();
        break;
    }
  }

  /**
   * Record a submitted prompt in history.
   */
  recordPrompt(text: string): void {
    this.state.lastPrompt = text;
    // Avoid duplicates at the end of history
    const history = this.state.promptHistory;
    if (history[history.length - 1] !== text) {
      history.push(text);
      // Keep last 50 entries
      if (history.length > 50) {
        history.shift();
      }
    }
  }

  // ── Event Handlers ──────────────────────────────────────────────────

  private handleSessionState(payload: {
    sessionId: string;
    status: SessionStatus;
    metadata?:
      | { model?: string; createdAt?: number; prompt?: string }
      | undefined;
    timeline?: TimelineEntry[] | undefined;
  }): void {
    const isNewSession = this.state.sessionId !== payload.sessionId;

    if (isNewSession) {
      // Reset streaming state for new session
      this.state.assistantBuffer = "";
      this.state.isStreaming = false;
      this.state.isThinking = false;
      this.state.tools = new Map();
      this.state.toolOrder = [];
      this.state.error = null;
      this.state.toolCounter = 0;
    }

    this.state.sessionId = payload.sessionId;
    this.state.status = payload.status;
    this.state.model = payload.metadata?.model;
    this.state.createdAt = payload.metadata?.createdAt;

    if (payload.metadata?.prompt) {
      this.state.lastPrompt = payload.metadata.prompt;
    }

    if (payload.timeline) {
      this.state.timeline = payload.timeline;
      this.rebuildFromTimeline(payload.timeline);
    }

    // When session reaches a terminal state, finalize any running tools
    const terminalStatuses = new Set([
      "completed",
      "canceled",
      "failed",
      "interrupted",
    ]);
    if (payload.status && terminalStatuses.has(payload.status)) {
      const toolStatus =
        payload.status === "completed" ? "completed" : "canceled";
      this.finalizeRunningTools(toolStatus);
      this.state.isStreaming = false;
      this.state.isThinking = false;
    }

    this.notify();
  }

  private handleTextDelta(payload: {
    sessionId: string;
    content: string;
  }): void {
    // Only process deltas for the active session
    if (payload.sessionId !== this.state.sessionId) return;

    this.state.isThinking = false;
    this.state.isStreaming = true;

    // Buffer deltas and flush on animation frame
    this.deltaBuffer.push(payload.content);
    if (this.deltaFlushTimer === null) {
      this.deltaFlushTimer = window.requestAnimationFrame(() => {
        this.state.assistantBuffer += this.deltaBuffer.join("");
        this.deltaBuffer = [];
        this.deltaFlushTimer = null;
        this.notify();
      });
    }
  }

  private handleToolStarted(payload: {
    sessionId: string;
    tool: string;
    toolId?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
  }): void {
    if (payload.sessionId !== this.state.sessionId) return;

    this.state.isThinking = false;

    const key = payload.toolId || `tool_${this.state.toolCounter++}`;
    const toolState: ToolState = {
      tool: payload.tool,
      toolId: payload.toolId,
      parameters: payload.parameters,
      status: "running",
      duration: undefined,
      result: undefined,
      error: undefined,
    };
    this.state.tools.set(key, toolState);
    this.state.toolOrder.push(key);
    this.notify();
  }

  private handleToolCompleted(payload: {
    sessionId: string;
    tool: string;
    toolId?: string | undefined;
    result?: unknown;
    duration?: number | undefined;
    success: boolean;
    error?: string | undefined;
  }): void {
    if (payload.sessionId !== this.state.sessionId) return;

    // Find matching tool by toolId or the last tool with matching name
    const key = this.findToolKey(payload.toolId, payload.tool);
    if (key) {
      const tool = this.state.tools.get(key);
      if (tool) {
        tool.status = payload.success ? "completed" : "failed";
        tool.duration = payload.duration;
        tool.result = payload.result;
        tool.error = payload.error;
      }
    }
    this.notify();
  }

  private handleThinking(): void {
    this.state.isThinking = true;
    this.notify();
  }

  private handleError(payload: {
    sessionId?: string | undefined;
    error: ProtocolError;
  }): void {
    // Deduplicate: if the same error code is already displayed, skip.
    if (this.state.error?.code === payload.error.code) {
      return;
    }

    this.state.error = payload.error;
    this.state.isStreaming = false;
    this.state.isThinking = false;
    this.notify();
  }

  private handleSessionList(payload: { sessions: SessionSummary[] }): void {
    this.state.sessions = payload.sessions;
    this.notify();
  }

  private handleSessionCompleted(): void {
    this.state.isStreaming = false;
    this.state.isThinking = false;
    // Ensure status reflects completion so the composer re-enables.
    // SESSION_STATE with 'completed' may arrive separately, but if the
    // current status is still an active state, update it now.
    if (
      this.state.status === "streaming" ||
      this.state.status === "running" ||
      this.state.status === "starting"
    ) {
      this.state.status = "completed" as SessionStatus;
    }
    this.finalizeRunningTools("completed");
    this.flushDeltas();
    this.notify();
  }

  /**
   * Reset the store to its initial blank state (no active session).
   */
  reset(): void {
    this.flushDeltas();
    const sessions = this.state.sessions;
    const promptHistory = this.state.promptHistory;
    this.state = this.createInitialState();
    // Preserve sessions list and prompt history across resets
    this.state.sessions = sessions;
    this.state.promptHistory = promptHistory;
    this.notify();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Mark all still-running tools with a final status.
   */
  private finalizeRunningTools(status: "completed" | "canceled"): void {
    for (const tool of this.state.tools.values()) {
      if (tool.status === "running") {
        tool.status = status;
      }
    }
  }

  private findToolKey(
    toolId: string | undefined,
    toolName: string
  ): string | undefined {
    if (toolId && this.state.tools.has(toolId)) {
      return toolId;
    }
    // Find the last running tool with matching name
    for (let i = this.state.toolOrder.length - 1; i >= 0; i--) {
      const key = this.state.toolOrder[i];
      const tool = this.state.tools.get(key);
      if (tool && tool.tool === toolName && tool.status === "running") {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Rebuild display state from persisted timeline entries (session recovery).
   */
  private rebuildFromTimeline(timeline: TimelineEntry[]): void {
    let assistantText = "";
    const tools = new Map<string, ToolState>();
    const toolOrder: string[] = [];
    let counter = 0;

    for (const entry of timeline) {
      if (entry.kind === "message") {
        const content = entry.data.content;
        if (typeof content === "string") {
          assistantText += content;
        }
      } else if (entry.kind === "tool_call") {
        const data = entry.data as Record<string, unknown>;
        const phase = data.phase as string | undefined;
        const toolId = data.toolId as string | undefined;
        const toolName = (data.tool as string) || "Unknown";
        const key = toolId || `tool_${counter++}`;

        if (phase === "started") {
          tools.set(key, {
            tool: toolName,
            toolId,
            parameters: data.parameters as Record<string, unknown> | undefined,
            status: "running",
            duration: undefined,
            result: undefined,
            error: undefined,
          });
          toolOrder.push(key);
        } else if (phase === "completed") {
          // Find matching started tool
          const matchKey =
            toolId && tools.has(toolId)
              ? toolId
              : this.findLastRunningTool(tools, toolOrder, toolName);
          if (matchKey) {
            const t = tools.get(matchKey);
            if (t) {
              t.status = data.success ? "completed" : "failed";
              t.duration = data.duration as number | undefined;
              t.error = data.error as string | undefined;
            }
          }
        }
      }
    }

    this.state.assistantBuffer = assistantText;
    this.state.tools = tools;
    this.state.toolOrder = toolOrder;
    this.state.toolCounter = counter;
  }

  private findLastRunningTool(
    tools: Map<string, ToolState>,
    order: string[],
    toolName: string
  ): string | undefined {
    for (let i = order.length - 1; i >= 0; i--) {
      const key = order[i];
      const t = tools.get(key);
      if (t && t.tool === toolName && t.status === "running") {
        return key;
      }
    }
    return undefined;
  }

  private flushDeltas(): void {
    if (this.deltaBuffer.length > 0) {
      this.state.assistantBuffer += this.deltaBuffer.join("");
      this.deltaBuffer = [];
    }
    if (this.deltaFlushTimer !== null) {
      window.cancelAnimationFrame(this.deltaFlushTimer);
      this.deltaFlushTimer = null;
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private createInitialState(): ChatState {
    return {
      sessionId: null,
      status: null,
      model: undefined,
      createdAt: undefined,
      assistantBuffer: "",
      isStreaming: false,
      isThinking: false,
      tools: new Map(),
      toolOrder: [],
      timeline: [],
      sessions: [],
      error: null,
      lastPrompt: "",
      promptHistory: [],
      toolCounter: 0,
    };
  }
}
