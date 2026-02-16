import { getToolBorderClass, getToolColorClass, getToolIcon, icons } from "../icons";
import type { ToolState } from "../store";
import { el, formatDuration, truncate } from "../utils";

function getToolSummary(tool: ToolState): string {
  const params = tool.parameters || {};
  switch (tool.tool) {
    case "Read":
      return `Read — ${params.file_path || "file"}`;
    case "Write":
      return `Write — ${params.file_path || "file"}`;
    case "Edit":
      return `Edit — ${params.file_path || "file"}`;
    case "Bash":
      return `Bash — ${truncate(String(params.description || params.command || "command"), 40)}`;
    case "Grep":
      return `Grep — ${params.pattern || ""} in ${params.path || "."}`;
    case "Glob":
      return `Glob — ${params.pattern || ""}`;
    case "WebFetch":
      return `Fetch — ${truncate(String(params.url || "url"), 40)}`;
    default:
      return tool.tool;
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "running":
      return icons.spinner;
    case "completed":
      return icons.check;
    case "failed":
      return icons.x;
    default:
      return icons.spinner;
  }
}

export class ToolCard {
  readonly element: HTMLElement;
  private headerEl: HTMLElement;
  private detailsEl: HTMLElement;
  private statusIconEl: HTMLElement;
  private summaryEl: HTMLElement;
  private durationEl: HTMLElement;
  private expanded = false;

  constructor(tool: ToolState) {
    const colorClass = getToolColorClass(tool.tool);
    const borderClass = getToolBorderClass(tool.tool);
    const icon = getToolIcon(tool.tool);
    const summary = getToolSummary(tool);

    const toolIcon = el("span", {
      cls: ["lc-tool-icon", colorClass],
      html: icon,
    });

    this.summaryEl = el("span", {
      cls: "lc-tool-summary",
      text: summary,
    });

    this.durationEl = el("span", { cls: "lc-tool-duration" });

    this.statusIconEl = el("span", {
      cls: "lc-tool-status-icon",
      html: getStatusIcon(tool.status),
    });

    this.headerEl = el("div", {
      cls: "lc-tool-header",
      children: [toolIcon, this.summaryEl, this.durationEl, this.statusIconEl],
    });

    this.detailsEl = el("div", { cls: "lc-tool-details" });

    this.element = el("div", {
      cls: "lc-card lc-card--tool",
      attrs: {
        role: "button",
        tabindex: "0",
        "aria-expanded": "false",
        "aria-label": `${tool.tool} — ${summary}`,
      },
      children: [this.headerEl, this.detailsEl],
    });

    // Color accent on left border
    this.element.classList.add(borderClass);

    this.element.addEventListener("click", () => this.toggle());
    this.element.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === "Escape" && this.expanded) {
        e.preventDefault();
        this.collapse();
      }
    });

    this.updateState(tool);
  }

  updateState(tool: ToolState): void {
    // Status icon
    this.statusIconEl.innerHTML = getStatusIcon(tool.status);
    this.statusIconEl.classList.toggle(
      "lc-tool-status--failed",
      tool.status === "failed"
    );
    this.statusIconEl.classList.toggle(
      "lc-tool-status--completed",
      tool.status === "completed"
    );

    // Duration
    if (tool.duration !== undefined && tool.status === "completed") {
      this.durationEl.textContent = formatDuration(tool.duration);
    }

    // Summary
    this.summaryEl.textContent = getToolSummary(tool);

    // Details content
    this.detailsEl.innerHTML = "";

    if (tool.parameters && Object.keys(tool.parameters).length > 0) {
      const paramsEl = el("div", { cls: "lc-tool-section" });
      paramsEl.appendChild(
        el("div", { cls: "lc-tool-section-label", text: "PARAMETERS" })
      );
      const pre = el("pre", {
        cls: "lc-tool-code",
        text: JSON.stringify(tool.parameters, null, 2),
      });
      paramsEl.appendChild(pre);
      this.detailsEl.appendChild(paramsEl);
    }

    if (tool.result !== undefined) {
      const resultEl = el("div", { cls: "lc-tool-section" });
      resultEl.appendChild(
        el("div", { cls: "lc-tool-section-label", text: "RESULT" })
      );
      const resultText =
        typeof tool.result === "string"
          ? tool.result
          : JSON.stringify(tool.result, null, 2);
      const pre = el("pre", {
        cls: "lc-tool-code",
        text: truncate(resultText, 2000),
      });
      resultEl.appendChild(pre);
      this.detailsEl.appendChild(resultEl);
    }

    if (tool.error) {
      const errEl = el("div", {
        cls: "lc-tool-error",
        text: tool.error,
      });
      this.detailsEl.appendChild(errEl);
    }
  }

  private toggle(): void {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private expand(): void {
    this.expanded = true;
    this.element.classList.add("lc-card--tool-expanded");
    this.element.setAttribute("aria-expanded", "true");
    this.detailsEl.style.display = "";
  }

  private collapse(): void {
    this.expanded = false;
    this.element.classList.remove("lc-card--tool-expanded");
    this.element.setAttribute("aria-expanded", "false");
    this.detailsEl.style.display = "none";
  }
}
