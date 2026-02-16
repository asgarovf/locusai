import * as vscode from "vscode";
import { AuthManager } from "./auth";
import { registerAllCommands } from "./commands";
import { getCliBinaryPath } from "./config";
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
  // ── Output channel ─────────────────────────────────────────────────
  const outputChannel = vscode.window.createOutputChannel("Locus AI");
  context.subscriptions.push(outputChannel);

  // ── Auth ────────────────────────────────────────────────────────────
  const authManager = new AuthManager(context.secrets);

  // ── Session infrastructure ──────────────────────────────────────────
  const store = new SessionStore(context.globalState, getWorkspaceId());
  const manager = new SessionManager(store);
  manager.reconcile();

  // ── Chat controller ─────────────────────────────────────────────────
  const controller = new ChatController({
    manager,
    getCliBinaryPath,
    getCwd,
    globalState: context.globalState,
    outputChannel,
  });

  // ── Webview provider ────────────────────────────────────────────────
  const chatProvider = new LocusChatViewProvider(
    context.extensionUri,
    controller,
    outputChannel
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LocusChatViewProvider.viewType,
      chatProvider
    )
  );

  // ── Commands ────────────────────────────────────────────────────────
  registerAllCommands(context, controller, manager, authManager);

  // ── Cleanup ─────────────────────────────────────────────────────────
  context.subscriptions.push({
    dispose: () => controller.dispose(),
  });
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
