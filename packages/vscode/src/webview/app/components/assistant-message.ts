import { renderMarkdown } from "../markdown";
import { el, formatTime } from "../utils";

export class AssistantMessage {
  readonly element: HTMLElement;
  private bodyEl: HTMLElement;
  private cursorEl: HTMLElement;
  private timeEl: HTMLElement;
  private toolsEl: HTMLElement;
  private lastContent = "";

  constructor() {
    const dot = el("span", {
      cls: "lc-assistant-dot",
      attrs: { "aria-hidden": "true" },
    });

    this.toolsEl = el("div", { cls: "lc-assistant-tools" });
    this.bodyEl = el("div", { cls: "lc-msg-body lc-msg-body--md" });
    this.cursorEl = el("span", {
      cls: "lc-streaming-cursor",
      attrs: { role: "presentation", "aria-hidden": "true" },
    });
    this.timeEl = el("span", {
      cls: "lc-timestamp",
      text: formatTime(Date.now()),
    });

    const content = el("div", {
      cls: "lc-msg-content",
      children: [this.toolsEl, this.bodyEl, this.cursorEl, this.timeEl],
    });

    this.element = el("div", {
      cls: "lc-card lc-card--assistant",
      attrs: { role: "article", "aria-label": "Locus response" },
      children: [dot, content],
    });
  }

  /**
   * Get the container for tool cards.
   */
  getToolsContainer(): HTMLElement {
    return this.toolsEl;
  }

  /**
   * Update the message content (incremental markdown rendering).
   */
  updateContent(fullText: string, isStreaming: boolean): void {
    if (fullText !== this.lastContent) {
      this.lastContent = fullText;
      this.bodyEl.innerHTML = renderMarkdown(fullText.replace(/^\n+/, ""));
    }

    this.cursorEl.style.display = isStreaming ? "" : "none";

    if (!isStreaming) {
      this.timeEl.textContent = formatTime(Date.now());
    }
  }
}
