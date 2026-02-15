import type { SessionStatus } from "@locusai/shared";
import { el, formatTimer } from "../utils";

const STATE_LABELS: Record<string, string> = {
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
  starting: "#38bdf8",
  running: "#38bdf8",
  streaming: "#22d3ee",
  completed: "#10b981",
  failed: "#ef4444",
  canceled: "#f59e0b",
  interrupted: "#f97316",
  resuming: "#38bdf8",
};

const TIMER_STATES = new Set(["starting", "running", "streaming", "resuming"]);

export class StatusRail {
  readonly element: HTMLElement;
  private stateLabel: HTMLElement;
  private modelLabel: HTMLElement;
  private timerLabel: HTMLElement;
  private toolCountLabel: HTMLElement;

  private timerInterval: number | null = null;
  private timerStart: number | null = null;

  constructor() {
    this.stateLabel = el("span", { cls: "lc-rail-state" });
    this.modelLabel = el("span", { cls: "lc-rail-meta" });
    this.timerLabel = el("span", { cls: "lc-rail-meta" });
    this.toolCountLabel = el("span", { cls: "lc-rail-meta" });

    this.element = el("div", {
      cls: "lc-status-rail",
      attrs: {
        role: "status",
        "aria-label": "Session status",
        "aria-live": "polite",
      },
      children: [
        this.stateLabel,
        this.modelLabel,
        this.timerLabel,
        this.toolCountLabel,
      ],
    });
  }

  update(
    status: SessionStatus | null,
    model: string | undefined,
    toolCount: number,
    createdAt: number | undefined
  ): void {
    const stateKey = status || "idle";

    // Visibility
    if (stateKey === "idle") {
      this.element.style.display = "none";
      this.stopTimer();
      return;
    }
    this.element.style.display = "";

    // State label
    this.stateLabel.textContent = STATE_LABELS[stateKey] || stateKey;
    this.stateLabel.style.color = STATE_COLORS[stateKey] || "#a1a1aa";

    // Model
    this.modelLabel.textContent = model || "";

    // Tool count
    if (toolCount > 0) {
      this.toolCountLabel.textContent = `${toolCount} tool${toolCount === 1 ? "" : "s"}`;
    } else {
      this.toolCountLabel.textContent = "";
    }

    // Timer
    if (TIMER_STATES.has(stateKey)) {
      if (this.timerInterval === null) {
        this.timerStart = createdAt || Date.now();
        this.updateTimerDisplay();
        this.timerInterval = window.setInterval(
          () => this.updateTimerDisplay(),
          1000
        );
      }
    } else {
      if (this.timerInterval !== null && this.timerStart) {
        // Show final duration
        this.timerLabel.textContent = formatTimer(Date.now() - this.timerStart);
      }
      this.stopTimer();
    }
  }

  private updateTimerDisplay(): void {
    if (this.timerStart) {
      this.timerLabel.textContent = formatTimer(Date.now() - this.timerStart);
    }
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  dispose(): void {
    this.stopTimer();
  }
}
