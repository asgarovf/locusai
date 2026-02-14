import * as vscode from "vscode";
import { ChatController } from "./core/chat-controller";
import { SessionManager } from "./sessions/session-manager";
import { SessionStore } from "./sessions/session-store";
import { LocusChatViewProvider } from "./webview";

/**
 * Derive a stable workspace identifier from the first workspace folder.
 * Falls back to "default" for untitled/empty workspaces.
 */
function getWorkspaceId(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.toString();
  }
  return "default";
}

/**
 * Resolve the Locus CLI binary path. Checks the extension setting
 * first, then falls back to looking for `locus` on PATH.
 */
function getCliBinaryPath(): string {
  const configured = vscode.workspace
    .getConfiguration("locusai")
    .get<string>("cliBinaryPath");
  return configured || "locus";
}

/**
 * Get the current working directory for CLI sessions.
 */
function getCwd(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return process.cwd();
}

export function activate(context: vscode.ExtensionContext): void {
  // ── Session infrastructure ──────────────────────────────────────────
  const store = new SessionStore(context.globalState, getWorkspaceId());
  const manager = new SessionManager(store);
  manager.reconcile();

  // ── Chat controller ─────────────────────────────────────────────────
  const controller = new ChatController({
    manager,
    getCliBinaryPath,
    getCwd,
  });

  // ── Webview provider ────────────────────────────────────────────────
  const chatProvider = new LocusChatViewProvider(
    context.extensionUri,
    controller
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LocusChatViewProvider.viewType,
      chatProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("locusai.openChat", () => {
      vscode.commands.executeCommand(`${LocusChatViewProvider.viewType}.focus`);
    })
  );

  // ── Cleanup ─────────────────────────────────────────────────────────
  context.subscriptions.push({
    dispose: () => controller.dispose(),
  });
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
