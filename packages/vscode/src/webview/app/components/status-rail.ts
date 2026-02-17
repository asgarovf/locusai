import type { SessionStatus } from "@locusai/shared";
import { el } from "../utils";

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

const STATE_CSS_CLASSES: Record<string, string> = {
  starting: "lc-state-starting",
  running: "lc-state-running",
  streaming: "lc-state-streaming",
  completed: "lc-state-completed",
  failed: "lc-state-failed",
  canceled: "lc-state-canceled",
  interrupted: "lc-state-interrupted",
  resuming: "lc-state-resuming",
};

const ALL_STATE_CLASSES = Object.values(STATE_CSS_CLASSES);

export class StatusRail {
  readonly element: HTMLElement;
  private stateLabel: HTMLElement;
  private toolCountLabel: HTMLElement;

  constructor() {
    this.stateLabel = el("span", { cls: "lc-rail-state" });
    this.toolCountLabel = el("span", { cls: "lc-rail-meta" });

    this.element = el("div", {
      cls: "lc-status-rail",
      attrs: {
        role: "status",
        "aria-label": "Session status",
        "aria-live": "polite",
      },
      children: [this.stateLabel, this.toolCountLabel],
    });
  }

  update(
    status: SessionStatus | null,
    _model: string | undefined,
    toolCount: number,
    _createdAt: number | undefined
  ): void {
    const stateKey = status || "idle";

    // Visibility — hide when idle or in a terminal state
    // (terminal states are already shown in the header and timeline)
    const TERMINAL = new Set(["completed", "canceled", "failed", "interrupted"]);
    if (stateKey === "idle" || TERMINAL.has(stateKey)) {
      this.element.style.display = "none";
      return;
    }
    this.element.style.display = "";

    // State label
    this.stateLabel.textContent = STATE_LABELS[stateKey] || stateKey;
    this.stateLabel.classList.remove(...ALL_STATE_CLASSES);
    this.stateLabel.classList.add(
      STATE_CSS_CLASSES[stateKey] || "lc-state-idle"
    );

    // Tool count
    if (toolCount > 0) {
      this.toolCountLabel.textContent = `${toolCount} tool${toolCount === 1 ? "" : "s"}`;
    } else {
      this.toolCountLabel.textContent = "";
    }
  }

  dispose(): void {
    // No-op — timer removed
  }
}
