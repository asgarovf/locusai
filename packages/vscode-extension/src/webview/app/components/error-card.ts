import type { ProtocolError } from "@locusai/shared";
import { icons } from "../icons";
import { el } from "../utils";

export interface ErrorCardCallbacks {
  onRetry: () => void;
  onNewSession: () => void;
}

export function createErrorCard(
  error: ProtocolError,
  callbacks: ErrorCardCallbacks
): HTMLElement {
  const icon = el("span", {
    cls: "lc-error-icon",
    html: icons.alert,
    attrs: { "aria-hidden": "true" },
  });

  const title = el("div", {
    cls: "lc-error-title",
    text: formatErrorTitle(error.code),
  });

  const message = el("div", {
    cls: "lc-error-message",
    text: error.message,
  });

  const codeEl = el("div", {
    cls: "lc-error-code",
    text: error.code,
  });

  const header = el("div", {
    cls: "lc-error-header",
    children: [icon, title],
  });

  const actions = el("div", { cls: "lc-error-actions" });

  if (error.recoverable) {
    const retryBtn = el("button", {
      cls: "lc-btn lc-btn--primary",
      attrs: { type: "button", tabindex: "0" },
      text: "Retry",
    });
    retryBtn.addEventListener("click", () => callbacks.onRetry());
    actions.appendChild(retryBtn);
  }

  const newBtn = el("button", {
    cls: "lc-btn lc-btn--ghost",
    attrs: { type: "button", tabindex: "0" },
    text: "New session",
  });
  newBtn.addEventListener("click", () => callbacks.onNewSession());
  actions.appendChild(newBtn);

  return el("div", {
    cls: "lc-card lc-card--error",
    attrs: { role: "alert", "aria-live": "assertive" },
    children: [header, message, codeEl, actions],
  });
}

function formatErrorTitle(code: string): string {
  switch (code) {
    case "CLI_NOT_FOUND":
      return "CLI Not Found";
    case "AUTH_EXPIRED":
      return "Authentication Expired";
    case "NETWORK_TIMEOUT":
      return "Network Timeout";
    case "CONTEXT_LIMIT":
      return "Context Limit Reached";
    case "PROCESS_CRASHED":
      return "Process Crashed";
    case "SESSION_NOT_FOUND":
      return "Session Not Found";
    case "MALFORMED_EVENT":
      return "Invalid Message";
    default:
      return "Error";
  }
}
