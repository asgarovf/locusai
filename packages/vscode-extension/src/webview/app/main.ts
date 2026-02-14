import {
  PROTOCOL_VERSION,
  type HostEvent,
  HostEventType,
  type UIIntent,
  UIIntentType,
  parseHostEvent,
} from "@locusai/shared";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

// ============================================================================
// Webview Client — Protocol Bridge
// ============================================================================

(() => {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");
  if (root) {
    root.textContent = "Locus AI — Loading…";
  }

  // ── Outbound: Send typed UIIntents to host ────────────────────────

  /**
   * Send a validated UIIntent to the extension host.
   * All outbound messages include the protocol version.
   */
  function sendIntent(
    type: UIIntent["type"],
    payload: Record<string, unknown> = {}
  ): void {
    const message = {
      protocol: PROTOCOL_VERSION,
      type,
      payload,
    };
    vscode.postMessage(message);
  }

  // ── Inbound: Receive HostEvents from host ─────────────────────────

  window.addEventListener("message", (event: MessageEvent) => {
    const result = parseHostEvent(event.data);
    if (!result.success) {
      return;
    }

    const hostEvent = result.data;
    handleHostEvent(hostEvent);
  });

  /**
   * Route validated HostEvents to update the UI state.
   * This is the single entry point for all host→webview communication.
   */
  function handleHostEvent(event: HostEvent): void {
    switch (event.type) {
      case HostEventType.SESSION_STATE:
        updateSessionState(event.payload);
        break;
      case HostEventType.TEXT_DELTA:
        appendTextDelta(event.payload.content);
        break;
      case HostEventType.TOOL_STARTED:
        showToolStarted(event.payload.tool);
        break;
      case HostEventType.TOOL_COMPLETED:
        showToolCompleted(event.payload.tool, event.payload.success);
        break;
      case HostEventType.THINKING:
        showThinking();
        break;
      case HostEventType.ERROR:
        showError(event.payload.error.message);
        break;
      case HostEventType.SESSION_LIST:
        // Session list updates — handled by future UI task.
        break;
      case HostEventType.SESSION_COMPLETED:
        showCompleted();
        break;
    }

    // Persist latest state for webview serialization.
    vscode.setState({ lastEvent: event });
  }

  // ── Minimal UI Rendering ──────────────────────────────────────────
  // These are placeholder renderers for protocol verification.
  // A full React UI replaces these in a later task.

  let outputBuffer = "";

  function updateSessionState(payload: {
    sessionId: string;
    status: string;
  }): void {
    if (!root) return;
    outputBuffer = "";
    root.textContent = `Session: ${payload.status}`;
  }

  function appendTextDelta(content: string): void {
    if (!root) return;
    outputBuffer += content;
    root.textContent = outputBuffer;
  }

  function showToolStarted(tool: string): void {
    if (!root) return;
    root.textContent = `${outputBuffer}\n[Tool: ${tool}...]`;
  }

  function showToolCompleted(tool: string, success: boolean): void {
    if (!root) return;
    const status = success ? "done" : "failed";
    root.textContent = `${outputBuffer}\n[Tool: ${tool} ${status}]`;
  }

  function showThinking(): void {
    if (!root) return;
    root.textContent = `${outputBuffer}\n[Thinking...]`;
  }

  function showError(message: string): void {
    if (!root) return;
    root.textContent = `Error: ${message}`;
  }

  function showCompleted(): void {
    if (!root) return;
    root.textContent = `${outputBuffer}\n[Session completed]`;
  }

  // ── Expose sendIntent for future UI components ────────────────────
  // Attach to window so the React UI (when added) can call it.
  (window as unknown as Record<string, unknown>).__locusIntent = sendIntent;

  // ── Signal readiness ──────────────────────────────────────────────
  sendIntent(UIIntentType.WEBVIEW_READY);
})();
