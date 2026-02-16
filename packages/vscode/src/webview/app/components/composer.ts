import type { SessionStatus } from "@locusai/shared";
import { icons } from "../icons";
import { el } from "../utils";

const ACTIVE_STATES = new Set(["starting", "running", "streaming", "resuming"]);

const MAX_LINES = 6;

export interface ComposerCallbacks {
  onSubmit: (text: string) => void;
  onStop: () => void;
  onHistoryUp: () => string | null;
  onHistoryDown: () => string | null;
}

export class Composer {
  readonly element: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private submitBtn: HTMLElement;
  private contextBadgeEl: HTMLElement;
  private status: SessionStatus | null = null;
  private callbacks: ComposerCallbacks;

  constructor(callbacks: ComposerCallbacks) {
    this.callbacks = callbacks;

    this.contextBadgeEl = el("div", { cls: "lc-composer-context" });
    this.contextBadgeEl.style.display = "none";

    this.textarea = document.createElement("textarea");
    this.textarea.className = "lc-composer-input";
    this.textarea.placeholder = "Ask Locus anything... (Enter to send)";
    this.textarea.rows = 1;
    this.textarea.setAttribute("aria-label", "Message input");
    this.textarea.addEventListener("input", () => this.autoGrow());
    this.textarea.addEventListener("keydown", (e) => this.handleKeydown(e));

    this.submitBtn = el("button", {
      cls: "lc-composer-submit",
      attrs: {
        "aria-label": "Send message",
        type: "button",
        tabindex: "0",
      },
      html: icons.send,
    });
    this.submitBtn.addEventListener("click", () => this.submit());

    const inputRow = el("div", {
      cls: "lc-composer-row",
      children: [this.textarea, this.submitBtn],
    });

    this.element = el("div", {
      cls: "lc-composer",
      children: [this.contextBadgeEl, inputRow],
    });
  }

  update(status: SessionStatus | null, _sessionId: string | null): void {
    this.status = status;
    const isActive = ACTIVE_STATES.has(status || "");
    const isInterrupted = status === "interrupted";

    this.textarea.disabled = isActive;
    this.element.classList.toggle("lc-composer--disabled", isActive);

    // Update submit button
    this.submitBtn.innerHTML = "";
    if (status === "running" || status === "streaming") {
      this.submitBtn.innerHTML = icons.stop;
      this.submitBtn.setAttribute("aria-label", "Stop session");
      this.submitBtn.classList.add("lc-composer-submit--stop");
    } else if (status === "starting" || status === "resuming") {
      this.submitBtn.innerHTML = icons.spinner;
      this.submitBtn.setAttribute("aria-label", "Starting…");
      this.submitBtn.classList.add("lc-composer-submit--loading");
    } else if (isInterrupted) {
      this.submitBtn.innerHTML = icons.resume;
      this.submitBtn.setAttribute("aria-label", "Resume session");
      this.submitBtn.classList.remove(
        "lc-composer-submit--stop",
        "lc-composer-submit--loading"
      );
    } else {
      this.submitBtn.innerHTML = icons.send;
      this.submitBtn.setAttribute("aria-label", "Send message");
      this.submitBtn.classList.remove(
        "lc-composer-submit--stop",
        "lc-composer-submit--loading"
      );
    }
  }

  focus(): void {
    this.textarea.focus();
  }

  clear(): void {
    this.textarea.value = "";
    this.autoGrow();
  }

  private submit(): void {
    const status = this.status;

    // Stop action
    if (status === "running" || status === "streaming") {
      this.callbacks.onStop();
      return;
    }

    // Submit prompt
    const text = this.textarea.value.trim();
    if (!text) return;
    if (ACTIVE_STATES.has(status || "")) return;

    this.callbacks.onSubmit(text);
    this.textarea.value = "";
    this.autoGrow();
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Enter = submit, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submit();
      return;
    }

    // Escape = clear or blur
    if (e.key === "Escape") {
      if (this.textarea.value) {
        this.textarea.value = "";
        this.autoGrow();
      } else {
        this.textarea.blur();
      }
      return;
    }

    // History navigation (Up/Down when empty)
    if (this.textarea.value === "" && e.key === "ArrowUp") {
      e.preventDefault();
      const prev = this.callbacks.onHistoryUp();
      if (prev !== null) {
        this.textarea.value = prev;
        this.autoGrow();
      }
      return;
    }

    if (this.textarea.value !== "" && e.key === "ArrowDown") {
      const next = this.callbacks.onHistoryDown();
      if (next !== null) {
        e.preventDefault();
        this.textarea.value = next;
        this.autoGrow();
      }
    }
  }

  private autoGrow(): void {
    const ta = this.textarea;
    ta.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight || "20", 10);
    const maxHeight = lineHeight * MAX_LINES;
    const newHeight = Math.min(ta.scrollHeight, maxHeight);
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }
}
