import {
  PROTOCOL_VERSION,
  UIIntentType,
  type SessionStatus,
} from "@locusai/shared";
import type { ChatStore, ToolState } from "./store";
import { SessionHeader } from "./components/session-header";
import { Timeline } from "./components/timeline";
import { Composer } from "./components/composer";
import { StatusRail } from "./components/status-rail";
import { AssistantMessage } from "./components/assistant-message";
import { ToolCard } from "./components/tool-card";
import { createUserMessage } from "./components/user-message";
import { createThinkingIndicator } from "./components/thinking-indicator";
import { createStatusEvent } from "./components/status-event";
import { createErrorCard } from "./components/error-card";
import { createEmptyState } from "./components/empty-state";

const TERMINAL_STATES = new Set(["completed", "canceled", "failed"]);

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

  constructor(root: HTMLElement, store: ChatStore, vscode: VsCodeApi) {
    this.store = store;
    this.vscode = vscode;

    // Header
    this.header = new SessionHeader({
      onStop: (id) =>
        this.sendIntent(UIIntentType.STOP_SESSION, { sessionId: id }),
      onNewSession: () => this.focusComposer(),
      onResume: (id) =>
        this.sendIntent(UIIntentType.RESUME_SESSION, { sessionId: id }),
      onSelectSession: (id) =>
        this.sendIntent(UIIntentType.REQUEST_SESSION_DETAIL, { sessionId: id }),
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

    // Session changed — full rebuild
    if (sessionChanged) {
      this.lastSessionId = state.sessionId;
      this.rebuildTimeline(state);
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

    // Rebuilt tool cards
    for (const key of state.toolOrder) {
      const tool = state.tools.get(key);
      if (tool) {
        const card = new ToolCard(tool);
        this.toolCards.set(key, card);
        nodes.push(card.element);
      }
    }

    // Assistant message
    if (state.assistantBuffer) {
      this.assistantMessage = new AssistantMessage();
      this.assistantMessage.updateContent(
        state.assistantBuffer,
        state.isStreaming
      );
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
        onNewSession: () => this.focusComposer(),
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

  private updateAssistantMessage(buffer: string, isStreaming: boolean): void {
    if (!buffer && !isStreaming) return;

    if (!this.assistantMessage) {
      this.assistantMessage = new AssistantMessage();
      this.timeline.append(this.assistantMessage.element);
    }

    this.assistantMessage.updateContent(buffer, isStreaming);
  }

  private updateToolCards(
    tools: Map<string, ToolState>,
    order: string[]
  ): void {
    for (const key of order) {
      const tool = tools.get(key);
      if (!tool) continue;

      const existing = this.toolCards.get(key);
      if (existing) {
        existing.updateState(tool);
      } else {
        const card = new ToolCard(tool);
        this.toolCards.set(key, card);
        // Insert before assistant message or thinking indicator
        const insertBefore =
          this.thinkingEl || this.assistantMessage?.element || null;
        if (insertBefore) {
          this.timeline.getContentEl().insertBefore(card.element, insertBefore);
        } else {
          this.timeline.append(card.element);
        }
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
        onNewSession: () => this.focusComposer(),
      });
      this.timeline.append(this.errorEl);
    }
  }

  private showEmptyState(): void {
    if (this.emptyStateEl) return;
    this.emptyStateEl = createEmptyState({
      onSuggestion: (text) => this.handleSubmit(text),
    });
    this.timeline.setContent([this.emptyStateEl]);
  }

  private removeEmptyState(): void {
    if (this.emptyStateEl) {
      this.emptyStateEl.remove();
      this.emptyStateEl = null;
    }
  }

  private handleSubmit(text: string): void {
    this.store.recordPrompt(text);

    // Add user message to timeline immediately
    const userMsg = createUserMessage(text);
    this.removeEmptyState();
    this.timeline.append(userMsg);
    this.timeline.scrollToBottom();

    // Reset assistant state for new response
    this.assistantMessage = null;
    this.toolCards.clear();
    this.thinkingEl = null;
    this.errorEl = null;

    this.sendIntent(UIIntentType.SUBMIT_PROMPT, { text });
    this.composer.clear();
    this.historyIndex = -1;
  }

  private focusComposer(): void {
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
