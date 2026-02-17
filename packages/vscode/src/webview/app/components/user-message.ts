import { el } from "../utils";

export function createUserMessage(
  text: string,
  _timestamp?: number
): HTMLElement {
  const body = el("div", { cls: "lc-msg-body", text });

  return el("div", {
    cls: "lc-card lc-card--user",
    attrs: { role: "article", "aria-label": "Your message" },
    children: [body],
  });
}
