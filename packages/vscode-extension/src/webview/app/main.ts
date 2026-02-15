import {
  PROTOCOL_VERSION,
  type HostEvent,
  UIIntentType,
  parseHostEvent,
} from "@locusai/shared";
import { ChatStore } from "./store";
import { Renderer } from "./renderer";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

// ============================================================================
// Webview Client — Production UI
// ============================================================================

(() => {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");
  if (!root) return;

  // ── State Store ────────────────────────────────────────────────────

  const store = new ChatStore();

  // ── Renderer ───────────────────────────────────────────────────────

  const _renderer = new Renderer(root, store, vscode);

  // ── Outbound: Send typed UIIntents to host ────────────────────────

  function sendIntent(
    type: string,
    payload: Record<string, unknown> = {}
  ): void {
    vscode.postMessage({
      protocol: PROTOCOL_VERSION,
      type,
      payload,
    });
  }

  // ── Inbound: Receive HostEvents from host ─────────────────────────

  window.addEventListener("message", (event: MessageEvent) => {
    const result = parseHostEvent(event.data);
    if (!result.success) return;

    const hostEvent: HostEvent = result.data;

    // Dispatch to store — triggers reactive render
    store.dispatch(hostEvent);

    // Persist latest state for webview serialization
    vscode.setState({ lastEvent: hostEvent });
  });

  // ── Expose sendIntent for extensibility ────────────────────────────

  (window as unknown as Record<string, unknown>).__locusIntent = sendIntent;

  // ── Signal readiness ──────────────────────────────────────────────

  sendIntent(UIIntentType.WEBVIEW_READY);
})();
