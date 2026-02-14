(() => {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");
  if (root) {
    root.textContent = "Locus AI — Loading…";
  }

  vscode.postMessage({ type: "webview_ready" });
})();

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
