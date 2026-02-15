import type { SessionStatus, SessionSummary } from "@locusai/shared";
import { icons } from "../icons";
import { el, truncate } from "../utils";

const STATE_LABELS: Record<string, string | null> = {
  idle: null,
  starting: "Starting…",
  running: "Running",
  streaming: "Streaming",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
  resuming: "Resuming…",
};

const STATE_COLORS: Record<string, string> = {
  idle: "#a1a1aa",
  starting: "#38bdf8",
  running: "#38bdf8",
  streaming: "#22d3ee",
  completed: "#10b981",
  failed: "#ef4444",
  canceled: "#f59e0b",
  interrupted: "#f97316",
  resuming: "#38bdf8",
};

const PULSING_STATES = new Set(["starting", "running", "resuming"]);

export interface SessionHeaderCallbacks {
  onStop: (sessionId: string) => void;
  onNewSession: () => void;
  onResume: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRequestSessions: () => void;
}

export class SessionHeader {
  readonly element: HTMLElement;
  private titleEl: HTMLElement;
  private badgeEl: HTMLElement;
  private controlsEl: HTMLElement;
  private pickerBtn: HTMLElement;
  private dropdownEl: HTMLElement;
  private dropdownOpen = false;

  private sessionId: string | null = null;
  private callbacks: SessionHeaderCallbacks;

  constructor(callbacks: SessionHeaderCallbacks) {
    this.callbacks = callbacks;

    this.titleEl = el("div", { cls: "lc-header-title" });
    this.badgeEl = el("span", { cls: "lc-header-badge" });
    this.controlsEl = el("div", { cls: "lc-header-controls" });

    this.pickerBtn = el("button", {
      cls: "lc-header-picker-btn",
      attrs: {
        "aria-label": "Switch session",
        type: "button",
        tabindex: "0",
      },
      html: icons.chevronDown,
    });
    this.pickerBtn.addEventListener("click", () => {
      this.toggleDropdown();
    });

    this.dropdownEl = el("div", {
      cls: "lc-header-dropdown",
      attrs: { role: "listbox", "aria-label": "Switch session" },
    });

    const titleRow = el("div", {
      cls: "lc-header-title-row",
      children: [this.titleEl, this.badgeEl, this.pickerBtn],
    });

    this.element = el("header", {
      cls: "lc-header",
      attrs: { role: "banner" },
      children: [titleRow, this.controlsEl, this.dropdownEl],
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (this.dropdownOpen && !this.element.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  update(
    sessionId: string | null,
    status: SessionStatus | null,
    model: string | undefined
  ): void {
    this.sessionId = sessionId;

    // Title
    if (sessionId) {
      const modelLabel = model || "Locus AI";
      const shortId = sessionId.slice(0, 7);
      this.titleEl.textContent = `${modelLabel} · ${shortId}`;
    } else {
      this.titleEl.textContent = "Locus AI";
    }

    // Badge
    const stateKey = status || "idle";
    const label = STATE_LABELS[stateKey];
    if (label) {
      this.badgeEl.textContent = label;
      this.badgeEl.style.color = STATE_COLORS[stateKey] || "#a1a1aa";
      this.badgeEl.style.display = "";
      this.badgeEl.classList.toggle(
        "lc-badge-pulsing",
        PULSING_STATES.has(stateKey)
      );
    } else {
      this.badgeEl.style.display = "none";
      this.badgeEl.classList.remove("lc-badge-pulsing");
    }

    // Controls
    this.controlsEl.innerHTML = "";

    if (status === "running" || status === "streaming") {
      const stopBtn = el("button", {
        cls: "lc-header-btn",
        attrs: {
          "aria-label": "Stop session",
          type: "button",
          tabindex: "0",
        },
        html: icons.stop,
      });
      stopBtn.addEventListener("click", () => {
        if (this.sessionId) this.callbacks.onStop(this.sessionId);
      });
      this.controlsEl.appendChild(stopBtn);
    } else if (status === "interrupted" && sessionId) {
      const resumeBtn = el("button", {
        cls: ["lc-header-btn", "lc-header-btn--accent"],
        attrs: {
          "aria-label": "Resume session",
          type: "button",
          tabindex: "0",
        },
        html: icons.resume,
      });
      resumeBtn.addEventListener("click", () => {
        if (this.sessionId) this.callbacks.onResume(this.sessionId);
      });
      this.controlsEl.appendChild(resumeBtn);
    } else if (
      status === "completed" ||
      status === "failed" ||
      status === "canceled"
    ) {
      const newBtn = el("button", {
        cls: ["lc-header-btn", "lc-header-btn--accent"],
        attrs: {
          "aria-label": "New session",
          type: "button",
          tabindex: "0",
        },
        html: icons.plus,
      });
      newBtn.addEventListener("click", () => {
        this.callbacks.onNewSession();
      });
      this.controlsEl.appendChild(newBtn);
    }
  }

  updateSessions(sessions: SessionSummary[]): void {
    this.dropdownEl.innerHTML = "";
    if (sessions.length === 0) {
      this.dropdownEl.appendChild(
        el("div", {
          cls: "lc-dropdown-empty",
          text: "No sessions",
        })
      );
      return;
    }

    for (const session of sessions.slice(0, 10)) {
      const item = el("div", {
        cls: "lc-dropdown-item",
        attrs: {
          role: "option",
          tabindex: "0",
          "aria-selected":
            session.sessionId === this.sessionId ? "true" : "false",
        },
      });

      const title = truncate(
        session.title || session.sessionId.slice(0, 7),
        30
      );
      const statusColor = STATE_COLORS[session.status] || "#a1a1aa";

      item.innerHTML = `
        <span class="lc-dropdown-dot" style="background:${statusColor}"></span>
        <span class="lc-dropdown-title">${title}</span>
        <span class="lc-dropdown-status">${session.status}</span>
      `;

      if (session.sessionId === this.sessionId) {
        item.classList.add("lc-dropdown-item--active");
      }

      item.addEventListener("click", () => {
        this.callbacks.onSelectSession(session.sessionId);
        this.closeDropdown();
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.callbacks.onSelectSession(session.sessionId);
          this.closeDropdown();
        }
      });

      this.dropdownEl.appendChild(item);
    }
  }

  private toggleDropdown(): void {
    if (this.dropdownOpen) {
      this.closeDropdown();
    } else {
      this.callbacks.onRequestSessions();
      this.dropdownEl.classList.add("lc-dropdown-open");
      this.dropdownOpen = true;
    }
  }

  private closeDropdown(): void {
    this.dropdownEl.classList.remove("lc-dropdown-open");
    this.dropdownOpen = false;
  }
}
