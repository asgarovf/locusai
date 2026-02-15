import { el } from "../utils";

const STICK_THRESHOLD = 20; // px from bottom to consider "at bottom"

export class Timeline {
  readonly element: HTMLElement;
  private contentEl: HTMLElement;
  private fabEl: HTMLElement;
  private stickToBottom = true;
  private userScrolled = false;

  constructor(onJumpToLatest: () => void) {
    this.contentEl = el("div", { cls: "lc-timeline-content" });

    this.fabEl = el("button", {
      cls: "lc-fab",
      attrs: {
        "aria-label": "Jump to latest",
        type: "button",
        tabindex: "0",
      },
      text: "↓ Latest",
    });
    this.fabEl.style.display = "none";
    this.fabEl.addEventListener("click", () => {
      this.scrollToBottom();
      onJumpToLatest();
    });

    this.element = el("div", {
      cls: "lc-timeline",
      attrs: {
        role: "log",
        "aria-label": "Session timeline",
        "aria-live": "polite",
        tabindex: "0",
      },
      children: [this.contentEl, this.fabEl],
    });

    this.element.addEventListener("scroll", () => this.onScroll());

    // Keyboard navigation for timeline entries
    this.element.addEventListener("keydown", (e) => {
      this.handleKeydown(e);
    });
  }

  /**
   * Replace all timeline content.
   */
  setContent(nodes: Node[]): void {
    this.contentEl.innerHTML = "";
    for (const node of nodes) {
      this.contentEl.appendChild(node);
    }
    if (this.stickToBottom) {
      this.scrollToBottom();
    }
  }

  /**
   * Append a node to the timeline.
   */
  append(node: Node): void {
    this.contentEl.appendChild(node);
    if (this.stickToBottom) {
      this.scrollToBottom();
    }
  }

  /**
   * Get the content container for direct manipulation.
   */
  getContentEl(): HTMLElement {
    return this.contentEl;
  }

  /**
   * Scroll to the bottom (re-enable stick-to-bottom).
   */
  scrollToBottom(): void {
    this.stickToBottom = true;
    this.userScrolled = false;
    this.element.scrollTop = this.element.scrollHeight;
    this.fabEl.style.display = "none";
  }

  /**
   * Auto-scroll if stick-to-bottom is active. Call after content updates.
   */
  maybeAutoScroll(): void {
    if (this.stickToBottom) {
      this.element.scrollTop = this.element.scrollHeight;
    }
  }

  /**
   * Disable auto-scroll (e.g., on session complete).
   */
  disableAutoScroll(): void {
    this.stickToBottom = false;
  }

  private onScroll(): void {
    const el = this.element;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;

    if (atBottom) {
      this.stickToBottom = true;
      this.userScrolled = false;
      this.fabEl.style.display = "none";
    } else if (!this.userScrolled) {
      this.userScrolled = true;
      this.stickToBottom = false;
      this.fabEl.style.display = "";
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    const focusable = this.contentEl.querySelectorAll(
      "[tabindex='0'], button, [role='button']"
    );
    const items = Array.from(focusable) as HTMLElement[];
    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = idx < items.length - 1 ? items[idx + 1] : items[0];
      next?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = idx > 0 ? items[idx - 1] : items[items.length - 1];
      prev?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }
}
