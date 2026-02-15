import { el } from "../utils";

export function createThinkingIndicator(): HTMLElement {
  const dots = el("span", { cls: "lc-thinking-dots" });
  dots.innerHTML = "<span></span><span></span><span></span>";

  const label = el("span", {
    cls: "lc-thinking-label",
    text: "Thinking…",
  });

  return el("div", {
    cls: "lc-thinking",
    attrs: {
      role: "status",
      "aria-label": "Locus is thinking",
      "aria-live": "polite",
    },
    children: [dots, label],
  });
}
