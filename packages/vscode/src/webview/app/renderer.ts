import {
  PROTOCOL_VERSION,
  type SessionStatus,
  UIIntentType,
} from "@locusai/shared";
import { AssistantMessage } from "./components/assistant-message";
import { Composer } from "./components/composer";
import { createEmptyState } from "./components/empty-state";
import { createErrorCard } from "./components/error-card";
import { SessionHeader } from "./components/session-header";
import { createStatusEvent } from "./components/status-event";
import { StatusRail } from "./components/status-rail";
import { createThinkingIndicator } from "./components/thinking-indicator";
import { Timeline } from "./components/timeline";
import { ToolCard } from "./components/tool-card";
import { createUserMessage } from "./components/user-message";
import type { ChatStore, ToolState } from "./store";

const TERMINAL_STATES = new Set([
  "completed",
  "canceled",
  "failed",
  "interrupted",
]);

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

/**
 * Main renderer — wires store state to DOM components.
 */
export class Renderer {
  private store: ChatStore;
  private vscode: VsCodeApi;

  private header: SessionHeader;
  private timeline: Timeline;
  private statusRail: StatusRail;
  private composer: Composer;

  private assistantMessage: AssistantMessage | null = null;
  private toolCards = new Map<string, ToolCard>();
  private thinkingEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private emptyStateEl: HTMLElement | null = null;

  private lastStatus: SessionStatus | null = null;
  private lastSessionId: string | null = null;
  private historyIndex = -1;
  /** When true, the next session change is from a submit — don't rebuild timeline. */
  private pendingSubmit = false;

  constructor(root: HTMLElement, store: ChatStore, vscode: VsCodeApi) {
    this.store = store;
    this.vscode = vscode;

    // Header
    this.header = new SessionHeader({
      onStop: (id) =>
        this.sendIntent(UIIntentType.STOP_SESSION, { sessionId: id }),
      onNewSession: () => this.startNewSession(),
      onResume: (id) =>
        this.sendIntent(UIIntentType.RESUME_SESSION, { sessionId: id }),
      onSelectSession: (id) =>
        this.sendIntent(UIIntentType.REQUEST_SESSION_DETAIL, { sessionId: id }),
      onDeleteSession: (id) =>
        this.sendIntent(UIIntentType.CLEAR_SESSION, { sessionId: id }),
      onRequestSessions: () => this.sendIntent(UIIntentType.REQUEST_SESSIONS),
    });

    // Timeline
    this.timeline = new Timeline(() => {
      this.timeline.scrollToBottom();
    });

    // Status rail
    this.statusRail = new StatusRail();

    // Composer
    this.composer = new Composer({
      onSubmit: (text) => this.handleSubmit(text),
      onStop: () => {
        const id = this.store.getState().sessionId;
        if (id) {
          this.sendIntent(UIIntentType.STOP_SESSION, { sessionId: id });
        }
      },
      onHistoryUp: () => this.navigateHistory(-1),
      onHistoryDown: () => this.navigateHistory(1),
    });

    // Mount
    root.innerHTML = "";
    root.appendChild(this.header.element);
    root.appendChild(this.timeline.element);
    root.appendChild(this.statusRail.element);
    root.appendChild(this.composer.element);

    // Subscribe to store
    store.subscribe(() => this.render());

    // Initial render
    this.render();
  }

