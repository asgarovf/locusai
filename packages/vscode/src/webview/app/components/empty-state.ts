import { icons } from "../icons";
import { el } from "../utils";

export interface EmptyStateCallbacks {
  onSuggestion: (label: string, prompt: string) => void;
}

const SUGGESTIONS = [
  {
    label: "Review my changes",
    prompt:
      "Review my local staged and unstaged changes, identify issues and suggest improvements",
  },
  {
    label: "Explain this codebase",
    prompt:
      "Explain this codebase — architecture, key modules, and how everything fits together",
  },
  {
    label: "Find and fix bugs",
    prompt:
      "Analyze the codebase for potential bugs, issues, and code smells, then fix them",
  },
  {
    label: "Write tests",
    prompt: "Write tests for the most critical untested code in this project",
  },
  {
    label: "Refactor code",
    prompt:
      "Identify code that needs refactoring and improve its structure, readability, and maintainability",
  },
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
  for (const { label, prompt } of SUGGESTIONS) {
    const chip = el("button", {
      cls: "lc-chip",
      attrs: { type: "button", tabindex: "0" },
      text: label,
    });
    chip.addEventListener("click", () => callbacks.onSuggestion(label, prompt));
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
