import { icons } from "../icons";
import { renderMarkdown } from "../markdown";
import { el, formatTime } from "../utils";

export class AssistantMessage {
  readonly element: HTMLElement;
  private bodyEl: HTMLElement;
  private cursorEl: HTMLElement;
  private timeEl: HTMLElement;
  private lastContent = "";

  constructor() {
    const avatar = el("div", {
      cls: "lc-avatar lc-avatar--assistant",
      html: icons.locus,
      attrs: { "aria-hidden": "true" },
    });

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
      children: [this.bodyEl, this.cursorEl, this.timeEl],
    });

    this.element = el("div", {
      cls: "lc-card lc-card--assistant",
      attrs: { role: "article", "aria-label": "Locus response" },
      children: [avatar, content],
    });
  }

  /**
   * Update the message content (incremental markdown rendering).
   */
  updateContent(fullText: string, isStreaming: boolean): void {
    if (fullText !== this.lastContent) {
      this.lastContent = fullText;
      this.bodyEl.innerHTML = renderMarkdown(fullText);
    }

    this.cursorEl.style.display = isStreaming ? "" : "none";

    if (!isStreaming) {
      this.timeEl.textContent = formatTime(Date.now());
    }
  }
}