  private render(): void {
    const state = this.store.getState();
    const sessionChanged = state.sessionId !== this.lastSessionId;

    // Header
    this.header.update(state.sessionId, state.status, state.model);
    this.header.updateSessions(state.sessions);

    // Composer
    this.composer.update(state.status, state.sessionId);

    // Status rail
    this.statusRail.update(
      state.status,
      state.model,
      state.toolOrder.length,
      state.createdAt
    );

    // Session changed
    if (sessionChanged) {
      this.lastSessionId = state.sessionId;

      if (this.pendingSubmit) {
        // This session change is from a new prompt submission — don't rebuild.
        // The user message was already appended by handleSubmit.
        // Just reset assistant/tool tracking for the new response.
        this.pendingSubmit = false;
        this.assistantMessage = null;
        this.toolCards.clear();
        this.thinkingEl = null;
        this.errorEl = null;
      } else {
        // Full rebuild (e.g. selecting a session from dropdown)
        this.rebuildTimeline(state);
      }

      this.lastStatus = state.status;
      return;
    }

    // Status transition handling
    if (state.status !== this.lastStatus) {
      this.handleStatusTransition(state.status);
      this.lastStatus = state.status;
    }

    // Show empty state if no session
    if (!state.sessionId) {
      this.showEmptyState();
      return;
    }

    // Remove empty state if present
    this.removeEmptyState();

    // Update thinking indicator
    this.updateThinking(state.isThinking);

    // Update assistant message
    this.updateAssistantMessage(state.assistantBuffer, state.isStreaming);

    // Update tool cards
    this.updateToolCards(state.tools, state.toolOrder);

    // Update error
    this.updateError(state);

    // Auto-scroll
    this.timeline.maybeAutoScroll();
  }

  private rebuildTimeline(state: ReturnType<ChatStore["getState"]>): void {
    this.assistantMessage = null;
    this.toolCards.clear();
    this.thinkingEl = null;
    this.errorEl = null;

    if (!state.sessionId) {
      this.showEmptyState();
      return;
    }

    this.removeEmptyState();

    const nodes: Node[] = [];

    // Status event for session start
    nodes.push(createStatusEvent("Session started", state.createdAt));

    // User message (the prompt)
    if (state.lastPrompt) {
      nodes.push(createUserMessage(state.lastPrompt, state.createdAt));
    }

    // Assistant message (always create if there are tools or text)
    if (state.assistantBuffer || state.toolOrder.length > 0) {
      this.assistantMessage = new AssistantMessage();
      const container = this.assistantMessage.getToolsContainer();

      // Rebuilt tool cards — only show the last one
      for (let i = 0; i < state.toolOrder.length; i++) {
        const key = state.toolOrder[i];
        const tool = state.tools.get(key);
        if (tool) {
          const card = new ToolCard(tool);
          this.toolCards.set(key, card);
          if (i < state.toolOrder.length - 1) {
            card.element.style.display = "none";
          }
          container.appendChild(card.element);
        }
      }

      if (state.assistantBuffer) {
        this.assistantMessage.updateContent(
          state.assistantBuffer,
          state.isStreaming
        );
      }
      nodes.push(this.assistantMessage.element);
    }

    // Thinking
    if (state.isThinking) {
      this.thinkingEl = createThinkingIndicator();
      nodes.push(this.thinkingEl);
    }

    // Error
    if (state.error) {
      this.errorEl = createErrorCard(state.error, {
        onRetry: () => {
          if (state.lastPrompt) {
            this.handleSubmit(state.lastPrompt);
          }
        },
        onNewSession: () => this.startNewSession(),
      });
      nodes.push(this.errorEl);
    }

    // Terminal status event
    if (state.status && TERMINAL_STATES.has(state.status)) {
      const label =
        state.status === "completed"
          ? "Session completed"
          : state.status === "canceled"
            ? "Session canceled"
            : state.status === "interrupted"
              ? "Session interrupted"
              : "Session failed";
      nodes.push(createStatusEvent(label));
    }

    this.timeline.setContent(nodes);
  }

  private handleStatusTransition(status: SessionStatus | null): void {
    if (status && TERMINAL_STATES.has(status)) {
      this.timeline.disableAutoScroll();

      // Add terminal status event
      const label =
        status === "completed"
          ? "Session completed"
          : status === "canceled"
            ? "Session canceled"
            : status === "interrupted"
              ? "Session interrupted"
              : "Session failed";
      this.timeline.append(createStatusEvent(label));
    }
  }

