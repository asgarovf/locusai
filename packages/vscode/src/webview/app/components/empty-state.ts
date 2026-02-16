import { icons } from "../icons";
import { el } from "../utils";

export interface EmptyStateCallbacks {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "Explain this codebase",
  "Find and fix bugs",
  "Write tests for this file",
];

export function createEmptyState(callbacks: EmptyStateCallbacks): HTMLElement {
  const logo = el("div", {
    cls: "lc-empty-logo",
    html: icons.locus,
    attrs: { "aria-hidden": "true" },
  });

  const headline = el("h2", {
    cls: "lc-empty-headline",
    text: "Start a conversation",
  });

  const body = el("p", {
    cls: "lc-empty-body",
    text: "Ask Locus to explain, write, or refactor code in your workspace.",
  });

  const chips = el("div", { cls: "lc-empty-chips" });
  for (const suggestion of SUGGESTIONS) {
    const chip = el("button", {
      cls: "lc-chip",
      attrs: { type: "button", tabindex: "0" },
      text: suggestion,
    });
    chip.addEventListener("click", () => callbacks.onSuggestion(suggestion));
    chips.appendChild(chip);
  }

  const hint = el("p", {
    cls: "lc-empty-hint",
    text: "Press Ctrl+Shift+L to open from anywhere",
  });

  return el("div", {
    cls: "lc-empty-state",
    children: [logo, headline, body, chips, hint],
  });
}
