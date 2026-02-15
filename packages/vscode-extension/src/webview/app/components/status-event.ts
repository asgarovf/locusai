import { icons } from "../icons";
import { el, formatTime } from "../utils";

export function createStatusEvent(
  text: string,
  timestamp?: number
): HTMLElement {
  const icon = el("span", {
    cls: "lc-status-icon",
    html: icons.session,
    attrs: { "aria-hidden": "true" },
  });

  const label = el("span", {
    cls: "lc-status-text",
    text,
  });

  const time = el("span", {
    cls: "lc-status-time",
    text: formatTime(timestamp || Date.now()),
  });

  return el("div", {
    cls: "lc-status-event",
    children: [icon, label, time],
  });
}