  private updateThinking(isThinking: boolean): void {
    if (isThinking && !this.thinkingEl) {
      this.thinkingEl = createThinkingIndicator();
      this.timeline.append(this.thinkingEl);
    } else if (!isThinking && this.thinkingEl) {
      this.thinkingEl.remove();
      this.thinkingEl = null;
    }
  }

  private ensureAssistantMessage(): AssistantMessage {
    if (!this.assistantMessage) {
      this.assistantMessage = new AssistantMessage();
      this.timeline.append(this.assistantMessage.element);
    }
    return this.assistantMessage;
  }

  private updateAssistantMessage(buffer: string, isStreaming: boolean): void {
    if (!buffer && !isStreaming) return;

    this.ensureAssistantMessage();

    if (!this.assistantMessage) return;

    this.assistantMessage.updateContent(buffer, isStreaming);
  }

  private updateToolCards(
    tools: Map<string, ToolState>,
    order: string[]
  ): void {
    // Ensure the assistant message exists so tool cards go inside it
    const msg = this.ensureAssistantMessage();
    const container = msg.getToolsContainer();

    for (const key of order) {
      const tool = tools.get(key);
      if (!tool) continue;

      const existing = this.toolCards.get(key);
      if (existing) {
        existing.updateState(tool);
      } else {
        const card = new ToolCard(tool);
        this.toolCards.set(key, card);
        container.appendChild(card.element);
      }
    }

    // Only show the last tool card; hide all others
    for (let i = 0; i < order.length; i++) {
      const card = this.toolCards.get(order[i]);
      if (card) {
        card.element.style.display = i === order.length - 1 ? "" : "none";
      }
    }
  }

  private updateError(state: ReturnType<ChatStore["getState"]>): void {
    if (state.error && !this.errorEl) {
      this.errorEl = createErrorCard(state.error, {
        onRetry: () => {
          if (state.lastPrompt) {
            this.handleSubmit(state.lastPrompt);
          }
        },
        onNewSession: () => this.startNewSession(),
      });
      this.timeline.append(this.errorEl);
    }
  }

  private showEmptyState(): void {
    if (this.emptyStateEl) return;
    this.emptyStateEl = createEmptyState({
      onSuggestion: (label, prompt) => this.handleSubmit(prompt, label),
    });
    this.timeline.setContent([this.emptyStateEl]);
  }

  private removeEmptyState(): void {
    if (this.emptyStateEl) {
      this.emptyStateEl.remove();
      this.emptyStateEl = null;
    }
  }

  private handleSubmit(text: string, displayText?: string): void {
    this.store.recordPrompt(text);

    // Add user message to timeline immediately
    // Use displayText (e.g. chip label) if provided, otherwise show the full prompt
    const userMsg = createUserMessage(displayText || text);
    this.removeEmptyState();
    this.timeline.append(userMsg);
    this.timeline.scrollToBottom();

    // Mark that the next session change is from a submit — preserve timeline.
    this.pendingSubmit = true;

    this.sendIntent(UIIntentType.SUBMIT_PROMPT, { text });
    this.composer.clear();
    this.historyIndex = -1;
  }

  private startNewSession(): void {
    this.store.reset();
    this.composer.focus();
  }

  private navigateHistory(direction: number): string | null {
    const history = this.store.getState().promptHistory;
    if (history.length === 0) return null;

    this.historyIndex += direction;

    if (this.historyIndex < 0) {
      this.historyIndex = -1;
      return "";
    }

    // Navigate from most recent (end) to oldest (start)
    const reverseIdx = history.length - 1 - this.historyIndex;
    if (reverseIdx < 0) {
      this.historyIndex = history.length - 1;
      return history[0];
    }

    return history[reverseIdx] || null;
  }

  private sendIntent(
    type: string,
    payload: Record<string, unknown> = {}
  ): void {
    this.vscode.postMessage({
      protocol: PROTOCOL_VERSION,
      type,
      payload,
    });
  }
}
