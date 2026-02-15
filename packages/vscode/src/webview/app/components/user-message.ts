import { icons } from "../icons";
import { el, formatTime } from "../utils";

export function createUserMessage(
  text: string,
  timestamp?: number
): HTMLElement {
  const avatar = el("div", {
    cls: "lc-avatar lc-avatar--user",
    html: icons.user,
    attrs: { "aria-hidden": "true" },
  });

  const body = el("div", { cls: "lc-msg-body", text });

  const time = el("span", {
    cls: "lc-timestamp",
    text: formatTime(timestamp || Date.now()),
  });

  const content = el("div", {
    cls: "lc-msg-content",
    children: [body, time],
  });

  return el("div", {
    cls: "lc-card lc-card--user",
    attrs: { role: "article", "aria-label": "Your message" },
    children: [avatar, content],
  });
}
